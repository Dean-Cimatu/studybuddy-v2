import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSpotifyDisconnect } from '../hooks/useGroups';

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-4 h-4'} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

export function SpotifyConnect() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [toast, setToast] = useState<string | null>(null);
  const disconnect = useSpotifyDisconnect();

  useEffect(() => {
    const status = searchParams.get('spotify');
    if (!status) return;
    setSearchParams(p => { p.delete('spotify'); return p; }, { replace: true });
    if (status === 'connected') {
      setToast('Spotify connected!');
      void refreshUser();
    } else if (status === 'error') {
      setToast('Failed to connect Spotify. Try again.');
    }
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [searchParams, setSearchParams, refreshUser]);

  const connected = (user as unknown as { spotifyConnected?: boolean })?.spotifyConnected ?? false;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#1DB954]/10 flex items-center justify-center">
          <SpotifyIcon className="w-4 h-4 text-[#1DB954]" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Spotify</p>
          <p className="text-xs text-slate-400">
            {connected ? 'Now playing shown to group members' : 'Show what you\'re listening to while studying'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {toast && <span className="text-xs text-emerald-500">{toast}</span>}
        {connected ? (
          <button
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors disabled:opacity-50"
          >
            {disconnect.isPending ? 'Disconnecting...' : 'Disconnect'}
          </button>
        ) : (
          <a
            href="/api/spotify/connect"
            className="text-xs px-3 py-1.5 rounded-lg bg-[#1DB954] hover:bg-[#1aa34a] text-white font-medium transition-colors"
          >
            Connect
          </a>
        )}
      </div>
    </div>
  );
}
