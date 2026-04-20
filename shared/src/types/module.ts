export interface ModuleDeadline {
  _id: string;
  title: string;
  date: string;
  type: 'exam' | 'coursework' | 'presentation' | 'lab' | 'other';
  weight: number | null;
  format: string | null;
  completed: boolean;
}

export interface Module {
  _id: string;
  userId: string;
  name: string;
  fullName: string;
  colour: string;
  language: string;
  topics: string[];
  weeklyTargetHours: number;
  deadlines: ModuleDeadline[];
  notes: string | null;
  createdAt: string;
}
