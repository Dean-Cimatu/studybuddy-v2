export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-session', title: 'First Session', desc: 'Complete your first study session', icon: '🎯' },
  { id: 'streak-7', title: 'Week Warrior', desc: '7-day study streak', icon: '🔥' },
  { id: 'streak-14', title: 'Fortnight Focus', desc: '14-day study streak', icon: '⚡' },
  { id: 'streak-30', title: 'Monthly Machine', desc: '30-day study streak', icon: '💪' },
  { id: 'hours-10', title: 'Getting Started', desc: '10 total hours studied', icon: '📖' },
  { id: 'hours-50', title: 'Committed', desc: '50 total hours studied', icon: '📚' },
  { id: 'hours-100', title: 'Century Club', desc: '100 total hours studied', icon: '🏆' },
  { id: 'tasks-50', title: 'Task Master', desc: '50 tasks completed', icon: '✅' },
  { id: 'goal-complete', title: 'Goal Crusher', desc: 'Complete all subtasks in a goal', icon: '🎯' },
  { id: 'first-plan', title: 'Planner', desc: 'Generate your first study plan', icon: '📋' },
  { id: 'social-join', title: 'Study Buddy', desc: 'Join a study group', icon: '👥' },
];
