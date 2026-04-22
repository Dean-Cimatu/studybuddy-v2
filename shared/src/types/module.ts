export interface ModuleResource {
  _id: string;
  type: 'youtube' | 'url' | 'pdf' | 'book' | 'note';
  title: string;
  url: string;
  addedAt: string;
}

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
  university: string;
  topics: string[];
  topicProgress: Record<string, TopicConfidence>;
  weeklyTargetHours: number;
  deadlines: ModuleDeadline[];
  notes: string | null;
  resources: ModuleResource[];
  archived: boolean;
  shareWithCommunity: boolean;
  createdAt: string;
}

export interface CommunityModuleData {
  contributorCount: number;
  resources: ModuleResource[];
  topics: string[];
  fullName: string;
}
