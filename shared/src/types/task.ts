export type Priority = 'low' | 'med' | 'high';
export type TaskStatus = 'todo' | 'doing' | 'done';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: string;
  estimatedMinutes?: number;
  priority: Priority;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}
