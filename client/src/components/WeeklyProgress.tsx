interface WeeklyProgressProps {
  minutesThisWeek: number;
  goalHours: number;
  compact?: boolean;
}

export function WeeklyProgress({ minutesThisWeek, goalHours, compact }: WeeklyProgressProps) {
  const percentage = Math.min(100, (minutesThisWeek / (goalHours * 60)) * 100);
  const goalMet = percentage >= 100;
  const hoursStudied = (minutesThisWeek / 60).toFixed(1).replace(/\.0$/, '');

  return (
    <div className="w-full">
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${goalMet ? 'bg-emerald-500' : 'bg-blue-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {!compact && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-500">{hoursStudied}h / {goalHours}h</span>
          {goalMet && <span className="text-xs text-emerald-600 font-medium">✓ Goal met!</span>}
        </div>
      )}
    </div>
  );
}
