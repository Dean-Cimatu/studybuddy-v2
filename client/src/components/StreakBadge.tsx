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
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
      <span className="font-semibold text-sm">{streak}</span>
    </span>
  );
}
