import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  source: 'google';
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useGoogleCalendarStatus() {
  const { user } = useAuth();
  return user?.googleCalendarConnected ?? false;
}

export function useGoogleEvents(start: string, end: string) {
  const connected = useGoogleCalendarStatus();
  return useQuery({
    queryKey: ['google-events', start, end],
    queryFn: () =>
      apiFetch<{ events: GoogleCalendarEvent[] }>(
        `/api/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
      ).then(d => d.events),
    enabled: connected && !!start && !!end,
    staleTime: 5 * 60 * 1000,
  });
}

export function useConnectGoogle() {
  return useMutation({
    mutationFn: async () => {
      const data = await apiFetch<{ url: string }>('/api/calendar/connect');
      window.location.href = data.url;
    },
  });
}

export function useDisconnectGoogle() {
  const { refreshUser } = useAuth();
  return useMutation({
    mutationFn: () => apiFetch('/api/calendar/disconnect', { method: 'POST' }),
    onSuccess: () => refreshUser(),
  });
}
