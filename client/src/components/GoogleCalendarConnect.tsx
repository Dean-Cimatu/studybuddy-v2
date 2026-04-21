import { useGoogleCalendarStatus, useConnectGoogle, useDisconnectGoogle } from '../hooks/useGoogleCalendar';

export function GoogleCalendarConnect() {
  const connected = useGoogleCalendarStatus();
  const connect = useConnectGoogle();
  const disconnect = useDisconnectGoogle();

  if (connected) {
    return (
      <div className="card-base p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
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
        <span className="text-2xl">📅</span>
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
