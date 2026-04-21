import { Link } from 'react-router-dom';
import { useDashboardStats, useRecentSessions } from '../hooks/useStats';
import type { StudySession } from '@studybuddy/shared';

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card-base p-4 text-center">
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 uppercase tracking-wide mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SessionRow({ session }: { session: StudySession }) {
  const start = new Date(session.startTime);
  const dateLabel = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeLabel = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            session.type === 'pomodoro' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
          }`}>
            {session.type === 'pomodoro' ? 'Pomodoro' : 'Free'}
          </span>
          {session.moduleName && (
            <span className="text-xs text-slate-500 truncate">{session.moduleName}</span>
          )}
          {session.moduleTag && !session.moduleName && (
            <span className="text-xs text-slate-500 truncate">{session.moduleTag}</span>
          )}
        </div>
        {session.notes && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{session.notes}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-slate-700">{formatMinutes(session.durationMinutes)}</p>
        <p className="text-xs text-slate-400">{dateLabel} · {timeLabel}</p>
      </div>
    </div>
  );
}

export function StatsPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: sessionsData, isLoading: sessionsLoading } = useRecentSessions(50);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            ← Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-6">Your Stats</h1>

        {/* Session stats */}
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}
          </div>
        ) : stats && (
          <>
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">This week</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Sessions" value={String(stats.sessionsThisWeek)} />
                <StatCard label="Study time" value={formatMinutes(stats.studyMinutesThisWeek)} sub={`/ ${stats.weeklyGoalHours}h goal`} />
                <StatCard label="Tasks done" value={String(stats.tasksCompletedThisWeek)} />
                <StatCard
                  label="vs last week"
                  value={stats.studyMinutesLastWeek > 0
                    ? `${Math.round(((stats.studyMinutesThisWeek - stats.studyMinutesLastWeek) / stats.studyMinutesLastWeek) * 100) >= 0 ? '+' : ''}${Math.round(((stats.studyMinutesThisWeek - stats.studyMinutesLastWeek) / stats.studyMinutesLastWeek) * 100)}%`
                    : '—'
                  }
                />
              </div>
            </section>

            <section className="mb-6">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">All time</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total study" value={formatMinutes(stats.totalStudyMinutes)} />
                <StatCard label="Longest session" value={stats.longestSessionMinutes > 0 ? formatMinutes(stats.longestSessionMinutes) : '—'} />
                <StatCard label="Avg session" value={stats.avgSessionMinutes > 0 ? formatMinutes(stats.avgSessionMinutes) : '—'} />
                <StatCard label="Top module" value={stats.mostStudiedModule ?? '—'} />
              </div>
            </section>

            <section className="mb-6">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Streak</h2>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Current streak" value={`${stats.currentStreak} days`} />
                <StatCard label="Longest streak" value={`${stats.longestStreak} days`} />
              </div>
            </section>
          </>
        )}

        {/* Session log */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Session log
            {sessionsData && <span className="ml-2 font-normal text-slate-400">({sessionsData.total} total)</span>}
          </h2>

          <div className="card-base p-4">
            {sessionsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 skeleton rounded" />)}
              </div>
            ) : !sessionsData?.sessions.length ? (
              <p className="text-sm text-slate-400 text-center py-6">No sessions logged yet. Start your first study session!</p>
            ) : (
              sessionsData.sessions.map(s => <SessionRow key={s._id} session={s} />)
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
