// ── User ─────────────────────────────────────────────────────────────────────

export type { User } from './types/user';
import type { User } from './types/user';
export type UserProfile = Omit<User, 'createdAt'>;

// ── Task ──────────────────────────────────────────────────────────────────────

export type { Task, Priority, TaskStatus } from './types/task';

// ── Flashcard ─────────────────────────────────────────────────────────────────

export interface Flashcard {
  id: string;
  userId: string;
  deckName: string;
  question: string;
  answer: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  lastReviewed: string | null;
  nextReview: string | null;
  correctCount: number;
  incorrectCount: number;
  aiGenerated: boolean;
  createdAt: string;
}

// ── Module ────────────────────────────────────────────────────────────────────

export type { Module, ModuleDeadline } from './types/module';

// ── Study Session & Stats ─────────────────────────────────────────────────────

export type { StudySession, DashboardStats, StudyHistoryDay } from './types/stats';

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
