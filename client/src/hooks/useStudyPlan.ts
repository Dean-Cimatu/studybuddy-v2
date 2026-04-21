import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { StudyPlan } from '@studybuddy/shared';

const PLAN_KEY = ['study-plan'] as const;

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useCurrentPlan() {
  return useQuery({
    queryKey: PLAN_KEY,
    queryFn: () => apiFetch<{ plan: StudyPlan | null }>('/api/planner/current').then(d => d.plan),
  });
}

export function useGeneratePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (opts: { pushToGoogleCalendar?: boolean }) =>
      apiFetch<{ plan: StudyPlan }>('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      }).then(d => d.plan),
    onSuccess: (plan) => {
      queryClient.setQueryData(PLAN_KEY, plan);
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ index, updates }: {
      index: number;
      updates: { dayOfWeek?: number; startHour?: number; durationMinutes?: number; moduleName?: string; topic?: string };
    }) =>
      apiFetch<{ plan: StudyPlan }>(`/api/planner/session/${index}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).then(d => d.plan),
    onSuccess: (plan) => queryClient.setQueryData(PLAN_KEY, plan),
  });
}

export function useRemoveSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (index: number) =>
      apiFetch<{ plan: StudyPlan }>(`/api/planner/session/${index}`, { method: 'DELETE' }).then(d => d.plan),
    onSuccess: (plan) => queryClient.setQueryData(PLAN_KEY, plan),
  });
}
