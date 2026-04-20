import { useState } from 'react';
import { useStudyHistory } from '../hooks/useStats';

function squareColor(minutes: number): string {
  if (minutes === 0) return 'bg-slate-100';
  if (minutes <= 30) return 'bg-emerald-100';
  if (minutes <= 60) return 'bg-emerald-200';
  if (minutes <= 120) return 'bg-emerald-400';
  return 'bg-emerald-600';
}

function formatTooltip(date: string, minutes: number): string {
  if (minutes === 0) return `${date} — No study`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const duration = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
  return `${date} — ${duration} studied`;
}

function HeatSquare({ date, minutes }: { date: string; minutes: number }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      <div className={`w-3.5 h-3.5 rounded-sm transition-colors duration-150 cursor-default ${squareColor(minutes)}`} />
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white shadow-md pointer-events-none">
          {formatTooltip(date, minutes)}
        </div>
      )}
    </div>
  );
}

export function Heatmap() {
  const { data, isLoading } = useStudyHistory(30);

  if (isLoading) {
    return (
      <div>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="w-3.5 h-3.5 rounded-sm skeleton" />
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">Last 30 days</p>
      </div>
    );
  }

  const days: { date: string; minutes: number }[] = data ?? Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return { date: d.toISOString().slice(0, 10), minutes: 0 };
  });

  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {days.map(day => (
          <HeatSquare key={day.date} date={day.date} minutes={day.minutes} />
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">Last 30 days</p>
    </div>
  );
}
