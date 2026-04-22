import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStudyHistory } from '../hooks/useStats';
import { useAuth } from '../contexts/AuthContext';
import type { StudyHistoryDay } from '@studybuddy/shared';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const CELL = 12;
const GAP = 2;
const STEP = CELL + GAP;

function squareColor(minutes: number, isInFuture: boolean, maxMinutes: number): string {
  if (isInFuture) return 'bg-slate-50 dark:bg-slate-800/40';
  if (minutes === 0) return 'bg-slate-100 dark:bg-slate-800';
  if (maxMinutes === 0) return 'bg-emerald-200';
  const ratio = minutes / maxMinutes;
  if (ratio < 0.25) return 'bg-emerald-200';
  if (ratio < 0.5) return 'bg-emerald-400';
  if (ratio < 0.75) return 'bg-emerald-500';
  return 'bg-emerald-700';
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return 'No study';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function buildGrid(rawDays: StudyHistoryDay[], createdAt?: string) {
  const byDate = new Map(rawDays.map(d => [d.date, d.minutes]));
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const dayOfWeek = today.getDay();

  const thisWeekSunday = new Date(today);
  thisWeekSunday.setDate(today.getDate() - dayOfWeek);
  thisWeekSunday.setHours(0, 0, 0, 0);

  // Determine how far back to go: either account creation date or 52 weeks, whichever is sooner
  let gridStart: Date;
  if (createdAt) {
    const accountDate = new Date(createdAt);
    const accountSunday = new Date(accountDate);
    accountSunday.setDate(accountDate.getDate() - accountDate.getDay());
    accountSunday.setHours(0, 0, 0, 0);
    const maxStart = new Date(thisWeekSunday);
    maxStart.setDate(thisWeekSunday.getDate() - 51 * 7);
    gridStart = accountSunday > maxStart ? accountSunday : maxStart;
  } else {
    gridStart = new Date(thisWeekSunday);
    gridStart.setDate(thisWeekSunday.getDate() - 51 * 7);
  }

  // Calculate number of weeks to show
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const totalWeeks = Math.max(1, Math.round((thisWeekSunday.getTime() - gridStart.getTime()) / msPerWeek) + 1);

  const weeks: Array<Array<{ date: string; minutes: number; isInFuture: boolean }>> = [];
  const monthLabels: Array<{ col: number; month: string }> = [];
  let lastMonth = -1;

  for (let w = 0; w < totalWeeks; w++) {
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

function HeatCell({ date, minutes, isInFuture, maxMinutes }: { date: string; minutes: number; isInFuture: boolean; maxMinutes: number }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const formatted = new Date(date + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  function handleEnter() {
    if (isInFuture || !cellRef.current) return;
    const r = cellRef.current.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top });
  }

  return (
    <div ref={cellRef} onMouseEnter={handleEnter} onMouseLeave={() => setPos(null)}>
      <div
        className={`rounded-sm cursor-default ${squareColor(minutes, isInFuture, maxMinutes)} ${isInFuture ? 'opacity-40' : 'hover:opacity-75'}`}
        style={{ width: CELL, height: CELL }}
      />
      {pos && createPortal(
        <div
          className="fixed z-[9999] whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs text-white shadow-lg pointer-events-none -translate-x-1/2"
          style={{ left: pos.x, top: pos.y - 8, transform: 'translate(-50%, -100%)' }}
        >
          <span className="font-medium">{formatDuration(minutes)}</span>
          <span className="text-slate-400 ml-1.5">{formatted}</span>
        </div>,
        document.body
      )}
    </div>
  );
}

export function Heatmap() {
  const { user } = useAuth();
  const createdAt = user?.createdAt;

  // Calculate days to fetch: from account creation (or 365 max)
  const daysSinceCreation = createdAt
    ? Math.min(365, Math.max(7, Math.ceil((Date.now() - new Date(createdAt).getTime()) / 86400000) + 7))
    : 365;

  const { data, isLoading } = useStudyHistory(daysSinceCreation);

  if (isLoading) {
    return (
      <div className="card-base p-4">
        <div className="h-4 w-40 skeleton rounded mb-3" />
        <div className="flex" style={{ gap: GAP }}>
          {Array.from({ length: Math.min(52, Math.ceil(daysSinceCreation / 7)) }).map((_, w) => (
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

  const { weeks, monthLabels } = buildGrid(data ?? [], createdAt);
  const cells = weeks.flat();
  const maxMinutes = Math.max(0, ...cells.filter(d => !d.isInFuture).map(d => d.minutes));
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
          {activeDays} active {activeDays === 1 ? 'day' : 'days'}{totalLabel ? ` · ${totalLabel} total` : ''}
          {weeks.length < 52 ? ' since you joined' : ' in the past year'}
        </p>
      </div>

      <div className="overflow-x-auto">
        <div style={{ width: weeks.length * STEP + 28, minWidth: Math.min(weeks.length, 52) * STEP + 28 }}>
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
                  {week.map(cell => <HeatCell key={cell.date} {...cell} maxMinutes={maxMinutes} />)}
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
