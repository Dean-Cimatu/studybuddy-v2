import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Module } from '@studybuddy/shared';

export type { Module };

export interface CreateModuleInput {
  name: string;
  fullName?: string;
  colour?: string;
  language?: string;
  topics?: string[];
  weeklyTargetHours?: number;
}

export type UpdateModuleInput = Partial<CreateModuleInput> & { notes?: string | null };

export interface CreateDeadlineInput {
  title: string;
  date: string;
  type: 'exam' | 'coursework' | 'presentation' | 'lab' | 'other';
  weight?: number;
  format?: string;
}

export interface UpdateDeadlineInput {
  title?: string;
  date?: string;
  type?: 'exam' | 'coursework' | 'presentation' | 'lab' | 'other';
  weight?: number | null;
  format?: string | null;
  completed?: boolean;
}

const MODULES_KEY = ['modules'] as const;

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function fetchModules(): Promise<Module[]> {
  const data = await apiFetch<{ modules: Module[] }>('/api/modules');
  return data.modules;
}

async function createModule(input: CreateModuleInput): Promise<Module> {
  const data = await apiFetch<{ module: Module }>('/api/modules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return data.module;
}

async function updateModule(id: string, input: UpdateModuleInput): Promise<Module> {
  const data = await apiFetch<{ module: Module }>(`/api/modules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return data.module;
}

async function deleteModule(id: string): Promise<void> {
  await apiFetch(`/api/modules/${id}`, { method: 'DELETE' });
}

async function addDeadline(moduleId: string, input: CreateDeadlineInput): Promise<Module> {
  const data = await apiFetch<{ module: Module }>(`/api/modules/${moduleId}/deadline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return data.module;
}

async function updateDeadline(moduleId: string, deadlineId: string, input: UpdateDeadlineInput): Promise<Module> {
  const data = await apiFetch<{ module: Module }>(`/api/modules/${moduleId}/deadline/${deadlineId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return data.module;
}

async function deleteDeadline(moduleId: string, deadlineId: string): Promise<Module> {
  const data = await apiFetch<{ module: Module }>(`/api/modules/${moduleId}/deadline/${deadlineId}`, {
    method: 'DELETE',
  });
  return data.module;
}

export function useModules() {
  return useQuery({ queryKey: MODULES_KEY, queryFn: fetchModules });
}

export function useCreateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createModule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MODULES_KEY }),
  });
}

export function useUpdateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateModuleInput }) => updateModule(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MODULES_KEY }),
  });
}

export function useDeleteModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteModule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MODULES_KEY }),
  });
}

export function useAddDeadline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, input }: { moduleId: string; input: CreateDeadlineInput }) =>
      addDeadline(moduleId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MODULES_KEY }),
  });
}

export function useUpdateDeadline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, deadlineId, input }: { moduleId: string; deadlineId: string; input: UpdateDeadlineInput }) =>
      updateDeadline(moduleId, deadlineId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MODULES_KEY }),
  });
}

export function useDeleteDeadline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, deadlineId }: { moduleId: string; deadlineId: string }) =>
      deleteDeadline(moduleId, deadlineId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MODULES_KEY }),
  });
}
