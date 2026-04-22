import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { StudyGroup } from '@studybuddy/shared';

export interface FeedItem {
  _id: string;
  userId: string;
  userName: string;
  type: 'session-complete' | 'streak-milestone' | 'achievement-earned' | 'goal-met' | 'goal-progress' | 'plan-generated';
  data: Record<string, unknown>;
  reactions: { userId: string; createdAt: string }[];
  createdAt: string;
}

export interface SpotifyTrack {
  isPlaying: boolean;
  trackName: string;
  artistName: string;
  albumArtUrl: string | null;
  trackUrl: string;
}

export interface MemberStats {
  hoursThisWeek: number;
  streak: number;
  recentlyStudied: boolean;
  currentModule: string | null;
  nowPlaying: SpotifyTrack | null;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => apiFetch<{ groups: StudyGroup[] }>('/api/groups').then(d => d.groups),
  });
}

export function useGroup(id: string | null) {
  return useQuery({
    queryKey: ['group', id],
    queryFn: () =>
      apiFetch<{ group: StudyGroup; memberStats: Record<string, MemberStats> }>(`/api/groups/${id}`),
    enabled: !!id,
  });
}

export function useGroupFeed(id: string | null) {
  return useQuery({
    queryKey: ['group-feed', id],
    queryFn: () =>
      apiFetch<{ items: FeedItem[] }>(`/api/groups/${id}/feed`).then(d => d.items),
    enabled: !!id,
    refetchInterval: 30000,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ group: StudyGroup }>('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }).then(d => d.group),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) =>
      apiFetch<{ group: StudyGroup }>('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      }).then(d => d.group),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ left: boolean }>(`/api/groups/${id}/leave`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useReactToFeedItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, itemId }: { groupId: string; itemId: string }) =>
      apiFetch<{ reactionCount: number }>(`/api/groups/${groupId}/feed/${itemId}/react`, {
        method: 'POST',
      }),
    onSuccess: (_data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group-feed', groupId] });
    },
  });
}

export function useSpotifyConnect() {
  return useMutation({
    mutationFn: () => {
      window.location.href = '/api/spotify/connect';
      return Promise.resolve();
    },
  });
}

export function useSpotifyDisconnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ disconnected: boolean }>('/api/spotify/disconnect', { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });
}
