export interface ModuleDeadline {
  _id: string;
  title: string;
  date: string;
  type: 'exam' | 'coursework' | 'presentation' | 'lab' | 'other';
  weight: number | null;
  format: string | null;
  completed: boolean;
}

export type TopicConfidence = 'not-started' | 'in-progress' | 'confident';

export interface Module {
  _id: string;
  userId: string;
  name: string;
  fullName: string;
  colour: string;
  language: string;
  topics: string[];
  topicProgress: Record<string, TopicConfidence>;
  weeklyTargetHours: number;
  deadlines: ModuleDeadline[];
  notes: string | null;
  createdAt: string;
}
