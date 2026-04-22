// ── User ─────────────────────────────────────────────────────────────────────

export type { User } from './types/user';
import type { User } from './types/user';
export type UserProfile = Omit<User, 'createdAt'>;

// ── Task ──────────────────────────────────────────────────────────────────────

export type { Task, Priority, TaskStatus } from './types/task';

// ── Flashcard ─────────────────────────────────────────────────────────────────

export interface FlashcardDeck {
  _id: string;
  name: string;
  description: string;
  moduleId: string | null;
  cardCount: number;
  dueCount: number;
  createdAt: string;
}

export interface FlashcardCard {
  _id: string;
  deckId: string;
  userId: string;
  front: string;
  back: string;
  due: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  createdAt: string;
}

// ── Module ────────────────────────────────────────────────────────────────────

export type { Module, ModuleDeadline, TopicConfidence } from './types/module';

// ── Study Session & Stats ─────────────────────────────────────────────────────

export type { StudySession, DashboardStats, StudyHistoryDay } from './types/stats';

// ── Planner ───────────────────────────────────────────────────────────────────

export type { StudyPlan, StudyPlanSession } from './types/planner';

// ── Groups ────────────────────────────────────────────────────────────────────

export type { StudyGroup, GroupMember, GroupChallenge } from './types/group';

// ── Achievements ──────────────────────────────────────────────────────────────

export type { Achievement } from './types/achievement';
export { ACHIEVEMENTS } from './types/achievement';

// ── AI / Chat ─────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant';

export interface AIMessage {
  role: MessageRole;
  content: string;
}

export interface ChatRequest {
  messages: AIMessage[];
  system?: string;
  max_tokens?: number;
}

export interface ChatResponse {
  text: string;
}

// ── API responses ─────────────────────────────────────────────────────────────

export interface AuthResponse {
  user: User;
}

export interface ApiError {
  error: string;
}

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
}
