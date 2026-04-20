import { UserModel } from '../models/User';

export function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getYesterdayUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function getWeekStartUTC(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  return monday;
}

export async function updateStreak(userId: string): Promise<{ streak: number; longestStreak: number }> {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');

  const today = getTodayUTC();
  const yesterday = getYesterdayUTC();

  if (user.lastActiveDate === today) {
    return { streak: user.streak ?? 0, longestStreak: user.longestStreak ?? 0 };
  }

  let newStreak: number;
  if (user.lastActiveDate === yesterday) {
    newStreak = (user.streak ?? 0) + 1;
  } else {
    newStreak = 1;
  }

  const newLongest = Math.max(newStreak, user.longestStreak ?? 0);
  user.streak = newStreak;
  user.longestStreak = newLongest;
  user.lastActiveDate = today;
  await user.save();

  return { streak: newStreak, longestStreak: newLongest };
}

const MILESTONES = [7, 14, 30, 60, 100];

export async function checkStreakMilestones(userId: string): Promise<number[]> {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');

  const awarded = user.streakMilestonesAwarded ?? [];
  const streak = user.streak ?? 0;
  const newlyAwarded = MILESTONES.filter(m => streak >= m && !awarded.includes(m));

  if (newlyAwarded.length > 0) {
    user.streakMilestonesAwarded = [...awarded, ...newlyAwarded];
    await user.save();
  }

  return newlyAwarded;
}

export async function logStudyActivity(userId: string, durationMinutes: number): Promise<void> {
  await UserModel.findByIdAndUpdate(userId, { $inc: { totalStudyMinutes: durationMinutes } });
  await updateStreak(userId);
  await checkStreakMilestones(userId);
}
