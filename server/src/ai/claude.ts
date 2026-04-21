import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// Client is created on first call so dotenv has already populated the env by then
let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

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

const UNIFIED_SYSTEM = `You are StudyBuddy AI, a study productivity assistant. Detect intent from the conversation.

TASK GENERATION — user wants to plan work, create a study schedule, or describes an assignment/exam/deadline:
→ Respond with ONLY a JSON array inside \`\`\`json\`\`\` fences. No other text.
  Each task: title (string, required), description? (string), priority ("low"|"med"|"high"), estimatedMinutes? (number)
  Aim for 3–6 specific, actionable tasks.

GENERAL CHAT — any other question, conversation, or request:
→ Respond helpfully and concisely in plain text. No JSON.

Choose exactly one mode. Never mix JSON with prose.`;

// ── Exported functions ────────────────────────────────────────────────────────

export async function generateTasksFromDescription(
  userInput: string,
  _userId: string
): Promise<GeneratedTask[]> {
  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
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
  | { mode: 'chat'; reply: string };

export async function unifiedChat(
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<UnifiedResponse> {
  const message = await getClient().messages.create({
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

  return { mode: 'chat', reply: raw.trim() };
}

// ── Task breakdown ────────────────────────────────────────────────────────────

const breakdownItemSchema = z.object({
  title: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  weekNumber: z.number().int().positive(),
});

export type BreakdownItem = z.infer<typeof breakdownItemSchema>;

const BREAKDOWN_SYSTEM = `You are a study task planner. Break down this study goal into specific, actionable subtasks. Each subtask should be completable in 1-2 hours. If topics are provided, only use those topics — do not invent topics the student hasn't listed. If a deadline is provided, distribute tasks across the available weeks. If a module language is specified, generate task titles in that language.
Return ONLY a valid JSON array of objects: { title: string, estimatedMinutes: number, weekNumber: number } where weekNumber starts at 1 for the current week.`;

async function callBreakdown(userMessage: string): Promise<BreakdownItem[]> {
  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: BREAKDOWN_SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');

  const raw: unknown = JSON.parse(text.trim());
  if (!Array.isArray(raw)) throw new Error('Expected a JSON array');
  return raw.map(item => breakdownItemSchema.parse(item));
}

export async function breakdownGoal(opts: {
  title: string;
  topics?: string[];
  deadline?: string;
  language?: string;
}): Promise<BreakdownItem[]> {
  const userMessage = `Goal: ${opts.title.slice(0, 500)}. Topics: ${opts.topics?.length ? opts.topics.join(', ') : 'not specified'}. Deadline: ${opts.deadline ?? 'not specified'}. Language: ${opts.language ?? 'en'}.`;

  try {
    return await callBreakdown(userMessage);
  } catch {
    return await callBreakdown(userMessage);
  }
}

