import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import type { Task } from '@studybuddy/shared';

// ── Message types ─────────────────────────────────────────────────────────────

export interface UserMessage {
  id: string;
  role: 'user';
  content: string;
  timestamp: number;
}

export interface WellbeingMessage {
  id: string;
  role: 'assistant';
  mode: 'wellbeing';
  content: string;
  resourceCategory?: string;
  timestamp: number;
}

export interface TaskGenMessage {
  id: string;
  role: 'assistant';
  mode: 'tasks';
  taskCount: number;
  timestamp: number;
}

export interface ErrorMessage {
  id: string;
  role: 'assistant';
  mode: 'error';
  content: string;
  timestamp: number;
}

export type ChatMessage = UserMessage | WellbeingMessage | TaskGenMessage | ErrorMessage;

type APIResponse =
  | { mode: 'tasks'; tasks: Task[] }
  | { mode: 'wellbeing'; reply: string; resourceCategory?: string }
  | { error: string };

// ── localStorage helpers ──────────────────────────────────────────────────────

function storageKey(userId: string) {
  return `studybuddy_chat_${userId}`;
}

function loadMessages(userId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function saveMessages(userId: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(messages));
  } catch {
    // quota exceeded — silent fail
  }
}

function uid() {
  return Math.random().toString(36).slice(2);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

// Build the messages array for the API (only user + wellbeing assistant turns)
function toApiMessages(msgs: ChatMessage[]) {
  return msgs
    .filter((m): m is UserMessage | WellbeingMessage => m.role === 'user' || (m.role === 'assistant' && m.mode === 'wellbeing'))
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.role === 'user' ? m.content : (m as WellbeingMessage).content,
    }));
}

export function useChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? '';

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    userId ? loadMessages(userId) : []
  );
  const [sending, setSending] = useState(false);

  // Sync to localStorage whenever messages change
  useEffect(() => {
    if (userId) saveMessages(userId, messages);
  }, [messages, userId]);

  // Reload messages when user changes
  useEffect(() => {
    if (userId) setMessages(loadMessages(userId));
  }, [userId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || sending) return;

      const userMsg: UserMessage = {
        id: uid(),
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };

      setMessages(prev => {
        const next = [...prev, userMsg];
        if (userId) saveMessages(userId, next);
        return next;
      });
      setSending(true);

      try {
        const history = toApiMessages([...messages, userMsg]);
        const res = await fetch('/api/ai/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ messages: history }),
        });

        const data = (await res.json()) as APIResponse;

        if (!res.ok || 'error' in data) {
          const errMsg: ErrorMessage = {
            id: uid(),
            role: 'assistant',
            mode: 'error',
            content: 'error' in data ? data.error : 'Something went wrong. Please try again.',
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, errMsg]);
          return;
        }

        if (data.mode === 'tasks') {
          const taskMsg: TaskGenMessage = {
            id: uid(),
            role: 'assistant',
            mode: 'tasks',
            taskCount: data.tasks.length,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, taskMsg]);
          // Refetch task list so the new tasks appear immediately
          void queryClient.invalidateQueries({ queryKey: ['tasks'] });
        } else {
          const wellbeingMsg: WellbeingMessage = {
            id: uid(),
            role: 'assistant',
            mode: 'wellbeing',
            content: data.reply,
            resourceCategory: data.resourceCategory,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, wellbeingMsg]);
        }
      } catch {
        const errMsg: ErrorMessage = {
          id: uid(),
          role: 'assistant',
          mode: 'error',
          content: 'Network error. Check your connection and try again.',
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errMsg]);
      } finally {
        setSending(false);
      }
    },
    [messages, sending, userId, queryClient]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    if (userId) localStorage.removeItem(storageKey(userId));
  }, [userId]);

  const lastMessage = messages.at(-1);
  const lastMessagePreview: string = (() => {
    if (!lastMessage) return '';
    if (lastMessage.role === 'user') return lastMessage.content;
    if (lastMessage.mode === 'wellbeing') return lastMessage.content;
    if (lastMessage.mode === 'tasks') return `✅ Created ${lastMessage.taskCount} task${lastMessage.taskCount !== 1 ? 's' : ''}`;
    if (lastMessage.mode === 'error') return lastMessage.content;
    return '';
  })();

  return { messages, sending, sendMessage, clearChat, lastMessagePreview };
}
