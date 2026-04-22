import { useGroup } from '../hooks/useGroups';

interface GroupMemberStatusProps {
  groupId: string;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const RANK_COLOURS = ['text-amber-400', 'text-slate-400', 'text-amber-600'];
const RANK_BG = ['bg-amber-400/10', 'bg-slate-400/10', 'bg-amber-600/10'];

export function GroupMemberStatus({ groupId }: GroupMemberStatusProps) {
  const { data, isLoading } = useGroup(groupId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-slate-800 animate-pulse" />)}
      </div>
    );
  }

  if (!data) return null;

  const { group, memberStats } = data;

  const ranked = [...group.members]
    .map(m => ({ ...m, stats: memberStats[m.userId] ?? { hoursThisWeek: 0, streak: 0 } }))
    .sort((a, b) => b.stats.hoursThisWeek - a.stats.hoursThisWeek);

  const topHours = ranked[0]?.stats.hoursThisWeek ?? 0;
  const totalHours = ranked.reduce((s, m) => s + m.stats.hoursThisWeek, 0);

  return (
    <div>
      {totalHours > 0 && (
        <p className="text-xs text-slate-500 mb-3">
          <span className="text-slate-300 font-semibold">{totalHours.toFixed(1)}h</span> studied collectively this week
        </p>
      )}
      <div className="space-y-2">
        {ranked.map((member, idx) => {
          const barPct = topHours > 0 ? (member.stats.hoursThisWeek / topHours) * 100 : 0;
          const rankColour = RANK_COLOURS[idx] ?? 'text-slate-600';
          const rankBg = RANK_BG[idx] ?? 'bg-slate-700/20';
          return (
            <div key={member.userId} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${rankBg} ${rankColour}`}>
                {idx + 1}
              </div>
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {initials(member.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm text-slate-200 font-medium truncate">{member.name}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {member.stats.streak > 0 && (
                      <span className="text-xs text-orange-400">{member.stats.streak}d streak</span>
                    )}
                    <span className="text-xs text-slate-400 tabular-nums">
                      {member.stats.hoursThisWeek > 0 ? `${member.stats.hoursThisWeek}h` : '—'}
                    </span>
                  </div>
                </div>
                <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-600' : 'bg-blue-500'
                    }`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {ranked.every(m => m.stats.hoursThisWeek === 0) && (
        <p className="text-xs text-slate-600 mt-2 text-center">No sessions logged this week yet</p>
      )}
    </div>
  );
}
