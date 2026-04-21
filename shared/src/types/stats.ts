export interface StudySession {
  _id: string;
  userId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  type: 'pomodoro' | 'free';
  moduleTag: string | null;
  moduleName: string | null;
  notes: string | null;
  createdAt: string;
}

export interface DashboardStats {
  studyMinutesToday: number;
  studyMinutesThisWeek: number;
  studyMinutesLastWeek: number;
  totalStudyMinutes: number;
  tasksCompletedToday: number;
  tasksCompletedThisWeek: number;
  currentStreak: number;
  longestStreak: number;
  weeklyGoalHours: number;
  weeklyGoalProgress: number;
  studyScoreThisWeek: number;
  longestSessionMinutes: number;
  avgSessionMinutes: number;
  mostStudiedModule: string | null;
  sessionsThisWeek: number;
}

export interface StudyHistoryDay {
  date: string;
  minutes: number;
}
