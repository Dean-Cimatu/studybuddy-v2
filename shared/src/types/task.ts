export type Priority = 'low' | 'med' | 'high';
export type TaskStatus = 'todo' | 'doing' | 'done';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: string;
  estimatedMinutes: number | null;
  priority: Priority;
  status: TaskStatus;
  parentId: string | null;
  isGoal: boolean;
  moduleId: string | null;
  moduleTag: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  subtaskCount?: number;
  completedSubtaskCount?: number;
}
