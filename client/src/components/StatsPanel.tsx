import { Link } from 'react-router-dom';
import { useDashboardStats } from '../hooks/useStats';

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function ClockIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-3.5 h-3.5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}

function StatCard({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card-base p-4">
      <p className="flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-wide mb-1">
        {icon} {label}
      </p>
      {children}
    </div>
  );
}

function SkeletonCard() {
  return <div className="card-base h-[88px] skeleton" />;
}

function WeekComparison({ thisWeek, lastWeek }: { thisWeek: number; lastWeek: number }) {
  if (lastWeek === 0) return null;
  const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  const up = pct >= 0;
  return (
    <p className={`text-xs mt-0.5 ${up ? 'text-emerald-500' : 'text-red-400'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct)}% vs last week
    </p>
  );
}

export function StatsPanel() {
  const { data, isLoading, isError } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['Study Today', 'This Week', 'Streak', 'Tasks Today'].map(label => (
          <div key={label} className="card-base p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-300">--</p>
          </div>
        ))}
      </div>
    );
  }

  const streakHighlight = data.currentStreak >= 7;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<ClockIcon />} label="Study Today">
          <p className="text-2xl font-bold text-slate-800">{formatMinutes(data.studyMinutesToday)}</p>
        </StatCard>

        <StatCard icon={<ChartIcon />} label="This Week">
          <p className="text-2xl font-bold text-slate-800">{formatMinutes(data.studyMinutesThisWeek)}</p>
          <p className="text-xs text-slate-400 mt-0.5">/ {data.weeklyGoalHours}h goal</p>
          <div className="h-1 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${Math.min(100, data.weeklyGoalProgress)}%` }}
            />
          </div>
          <WeekComparison thisWeek={data.studyMinutesThisWeek} lastWeek={data.studyMinutesLastWeek} />
        </StatCard>

        <div className={`card-base p-4 transition-shadow ${streakHighlight ? 'ring-1 ring-orange-200 shadow-orange-50 shadow-md' : ''}`}>
          <p className="flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-wide mb-1">
            <FlameIcon /> Streak
          </p>
          <p className="text-2xl font-bold text-slate-800">{data.currentStreak}</p>
          <p className="text-xs text-slate-400">days · best {data.longestStreak}</p>
        </div>

        <StatCard icon={<CheckIcon />} label="Tasks Today">
          <p className="text-2xl font-bold text-slate-800">{data.tasksCompletedToday}</p>
          <p className="text-xs text-slate-400 mt-0.5">{data.tasksCompletedThisWeek} this week</p>
        </StatCard>
      </div>

      <div className="flex justify-end mt-2">
        <Link to="/stats" className="text-xs text-slate-400 hover:text-blue-500 transition-colors">
          View detailed stats →
        </Link>
      </div>
    </div>
  );
}
