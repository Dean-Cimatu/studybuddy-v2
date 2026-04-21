import { useStudyHistory } from '../hooks/useStats';
import { useDashboardStats } from '../hooks/useStats';

function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function WeeklyReport() {
  const { data: history } = useStudyHistory(14);
  const { data: stats } = useDashboardStats();

  if (!history || history.length < 14 || !stats) return null;

  const thisWeekDays = history.slice(7);
  const lastWeekDays = history.slice(0, 7);

  const thisWeek = thisWeekDays.reduce((s, d) => s + d.minutes, 0);
  const lastWeek = lastWeekDays.reduce((s, d) => s + d.minutes, 0);

  const bestDayThisWeek = thisWeekDays.reduce((best, d) => d.minutes > best.minutes ? d : best, thisWeekDays[0]);

  const pct = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
  const up = pct !== null && pct >= 0;

  const activeDaysThisWeek = thisWeekDays.filter(d => d.minutes > 0).length;

  return (
    <div className="card-base p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Weekly Snapshot</h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-slate-50 rounded-lg">
          <p className="text-xl font-bold text-slate-800">{formatMinutes(thisWeek)}</p>
          <p className="text-xs text-slate-500 mt-0.5">This week</p>
          {pct !== null && (
            <p className={`text-xs mt-0.5 font-medium ${up ? 'text-emerald-500' : 'text-red-400'}`}>
              {up ? '▲' : '▼'} {Math.abs(pct)}%
            </p>
          )}
        </div>
        <div className="text-center p-3 bg-slate-50 rounded-lg">
          <p className="text-xl font-bold text-slate-800">{formatMinutes(lastWeek)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Last week</p>
        </div>
        <div className="text-center p-3 bg-slate-50 rounded-lg">
          <p className="text-xl font-bold text-slate-800">{activeDaysThisWeek}/7</p>
          <p className="text-xs text-slate-500 mt-0.5">Active days</p>
          {bestDayThisWeek && bestDayThisWeek.minutes > 0 && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              Best: {new Date(bestDayThisWeek.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' })}
            </p>
          )}
        </div>
      </div>

      {/* Day bars */}
      <div className="mt-3 flex items-end gap-1" style={{ height: 40 }}>
        {thisWeekDays.map((d) => {
          const maxMin = Math.max(...thisWeekDays.map(x => x.minutes), 1);
          const heightPct = d.minutes === 0 ? 0 : Math.max(8, Math.round((d.minutes / maxMin) * 100));
          const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'narrow' });
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full rounded-t-sm bg-blue-400 transition-all duration-300" style={{ height: `${heightPct}%` }} />
              <span className="text-[10px] text-slate-400">{dayLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
