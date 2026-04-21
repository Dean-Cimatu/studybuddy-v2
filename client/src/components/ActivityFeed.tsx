import { useGroupFeed, useReactToFeedItem, type FeedItem } from '../hooks/useGroups';

interface ActivityFeedProps {
  groupId: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function feedText(item: FeedItem): string {
  const d = item.data;
  switch (item.type) {
    case 'session-complete': {
      const dur = formatMinutes((d.durationMinutes as number) ?? 0);
      const mod = d.moduleTag ? ` — ${d.moduleTag}` : '';
      return `studied ${dur}${mod}`;
    }
    case 'streak-milestone':
      return `hit a ${d.streak}-day streak 🔥`;
    case 'achievement-earned':
      return `earned ${d.icon ?? ''} ${d.title ?? 'an achievement'}`;
    case 'goal-met':
      return `completed all tasks for ${d.goal ?? 'a goal'}`;
    case 'goal-progress':
      return `is ${d.percentage}% through ${d.goalTitle ?? 'a goal'}`;
    case 'plan-generated': {
      const hrs = Math.round(((d.totalMinutes as number) ?? 0) / 60 * 10) / 10;
      return `planned ${hrs}h this week`;
    }
    default:
      return 'did something';
  }
}

function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function FeedSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-slate-700 shrink-0" />
      <div className="flex-1 space-y-1.5 py-1">
        <div className="h-3 bg-slate-700 rounded w-3/4" />
        <div className="h-2.5 bg-slate-700 rounded w-1/4" />
      </div>
    </div>
  );
}

export function ActivityFeed({ groupId }: ActivityFeedProps) {
  const { data: items, isLoading } = useGroupFeed(groupId);
  const react = useReactToFeedItem();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <FeedSkeleton />
        <FeedSkeleton />
        <FeedSkeleton />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <p className="text-slate-400 text-sm text-center py-6">
        No activity yet. Log a study session to get started.
      </p>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto max-h-96">
      {items.map(item => (
        <div key={item._id} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {initials(item.userName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-200">
              <span className="font-medium">{item.userName}</span>{' '}
              <span className="text-slate-400">{feedText(item)}</span>
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-slate-500 text-xs">{timeAgo(item.createdAt)}</span>
              <button
                onClick={() => react.mutate({ groupId, itemId: item._id })}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <span>🙌</span>
                <span>{item.reactions.length}</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
