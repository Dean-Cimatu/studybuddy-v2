import { useGoogleCalendarStatus, useConnectGoogle, useDisconnectGoogle } from '../hooks/useGoogleCalendar';

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-5 h-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeWidth={1.5} d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function GoogleCalendarConnect() {
  const connected = useGoogleCalendarStatus();
  const connect = useConnectGoogle();
  const disconnect = useDisconnectGoogle();

  if (connected) {
    return (
      <div className="card-base p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-medium text-emerald-600">Google Calendar connected</span>
        </div>
        <button
          onClick={() => disconnect.mutate()}
          disabled={disconnect.isPending}
          className="btn-ghost text-red-500 hover:bg-red-50 text-xs px-3 py-1.5"
        >
          {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
        </button>
      </div>
    );
  }

  return (
    <div className="card-base p-4">
      <div className="flex items-start gap-3">
        <CalendarIcon className="w-6 h-6 text-slate-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">Connect Google Calendar</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Sync your schedule to plan study sessions around your commitments.
          </p>
        </div>
      </div>
      <button
        onClick={() => connect.mutate()}
        disabled={connect.isPending}
        className="btn-primary w-full mt-3 text-sm"
      >
        {connect.isPending ? 'Connecting…' : 'Connect'}
      </button>
    </div>
  );
}
