import { useGroupFeed, useReactToFeedItem, type FeedItem } from '../hooks/useGroups';
import { useAuth } from '../contexts/AuthContext';

interface ActivityFeedProps {
  groupId: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
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

function feedEvent(item: FeedItem): { verb: string; detail?: string } {
  const d = item.data;
  switch (item.type) {
    case 'session-complete': {
      const dur = formatMinutes((d.durationMinutes as number) ?? 0);
      return { verb: `studied ${dur}`, detail: d.moduleTag as string | undefined };
    }
    case 'streak-milestone':
      return { verb: `hit a ${d.streak}-day streak` };
    case 'achievement-earned':
      return { verb: `earned ${d.title ?? 'an achievement'}` };
    case 'goal-met':
      return { verb: `completed ${d.goal ?? 'a goal'}` };
    case 'goal-progress':
      return { verb: `${d.percentage}% through`, detail: d.goalTitle as string | undefined };
    case 'plan-generated': {
      const hrs = Math.round(((d.totalMinutes as number) ?? 0) / 60 * 10) / 10;
      return { verb: `planned ${hrs}h this week` };
    }
    default:
      return { verb: 'did something' };
  }
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLOURS = [
  'bg-blue-600', 'bg-violet-600', 'bg-emerald-600',
  'bg-amber-600', 'bg-rose-600', 'bg-cyan-600',
];

function avatarColour(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLOURS[Math.abs(h) % AVATAR_COLOURS.length];
}

function ThumbUpIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
    </svg>
  );
}

function FeedSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse px-4 py-3">
      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
        <div className="h-2.5 bg-slate-100 dark:bg-slate-700/60 rounded-full w-1/3" />
      </div>
    </div>
  );
}

function FeedRow({ item, groupId, currentUserId }: { item: FeedItem; groupId: string; currentUserId: string }) {
  const react = useReactToFeedItem();
  const { verb, detail } = feedEvent(item);
  const hasReacted = item.reactions.some(r => r.userId === currentUserId);
  const count = item.reactions.length;

  return (
    <div className="flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
      <div className={`w-8 h-8 rounded-full ${avatarColour(item.userName)} flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5`}>
        {initials(item.userName)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{item.userName}</span>
          {' '}
          <span className="text-slate-500 dark:text-slate-400">{verb}</span>
          {detail && (
            <span className="ml-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 px-1.5 py-0.5 rounded-md">{detail}</span>
          )}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[11px] text-slate-400">{timeAgo(item.createdAt)}</span>
          <button
            onClick={() => react.mutate({ groupId, itemId: item._id })}
            disabled={react.isPending}
            className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
              hasReacted
                ? 'text-blue-500 dark:text-blue-400'
                : 'text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100'
            }`}
          >
            <ThumbUpIcon filled={hasReacted} />
            {count > 0 && <span>{count}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ActivityFeed({ groupId }: ActivityFeedProps) {
  const { data: items, isLoading } = useGroupFeed(groupId);
  const { user } = useAuth();
  const currentUserId = (user as unknown as { _id?: string })?._id ?? '';

  if (isLoading) {
    return (
      <div className="divide-y divide-slate-800/60">
        <FeedSkeleton /><FeedSkeleton /><FeedSkeleton />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No activity yet</p>
        <p className="text-xs text-slate-400 mt-0.5">Log a session to get things going</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800/40 overflow-y-auto max-h-[420px]">
      {items.map(item => (
        <FeedRow key={item._id} item={item} groupId={groupId} currentUserId={currentUserId} />
      ))}
    </div>
  );
}
