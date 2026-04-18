// ── User ─────────────────────────────────────────────────────────────────────

export type { User } from './types/user';
import type { User } from './types/user';
export type UserProfile = Omit<User, 'createdAt'>;

// ── Task ──────────────────────────────────────────────────────────────────────

export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;
  tags: string[];
  aiGenerated: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
  tags?: string[];
  aiGenerated?: boolean;
}

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

// ── Study Session ─────────────────────────────────────────────────────────────

export type SessionType = 'pomodoro' | 'free';

export interface StudySession {
  id: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  type: SessionType;
  tasksCompleted: number;
  notes: string;
}

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
