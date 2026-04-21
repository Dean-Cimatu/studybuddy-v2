export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  studyGoalHours?: number;
  discipline?: string;
  university?: string;
  yearOfStudy?: string;
  bio?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  studyLanguage?: string;
  preferredSessionLength?: number;
  preferredStudyTime?: 'morning' | 'afternoon' | 'evening' | 'no-preference';
  streak?: number;
  longestStreak?: number;
  lastActiveDate?: string | null;
  totalStudyMinutes?: number;
  achievements?: string[];
  streakMilestonesAwarded?: number[];
  themeAccent?: 'blue' | 'green' | 'purple' | 'amber';
  googleCalendarConnected?: boolean;
}
