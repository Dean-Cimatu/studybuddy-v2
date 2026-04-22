import { useState } from 'react';
import { useGroup } from '../hooks/useGroups';
import type { SpotifyTrack } from '../hooks/useGroups';

interface GroupMemberStatusProps {
  groupId: string;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLOURS = [
  'bg-blue-600', 'bg-violet-600', 'bg-emerald-600',
  'bg-amber-600', 'bg-rose-600', 'bg-cyan-600',
];
function avatarColour(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLOURS[Math.abs(h) % AVATAR_COLOURS.length];
}

const RANK_LABELS = ['1st', '2nd', '3rd'];
const RANK_COLOURS = ['text-amber-400', 'text-slate-400', 'text-amber-600'];
const RANK_BAR = ['bg-amber-400', 'bg-slate-400', 'bg-amber-600'];

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-3 h-3'} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function NowPlayingBadge({ track }: { track: SpotifyTrack }) {
  return (
    <a
      href={track.trackUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 group/np"
      title={`${track.trackName} by ${track.artistName}`}
    >
      {track.albumArtUrl ? (
        <img src={track.albumArtUrl} alt="album" className="w-4 h-4 rounded shrink-0" />
      ) : (
        <SpotifyIcon className="w-3 h-3 text-[#1DB954] shrink-0" />
      )}
      <span className="text-[10px] text-slate-400 truncate max-w-[150px] group-hover/np:text-[#1DB954] transition-colors">
        {track.isPlaying && (
          <span className="inline-flex gap-px mr-1 items-end">
            {[0, 100, 200].map(d => (
              <span key={d} className="inline-block w-px bg-[#1DB954] rounded-full animate-bounce"
                style={{ height: '6px', animationDelay: `${d}ms`, animationDuration: '0.8s' }} />
            ))}
          </span>
        )}
        {track.trackName}
        <span className="text-slate-500"> · {track.artistName}</span>
      </span>
    </a>
  );
}

function MemberCard({
  member,
  rank,
  topHours,
  expanded,
  onClick,
}: {
  member: { userId: string; name: string; stats: { hoursThisWeek: number; streak: number; recentlyStudied: boolean; currentModule: string | null; nowPlaying: SpotifyTrack | null } };
  rank: number;
  topHours: number;
  expanded: boolean;
  onClick: () => void;
}) {
  const { hoursThisWeek, streak, recentlyStudied, currentModule, nowPlaying } = member.stats;
  const barPct = topHours > 0 ? (hoursThisWeek / topHours) * 100 : 0;
  const rankColour = RANK_COLOURS[rank] ?? 'text-slate-600';
  const barColour = RANK_BAR[rank] ?? 'bg-slate-600';

  return (
    <div
      className={`rounded-xl border transition-all duration-200 cursor-pointer select-none ${
        expanded
          ? 'bg-slate-800/80 border-slate-600/60 shadow-lg'
          : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/60 hover:border-slate-600/50'
      }`}
      onClick={onClick}
    >
      {/* Collapsed row */}
      <div className="flex items-center gap-3 p-3">
        {/* Rank */}
        <span className={`text-[11px] font-bold w-7 shrink-0 ${rankColour}`}>
          {RANK_LABELS[rank] ?? `${rank + 1}th`}
        </span>

        {/* Avatar */}
        <div className="relative shrink-0">
          <div className={`w-8 h-8 rounded-full ${avatarColour(member.name)} flex items-center justify-center text-[10px] font-bold text-white`}>
            {initials(member.name)}
          </div>
          {recentlyStudied && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
          )}
        </div>

        {/* Name + bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-medium text-slate-200 truncate">{member.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              {streak > 0 && (
                <span className="text-[11px] text-orange-400 tabular-nums font-medium">{streak}d</span>
              )}
              <span className="text-xs text-slate-300 tabular-nums font-semibold">
                {hoursThisWeek > 0 ? `${hoursThisWeek}h` : '—'}
              </span>
            </div>
          </div>
          <div className="h-1 bg-slate-700/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColour}`}
              style={{ width: `${barPct}%` }}
            />
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={`w-3.5 h-3.5 text-slate-600 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-700/40 space-y-3" onClick={e => e.stopPropagation()}>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-900/50 px-3 py-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">This week</p>
              <p className="text-lg font-bold text-slate-100 tabular-nums">{hoursThisWeek > 0 ? `${hoursThisWeek}h` : '—'}</p>
            </div>
            <div className="rounded-lg bg-slate-900/50 px-3 py-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Streak</p>
              <p className="text-lg font-bold text-orange-400 tabular-nums">{streak > 0 ? `${streak}d` : '—'}</p>
            </div>
          </div>

          {recentlyStudied && currentModule && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
              <span className="text-xs text-emerald-400">Studying <span className="font-medium">{currentModule}</span> now</span>
            </div>
          )}

          {recentlyStudied && !currentModule && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
              <span className="text-xs text-emerald-400">Studied recently</span>
            </div>
          )}

          {nowPlaying && (
            <div className="pt-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Listening to</p>
              <NowPlayingBadge track={nowPlaying} />
            </div>
          )}

          {!recentlyStudied && !nowPlaying && (
            <p className="text-xs text-slate-600 italic">Not currently active</p>
          )}
        </div>
      )}
    </div>
  );
}

export function GroupMemberStatus({ groupId }: GroupMemberStatusProps) {
  const { data, isLoading } = useGroup(groupId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-slate-800/50 animate-pulse" />)}
      </div>
    );
  }

  if (!data) return null;

  const { group, memberStats } = data;

  const ranked = [...group.members]
    .map(m => ({
      ...m,
      stats: memberStats[m.userId] ?? {
        hoursThisWeek: 0, streak: 0, recentlyStudied: false, currentModule: null, nowPlaying: null,
      },
    }))
    .sort((a, b) => b.stats.hoursThisWeek - a.stats.hoursThisWeek);

  const topHours = ranked[0]?.stats.hoursThisWeek ?? 0;
  const totalHours = ranked.reduce((s, m) => s + m.stats.hoursThisWeek, 0);

  return (
    <div>
      {totalHours > 0 && (
        <p className="text-xs text-slate-500 mb-3">
          <span className="text-slate-300 font-semibold">{totalHours.toFixed(1)}h</span> collective this week
        </p>
      )}
      <div className="space-y-2">
        {ranked.map((member, idx) => (
          <MemberCard
            key={member.userId}
            member={member}
            rank={idx}
            topHours={topHours}
            expanded={expandedId === member.userId}
            onClick={() => setExpandedId(prev => prev === member.userId ? null : member.userId)}
          />
        ))}
      </div>
    </div>
  );
}
