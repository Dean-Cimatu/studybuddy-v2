import { useGroup } from '../hooks/useGroups';
import type { SpotifyTrack } from '../hooks/useGroups';

interface GroupMemberStatusProps {
  groupId: string;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const RANK_COLOURS = ['text-amber-400', 'text-slate-400', 'text-amber-600'];
const RANK_BG = ['bg-amber-400/10', 'bg-slate-400/10', 'bg-amber-600/10'];

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
      className="flex items-center gap-1.5 mt-1 group/np"
      title={`${track.trackName} by ${track.artistName}`}
    >
      {track.albumArtUrl ? (
        <img
          src={track.albumArtUrl}
          alt="album art"
          className="w-4 h-4 rounded shrink-0"
        />
      ) : (
        <SpotifyIcon className="w-3 h-3 text-[#1DB954] shrink-0" />
      )}
      <span className="text-[10px] text-slate-400 truncate max-w-[140px] group-hover/np:text-[#1DB954] transition-colors">
        {track.isPlaying && (
          <span className="inline-flex gap-px mr-1 items-end">
            {[0, 100, 200].map(d => (
              <span
                key={d}
                className="inline-block w-px bg-[#1DB954] rounded-full animate-bounce"
                style={{ height: '6px', animationDelay: `${d}ms`, animationDuration: '0.8s' }}
              />
            ))}
          </span>
        )}
        {track.trackName}
        <span className="text-slate-500"> · {track.artistName}</span>
      </span>
    </a>
  );
}

export function GroupMemberStatus({ groupId }: GroupMemberStatusProps) {
  const { data, isLoading } = useGroup(groupId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-slate-800 animate-pulse" />)}
      </div>
    );
  }

  if (!data) return null;

  const { group, memberStats } = data;

  const ranked = [...group.members]
    .map(m => ({ ...m, stats: memberStats[m.userId] ?? { hoursThisWeek: 0, streak: 0, recentlyStudied: false, currentModule: null, nowPlaying: null } }))
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
      <div className="space-y-3">
        {ranked.map((member, idx) => {
          const barPct = topHours > 0 ? (member.stats.hoursThisWeek / topHours) * 100 : 0;
          const rankColour = RANK_COLOURS[idx] ?? 'text-slate-600';
          const rankBg = RANK_BG[idx] ?? 'bg-slate-700/20';
          const { recentlyStudied, currentModule, nowPlaying, streak, hoursThisWeek } = member.stats;

          return (
            <div key={member.userId} className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3">
              <div className="flex items-start gap-2.5">
                {/* Rank */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${rankBg} ${rankColour}`}>
                  {idx + 1}
                </div>

                {/* Avatar with online dot */}
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                    {initials(member.name)}
                  </div>
                  {recentlyStudied && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-800" title="Recently studied" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-200 font-medium truncate">{member.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {streak > 0 && (
                        <span className="text-xs text-orange-400 tabular-nums">{streak}d</span>
                      )}
                      <span className="text-xs text-slate-400 tabular-nums font-medium">
                        {hoursThisWeek > 0 ? `${hoursThisWeek}h` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Status line */}
                  {recentlyStudied && currentModule && (
                    <p className="text-[10px] text-emerald-400 mt-0.5 truncate">
                      Studying {currentModule}
                    </p>
                  )}

                  {/* Progress bar */}
                  <div className="h-1 bg-slate-700 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${barPct}%`,
                        backgroundColor: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : '#b45309',
                      }}
                    />
                  </div>

                  {/* Now playing */}
                  {nowPlaying && <NowPlayingBadge track={nowPlaying} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
