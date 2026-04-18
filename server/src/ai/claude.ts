import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Schemas ───────────────────────────────────────────────────────────────────

const generatedTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'med', 'high']).default('med'),
  status: z.enum(['todo', 'doing', 'done']).default('todo'),
  estimatedMinutes: z.number().int().positive().optional(),
  dueDate: z.string().optional(),
});

export type GeneratedTask = z.infer<typeof generatedTaskSchema>;

// ── System prompts ────────────────────────────────────────────────────────────

const TASK_GEN_SYSTEM = `You are a study planning assistant. The user describes what they need to study or accomplish.
Break it into specific, actionable tasks a student can complete in one sitting.
Respond with ONLY a JSON array inside \`\`\`json\`\`\` fences — no other text.
Each object: title (string, required), description? (string), priority ("low"|"med"|"high"), estimatedMinutes? (number).
Aim for 3–6 tasks. Keep titles concise.
Example:
\`\`\`json
[{"title":"Read Chapter 3","description":"Sections 3.1–3.4","priority":"high","estimatedMinutes":45}]
\`\`\``;

const WELLBEING_SYSTEM = `You are a warm, supportive wellbeing assistant for students.
Respond in 2–3 sentences — empathetic, practical, never preachy.
At the very end append exactly one resource tag: [RESOURCE:category]
Categories: stress, focus, sleep, motivation, burnout, general
Example reply: "Feeling stretched thin is completely normal around exam time. Try a short walk or the 4-7-8 breathing technique to reset. You're doing better than you think. [RESOURCE:stress]"`;

const UNIFIED_SYSTEM = `You are StudyBuddy AI for Middlesex University students. Detect intent from the conversation.

TASK GENERATION — user wants to plan work, create a study schedule, or describes an assignment/exam/deadline:
→ Respond with ONLY a JSON array inside \`\`\`json\`\`\` fences. No other text.
  Each task: title (string, required), description? (string), priority ("low"|"med"|"high"), estimatedMinutes? (number)
  Aim for 3–6 specific, actionable tasks.

WELLBEING — user expresses feelings, stress, anxiety, overwhelm, loneliness, or needs emotional support:
→ Respond warmly in 2–3 sentences (empathetic, practical, never preachy).
  At the very end append exactly: [RESOURCE:category]
  Categories: stress, focus, sleep, motivation, burnout, general

Choose exactly one mode. Never mix JSON with prose.`;

// ── Exported functions ────────────────────────────────────────────────────────

export async function generateTasksFromDescription(
  userInput: string,
  _userId: string
): Promise<GeneratedTask[]> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: TASK_GEN_SYSTEM,
    messages: [{ role: 'user', content: userInput }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');

  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (!match?.[1]) throw new Error('Claude did not return a valid JSON block');

  const raw: unknown = JSON.parse(match[1]);
  if (!Array.isArray(raw)) throw new Error('Expected a JSON array from Claude');

  return raw.map(item => generatedTaskSchema.parse(item));
}

export type UnifiedResponse =
  | { mode: 'tasks'; tasks: GeneratedTask[] }
  | { mode: 'wellbeing'; reply: string; resourceCategory?: string };

export async function unifiedChat(
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<UnifiedResponse> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: UNIFIED_SYSTEM,
    messages,
  });

  const raw = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');

  const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch?.[1]) {
    const parsed: unknown = JSON.parse(jsonMatch[1]);
    if (!Array.isArray(parsed)) throw new Error('Expected a JSON array from Claude');
    return { mode: 'tasks', tasks: parsed.map(item => generatedTaskSchema.parse(item)) };
  }

  const resourceMatch = raw.match(/\[RESOURCE:(\w+)\]/);
  const resourceCategory = resourceMatch?.[1];
  const reply = raw.replace(/\s*\[RESOURCE:\w+\]\s*$/, '').trim();
  return { mode: 'wellbeing', reply, resourceCategory };
}

export async function chatWellbeing(
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<{ reply: string; resourceCategory?: string }> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: WELLBEING_SYSTEM,
    messages,
  });

  const raw = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');

  const resourceMatch = raw.match(/\[RESOURCE:(\w+)\]/);
  const resourceCategory = resourceMatch?.[1];
  const reply = raw.replace(/\s*\[RESOURCE:\w+\]\s*$/, '').trim();

  return { reply, resourceCategory };
}
