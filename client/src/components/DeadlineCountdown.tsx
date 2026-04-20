interface Props {
  date: string;
  completed: boolean;
}

export function DeadlineCountdown({ date, completed }: Props) {
  if (completed) {
    return <span className="text-xs text-slate-400">✓ Completed</span>;
  }

  const now = new Date();
  const deadline = new Date(date);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineStart = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const diffDays = Math.round((deadlineStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return <span className="text-xs text-red-600 font-medium">⚠ Overdue by {Math.abs(diffDays)} day{Math.abs(diffDays) !== 1 ? 's' : ''}</span>;
  }

  if (diffDays === 0) {
    return <span className="text-xs text-red-600 font-bold">Due today!</span>;
  }

  if (diffDays <= 3) {
    return <span className="text-xs text-amber-600 font-medium">Due in {diffDays} day{diffDays !== 1 ? 's' : ''}</span>;
  }

  if (diffDays <= 14) {
    return <span className="text-xs text-slate-700">Due in {diffDays} days</span>;
  }

  return <span className="text-xs text-slate-400">Due in {diffDays} days</span>;
}
