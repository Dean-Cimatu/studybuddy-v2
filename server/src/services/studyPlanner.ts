import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { UserModel } from '../models/User';
import { ModuleModel } from '../models/Module';
import { StudyPlanModel } from '../models/StudyPlan';
import { getEvents, createEvent } from './googleCalendar';
import type { StudyPlan, StudyPlanSession } from '@studybuddy/shared';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export function getWeekStartDate(from = new Date()): string {
  const dow = from.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(from);
  monday.setDate(from.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

const rawSessionSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startHour: z.number().int().min(0).max(23),
  durationMinutes: z.number().int().positive(),
  moduleName: z.string().min(1),
  topic: z.string().min(1),
});

async function callClaude(prompt: string): Promise<z.infer<typeof rawSessionSchema>[]> {
  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');

  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\[[\s\S]*\])/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
  const raw: unknown = JSON.parse(jsonStr);
  if (!Array.isArray(raw)) throw new Error('Expected JSON array');
  return raw.map(item => rawSessionSchema.parse(item));
}

export async function generateWeeklyPlan(userId: string, pushToGoogleCalendar = false): Promise<StudyPlan> {
  const [user, modules] = await Promise.all([
    UserModel.findById(userId),
    ModuleModel.find({ userId }),
  ]);

  if (!user) throw new Error('User not found');

  const weekStartDate = getWeekStartDate();
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  // Fetch Google Calendar events for context if connected
  let busyTimes = 'none provided';
  if (user.googleCalendarConnected && user.googleTokens?.accessToken) {
    try {
      const events = await getEvents(
        userId,
        `${weekStartDate}T00:00:00Z`,
        `${weekEndDate.toISOString().slice(0, 10)}T23:59:59Z`
      );
      if (events.length > 0) {
        busyTimes = events
          .filter(e => !e.allDay)
          .map(e => {
            const start = new Date(e.start);
            const dow = ((start.getDay() + 6) % 7);
            const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
            return `${days[dow]} ${start.getUTCHours()}:00-${new Date(e.end).getUTCHours()}:00 (${e.title})`;
          })
          .join(', ');
      }
    } catch {
      // Proceed without calendar data
    }
  }

  const moduleList = modules.map(m => {
    const upcomingDeadlines = m.deadlines
      .filter(d => new Date(d.date) > new Date())
      .map(d => `${d.title} (${new Date(d.date).toISOString().slice(0, 10)})`)
      .join(', ');
    return `- ${m.name} (${m.fullName}): topics: [${m.topics.join(', ') || 'general'}]${upcomingDeadlines ? `, deadlines: ${upcomingDeadlines}` : ''}${m.language !== 'en' ? `, language: ${m.language}` : ''}`;
  }).join('\n');

  const studyTime = user.preferredStudyTime ?? 'no-preference';
  const timeWindow = studyTime === 'morning'
    ? 'between 8am and 12pm (hours 8–11)'
    : studyTime === 'afternoon'
    ? 'between 12pm and 6pm (hours 12–17)'
    : studyTime === 'evening'
    ? 'between 6pm and 10pm (hours 18–21)'
    : 'spread across the day (any hour 8–21), varying times so not all sessions are at the same time';

  const sessionMins = user.preferredSessionLength ?? 50;
  const goalHours = user.studyGoalHours ?? 15;
  const sessionsNeeded = Math.ceil((goalHours * 60) / sessionMins);
  const maxPerDay = Math.min(3, Math.ceil(sessionsNeeded / 5));

  const prompt = `You are a smart study planner. Generate a realistic, human-feeling weekly study schedule.

MODULES:
${moduleList || '- No modules specified, generate general study sessions'}

CONSTRAINTS:
- Week: Mon (dayOfWeek=0) to Sun (dayOfWeek=6)
- Goal: ~${goalHours} hours total (approx ${sessionsNeeded} sessions of ${sessionMins} min each)
- Session duration: ${sessionMins} minutes each
- Preferred study time: ${timeWindow}
- Max sessions per day: ${maxPerDay} (do NOT schedule 3 consecutive sessions every single day — spread them realistically)
- Busy/occupied times: ${busyTimes} — do NOT schedule over these
- Leave at least 1 rest day (typically Saturday or Sunday with fewer/no sessions)
- Vary start times slightly day to day (e.g. 9am one day, 10am the next) — avoid identical schedules every day
- Prioritise modules with the nearest upcoming deadlines
- Use specific topics from the module topic lists for each session — no generic sessions
- If a module has a language set, write the topic in that language
- Hours must be integers between 8 and 21

Return ONLY a valid JSON array, no markdown fences, no explanation:
[{ "dayOfWeek": number, "startHour": number, "durationMinutes": number, "moduleName": string, "topic": string }, ...]`;

  let rawSessions: z.infer<typeof rawSessionSchema>[];
  try {
    rawSessions = await callClaude(prompt);
  } catch {
    rawSessions = await callClaude(prompt);
  }

  const moduleMap = new Map(modules.map(m => [m.name, m]));

  const sessions: StudyPlanSession[] = rawSessions.map(s => {
    const mod = moduleMap.get(s.moduleName);
    return {
      dayOfWeek: s.dayOfWeek,
      startHour: s.startHour,
      durationMinutes: s.durationMinutes,
      moduleId: mod ? (mod._id as { toString(): string }).toString() : null,
      moduleName: s.moduleName,
      moduleColour: mod?.colour ?? '#6B7280',
      topic: s.topic,
      googleEventId: null,
    };
  });

  const totalPlannedMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  const plan = await StudyPlanModel.findOneAndUpdate(
    { userId, weekStartDate },
    { $set: { sessions, totalPlannedMinutes, generatedAt: new Date().toISOString() } },
    { upsert: true, new: true }
  );

  if (pushToGoogleCalendar && user.googleCalendarConnected) {
    const weekStart = new Date(`${weekStartDate}T00:00:00Z`);
    for (let i = 0; i < plan.sessions.length; i++) {
      const s = plan.sessions[i];
      try {
        const sessionDate = new Date(weekStart);
        sessionDate.setUTCDate(sessionDate.getUTCDate() + s.dayOfWeek);
        const dateStr = sessionDate.toISOString().slice(0, 10);
        const startISO = `${dateStr}T${String(s.startHour).padStart(2, '0')}:00:00Z`;
        const endISO = new Date(new Date(startISO).getTime() + s.durationMinutes * 60000).toISOString();
        const eventId = await createEvent(userId, {
          title: `Study: ${s.moduleName} — ${s.topic}`,
          start: startISO,
          end: endISO,
        });
        plan.sessions[i] = { ...plan.sessions[i], googleEventId: eventId };
      } catch {
        // Skip if GCal event creation fails for this session
      }
    }
    await plan.save();
  }

  return plan.toJSON() as unknown as StudyPlan;
}
