import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  displayName: string;
  googleCalendarConnected?: boolean;
  studyGoalHours?: number;
  discipline?: string;
  university?: string;
  yearOfStudy?: string;
  bio?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  preferredSessionLength?: number;
  preferredStudyTime?: string;
  themeAccent?: string;
  streak?: number;
  longestStreak?: number;
  totalStudyMinutes?: number;
  achievements?: string[];
  streakMilestonesAwarded?: number[];
  createdAt?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.accent = user?.themeAccent ?? 'blue';
  }, [user?.themeAccent]);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : null))
      .then((data: { user: User } | null) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json() as { user?: User; error?: string };
    if (!res.ok) throw new Error(data.error ?? 'Login failed');
    setUser(data.user ?? null);
  }

  async function register(email: string, password: string, displayName: string): Promise<void> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, displayName }),
    });
    const data = await res.json() as { user?: User; error?: string };
    if (!res.ok) throw new Error(data.error ?? 'Registration failed');
    setUser(data.user ?? null);
  }

  async function logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }

  async function refreshUser(): Promise<void> {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json() as { user: User };
      setUser(data.user);
    }
  }

  function updateUser(patch: Partial<User>): void {
    setUser(prev => prev ? { ...prev, ...patch } : prev);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
