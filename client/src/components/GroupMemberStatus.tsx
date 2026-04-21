import { useGroup } from '../hooks/useGroups';
import { StreakBadge } from './StreakBadge';

interface GroupMemberStatusProps {
  groupId: string;
}

export function GroupMemberStatus({ groupId }: GroupMemberStatusProps) {
  const { data, isLoading } = useGroup(groupId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 rounded bg-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { group, memberStats } = data;

  const sorted = [...group.members].sort((a, b) => {
    const aHours = memberStats[a.userId]?.hoursThisWeek ?? 0;
    const bHours = memberStats[b.userId]?.hoursThisWeek ?? 0;
    return bHours - aHours;
  });

  return (
    <div className="space-y-1.5">
      {sorted.map(member => {
        const stats = memberStats[member.userId] ?? { hoursThisWeek: 0, streak: 0 };
        return (
          <div key={member.userId} className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-800">
            <span className="text-sm text-slate-200 font-medium truncate">{member.name}</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-slate-400">{stats.hoursThisWeek}h this week</span>
              <StreakBadge streak={stats.streak} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
