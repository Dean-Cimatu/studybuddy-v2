import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FlashcardDeck, FlashcardCard } from '@studybuddy/shared';

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const DECKS_KEY = ['flashcard-decks'] as const;
const cards = (deckId: string) => ['flashcard-cards', deckId] as const;
const DUE_KEY = ['flashcard-due'] as const;

export function useDecks() {
  return useQuery({
    queryKey: DECKS_KEY,
    queryFn: () => apiFetch<{ decks: FlashcardDeck[] }>('/api/flashcards/decks').then(d => d.decks),
  });
}

export function useCards(deckId: string | null) {
  return useQuery({
    queryKey: cards(deckId ?? ''),
    queryFn: () => apiFetch<{ cards: FlashcardCard[] }>(`/api/flashcards/decks/${deckId}/cards`).then(d => d.cards),
    enabled: !!deckId,
  });
}

export function useDueCards() {
  return useQuery({
    queryKey: DUE_KEY,
    queryFn: () => apiFetch<{ cards: FlashcardCard[] }>('/api/flashcards/due').then(d => d.cards),
  });
}

export function useCreateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; moduleId?: string | null }) =>
      apiFetch<{ deck: FlashcardDeck }>('/api/flashcards/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: DECKS_KEY }),
  });
}

export function useDeleteDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/flashcards/decks/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: DECKS_KEY }),
  });
}

export function useCreateCard(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { front: string; back: string }) =>
      apiFetch<{ card: FlashcardCard }>(`/api/flashcards/decks/${deckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cards(deckId) });
      qc.invalidateQueries({ queryKey: DECKS_KEY });
    },
  });
}

export function useDeleteCard(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/flashcards/cards/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cards(deckId) });
      qc.invalidateQueries({ queryKey: DECKS_KEY });
    },
  });
}

export function useReviewCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) =>
      apiFetch(`/api/flashcards/cards/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DUE_KEY });
      qc.invalidateQueries({ queryKey: DECKS_KEY });
    },
  });
}
