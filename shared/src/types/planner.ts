export interface StudyPlanSession {
  dayOfWeek: number;
  startHour: number;
  durationMinutes: number;
  moduleId: string | null;
  moduleName: string;
  moduleColour: string;
  topic: string;
  googleEventId: string | null;
}

export interface StudyPlan {
  _id: string;
  userId: string;
  weekStartDate: string;
  sessions: StudyPlanSession[];
  totalPlannedMinutes: number;
  generatedAt: string;
}
