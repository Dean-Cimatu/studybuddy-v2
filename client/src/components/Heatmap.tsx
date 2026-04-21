import { useState } from 'react';
import { useStudyHistory } from '../hooks/useStats';
import type { StudyHistoryDay } from '@studybuddy/shared';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const CELL = 12;
const GAP = 2;
const STEP = CELL + GAP;

function squareColor(minutes: number, isInFuture: boolean): string {
  if (isInFuture) return 'bg-slate-50';
  if (minutes === 0) return 'bg-slate-100';
  if (minutes < 30) return 'bg-emerald-200';
  if (minutes < 60) return 'bg-emerald-400';
  if (minutes < 120) return 'bg-emerald-500';
  return 'bg-emerald-700';
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return 'No study';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function buildGrid(rawDays: StudyHistoryDay[]) {
  const byDate = new Map(rawDays.map(d => [d.date, d.minutes]));
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const dayOfWeek = today.getDay();

  const thisWeekSunday = new Date(today);
  thisWeekSunday.setDate(today.getDate() - dayOfWeek);
  thisWeekSunday.setHours(0, 0, 0, 0);

  const gridStart = new Date(thisWeekSunday);
  gridStart.setDate(thisWeekSunday.getDate() - 51 * 7);

  const weeks: Array<Array<{ date: string; minutes: number; isInFuture: boolean }>> = [];
  const monthLabels: Array<{ col: number; month: string }> = [];
  let lastMonth = -1;

  for (let w = 0; w < 52; w++) {
    const week: Array<{ date: string; minutes: number; isInFuture: boolean }> = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + w * 7 + d);
      const dateStr = date.toISOString().slice(0, 10);
      week.push({ date: dateStr, minutes: byDate.get(dateStr) ?? 0, isInFuture: dateStr > todayStr });
    }
    const firstOfWeek = new Date(gridStart);
    firstOfWeek.setDate(gridStart.getDate() + w * 7);
    const month = firstOfWeek.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ col: w, month: MONTH_NAMES[month] });
      lastMonth = month;
    }
    weeks.push(week);
  }

  return { weeks, monthLabels };
}

function HeatCell({ date, minutes, isInFuture }: { date: string; minutes: number; isInFuture: boolean }) {
  const [visible, setVisible] = useState(false);
  const formatted = new Date(date + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="relative" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      <div
        className={`rounded-sm cursor-default ${squareColor(minutes, isInFuture)} ${isInFuture ? 'opacity-40' : 'hover:opacity-75'}`}
        style={{ width: CELL, height: CELL }}
      />
      {visible && !isInFuture && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs text-white shadow-lg pointer-events-none">
          <span className="font-medium">{formatDuration(minutes)}</span>
          <span className="text-slate-400 ml-1.5">{formatted}</span>
        </div>
      )}
    </div>
  );
}

export function Heatmap() {
  const { data, isLoading } = useStudyHistory(365);

  if (isLoading) {
    return (
      <div className="card-base p-4">
        <div className="h-4 w-40 skeleton rounded mb-3" />
        <div className="flex" style={{ gap: GAP }}>
          {Array.from({ length: 52 }).map((_, w) => (
            <div key={w} className="flex flex-col" style={{ gap: GAP }}>
              {Array.from({ length: 7 }).map((_, d) => (
                <div key={d} className="skeleton rounded-sm" style={{ width: CELL, height: CELL }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { weeks, monthLabels } = buildGrid(data ?? []);
  const cells = weeks.flat();
  const activeDays = cells.filter(d => d.minutes > 0 && !d.isInFuture).length;
  const totalMinutes = cells.reduce((acc, d) => acc + d.minutes, 0);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const totalLabel = totalMinutes === 0 ? '' : h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;

  return (
    <div className="card-base p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Study Activity</h3>
        <p className="text-xs text-slate-400">
          {activeDays} active {activeDays === 1 ? 'day' : 'days'}{totalLabel ? ` · ${totalLabel} total` : ''} in the past year
        </p>
      </div>

      <div className="overflow-x-auto">
        <div style={{ width: 52 * STEP + 28, minWidth: 52 * STEP + 28 }}>
          {/* Month labels */}
          <div className="relative mb-1" style={{ height: 14, marginLeft: 28 }}>
            {monthLabels.map(({ col, month }) => (
              <span
                key={`${col}-${month}`}
                className="absolute text-[10px] text-slate-400 leading-none"
                style={{ left: col * STEP }}
              >
                {month}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="flex items-start">
            {/* Day-of-week labels */}
            <div className="flex flex-col shrink-0 mr-1" style={{ gap: GAP }}>
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="flex items-center justify-end" style={{ height: CELL }}>
                  <span className="text-[10px] text-slate-400 leading-none w-5 text-right">{label}</span>
                </div>
              ))}
            </div>

            {/* Week columns */}
            <div className="flex" style={{ gap: GAP }}>
              {weeks.map((week, w) => (
                <div key={w} className="flex flex-col" style={{ gap: GAP }}>
                  {week.map(cell => <HeatCell key={cell.date} {...cell} />)}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1 mt-2" style={{ marginLeft: 28 }}>
            <span className="text-[10px] text-slate-400 mr-0.5">Less</span>
            {['bg-slate-100', 'bg-emerald-200', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-700'].map((c, i) => (
              <div key={i} className={`rounded-sm ${c}`} style={{ width: CELL, height: CELL }} />
            ))}
            <span className="text-[10px] text-slate-400 ml-0.5">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
