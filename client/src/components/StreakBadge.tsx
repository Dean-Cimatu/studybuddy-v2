interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  let textClass = 'text-slate-400';
  let shadowClass = '';

  if (streak >= 30) {
    textClass = 'text-orange-500';
    shadowClass = 'shadow-[0_0_10px_rgba(249,115,22,0.5)]';
  } else if (streak >= 7) {
    textClass = 'text-orange-600';
    shadowClass = 'shadow-[0_0_6px_rgba(249,115,22,0.3)]';
  } else if (streak >= 1) {
    textClass = 'text-slate-700';
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded ${textClass} ${shadowClass}`}>
      <span>🔥</span>
      <span className="font-semibold text-sm">{streak}</span>
    </span>
  );
}
