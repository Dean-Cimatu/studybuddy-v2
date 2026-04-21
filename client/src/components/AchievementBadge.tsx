import type { Achievement } from '@studybuddy/shared';

interface AchievementBadgeProps {
  achievement: Achievement;
  earned: boolean;
}

export function AchievementBadge({ achievement, earned }: AchievementBadgeProps) {
  return (
    <div
      title={achievement.desc}
      className={`p-3 rounded-xl border text-center transition-all cursor-default relative ${
        earned
          ? 'border-amber-200 bg-amber-50 shadow-sm'
          : 'border-slate-100 bg-slate-50 opacity-40 grayscale'
      }`}
    >
      <div className="text-2xl mb-1 leading-none">{achievement.icon}</div>
      <p className="text-xs font-medium text-slate-700 leading-tight">{achievement.title}</p>
      {!earned && (
        <span className="absolute top-1 right-1 text-[10px] text-slate-400">🔒</span>
      )}
    </div>
  );
}
