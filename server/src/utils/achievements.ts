import { UserModel } from '../models/User';
import { TaskModel } from '../models/Task';
import { postFeedItem } from './feed';
import { ACHIEVEMENTS } from '@studybuddy/shared';

export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
  const user = await UserModel.findById(userId);
  if (!user) return [];

  const already = new Set(user.achievements ?? []);
  const toAward: string[] = [];

  const totalMinutes = user.totalStudyMinutes ?? 0;
  const streak = user.streak ?? 0;

  // Session-based
  if (!already.has('first-session') && totalMinutes > 0) toAward.push('first-session');

  // Streak-based
  if (!already.has('streak-7') && streak >= 7) toAward.push('streak-7');
  if (!already.has('streak-14') && streak >= 14) toAward.push('streak-14');
  if (!already.has('streak-30') && streak >= 30) toAward.push('streak-30');

  // Hours-based
  if (!already.has('hours-10') && totalMinutes >= 600) toAward.push('hours-10');
  if (!already.has('hours-50') && totalMinutes >= 3000) toAward.push('hours-50');
  if (!already.has('hours-100') && totalMinutes >= 6000) toAward.push('hours-100');

  // Tasks-based (only query if not already awarded)
  if (!already.has('tasks-50')) {
    const doneCount = await TaskModel.countDocuments({ userId, status: 'done', isGoal: false });
    if (doneCount >= 50) toAward.push('tasks-50');
  }

  if (toAward.length === 0) return [];

  user.achievements = [...(user.achievements ?? []), ...toAward];
  await user.save();

  for (const id of toAward) {
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (ach) {
      await postFeedItem(userId, user.displayName, 'achievement-earned', {
        id: ach.id,
        title: ach.title,
        icon: ach.icon,
      }).catch(() => {});
    }
  }

  return toAward;
}

export async function awardAchievement(userId: string, achievementId: string): Promise<void> {
  const user = await UserModel.findById(userId);
  if (!user) return;

  if ((user.achievements ?? []).includes(achievementId)) return;

  user.achievements = [...(user.achievements ?? []), achievementId];
  await user.save();

  const ach = ACHIEVEMENTS.find(a => a.id === achievementId);
  if (ach) {
    await postFeedItem(userId, user.displayName, 'achievement-earned', {
      id: ach.id,
      title: ach.title,
      icon: ach.icon,
    }).catch(() => {});
  }
}
