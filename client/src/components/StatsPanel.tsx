import { useDashboardStats } from '../hooks/useStats';

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function StatCard({ label, emoji, children }: { label: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="card-base p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{emoji} {label}</p>
      {children}
    </div>
  );
}

function SkeletonCard() {
  return <div className="card-base h-[88px] skeleton" />;
}

export function StatsPanel() {
  const { data, isLoading, isError } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['Study Today', 'This Week', 'Streak', 'Tasks Today'].map(label => (
          <div key={label} className="card-base p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-300">--</p>
          </div>
        ))}
        <p className="col-span-2 md:col-span-4 text-xs text-slate-400 text-center -mt-2">Could not load stats</p>
      </div>
    );
  }

  const streakHighlight = data.currentStreak >= 7;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard emoji="⏱" label="Study Today">
        <p className="text-2xl font-bold text-slate-800">{formatMinutes(data.studyMinutesToday)}</p>
      </StatCard>

      <StatCard emoji="📊" label="This Week">
        <p className="text-2xl font-bold text-slate-800">{formatMinutes(data.studyMinutesThisWeek)}</p>
        <p className="text-xs text-slate-400 mt-0.5">/ {data.weeklyGoalHours}h goal</p>
        <div className="h-1 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${Math.min(100, data.weeklyGoalProgress)}%` }}
          />
        </div>
      </StatCard>

      <div className={`card-base p-4 transition-shadow ${streakHighlight ? 'ring-1 ring-orange-200 shadow-orange-50 shadow-md' : ''}`}>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">🔥 Streak</p>
        <p className="text-2xl font-bold text-slate-800">{data.currentStreak}</p>
        <p className="text-xs text-slate-400">days</p>
      </div>

      <StatCard emoji="✅" label="Tasks Today">
        <p className="text-2xl font-bold text-slate-800">{data.tasksCompletedToday}</p>
      </StatCard>
    </div>
  );
}
