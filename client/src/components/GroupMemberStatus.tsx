import { useGroup } from '../hooks/useGroups';

interface GroupMemberStatusProps {
  groupId: string;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function GroupMemberStatus({ groupId }: GroupMemberStatusProps) {
  const { data, isLoading } = useGroup(groupId);

  if (isLoading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-slate-700 animate-pulse" />)}
      </div>
    );
  }

  if (!data) return null;

  const { group, memberStats } = data;
  const sorted = [...group.members].sort((a, b) => {
    const ah = memberStats[a.userId]?.hoursThisWeek ?? 0;
    const bh = memberStats[b.userId]?.hoursThisWeek ?? 0;
    return bh - ah;
  });

  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map(member => {
        const stats = memberStats[member.userId] ?? { hoursThisWeek: 0, streak: 0 };
        return (
          <div key={member.userId} className="flex items-center gap-2 bg-slate-800 rounded-lg px-2.5 py-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {initials(member.name)}
            </div>
            <div className="text-xs leading-tight">
              <p className="text-slate-200 font-medium">{member.name}</p>
              <p className="text-slate-500">
                {stats.hoursThisWeek > 0 ? `${stats.hoursThisWeek}h` : '—'}
                {stats.streak > 0 && <span className="ml-1.5">🔥{stats.streak}</span>}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
