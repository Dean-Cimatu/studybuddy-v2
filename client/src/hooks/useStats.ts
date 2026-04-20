import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DashboardStats, StudyHistoryDay } from '@studybuddy/shared';

export interface LogSessionInput {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  type: 'pomodoro' | 'free';
  moduleTag?: string;
  moduleName?: string;
  notes?: string;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['stats', 'dashboard'],
    queryFn: () => apiFetch<DashboardStats>('/api/stats/dashboard'),
  });
}

export function useStudyHistory(days = 30) {
  return useQuery({
    queryKey: ['stats', 'history', days],
    queryFn: () =>
      apiFetch<{ history: StudyHistoryDay[] }>(`/api/stats/history?days=${days}`).then(d => d.history),
  });
}

export function useLogSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LogSessionInput) =>
      apiFetch('/api/stats/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
