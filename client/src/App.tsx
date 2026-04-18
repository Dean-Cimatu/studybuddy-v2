import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

type Page = 'home' | 'login' | 'register';

function AppShell() {
  const { user, loading, logout } = useAuth();
  const [page, setPage] = useState<Page>('home');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (page === 'login' && !user) {
    return (
      <LoginPage
        onSuccess={() => setPage('home')}
        onNavigateRegister={() => setPage('register')}
      />
    );
  }

  if (page === 'register' && !user) {
    return (
      <RegisterPage
        onSuccess={() => setPage('home')}
        onNavigateLogin={() => setPage('login')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6">
      <div className="text-6xl">📚</div>
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-2">StudyBuddy v2</h1>
        <p className="text-gray-400 text-lg">AI-powered student study companion</p>
      </div>

      {user ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-gray-300 text-sm">
            Signed in as <span className="text-white font-medium">{user.displayName}</span>
          </p>
          <button
            onClick={() => void logout()}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-700 transition-colors rounded-lg text-sm font-medium"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => setPage('login')}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-lg text-sm font-medium"
          >
            Sign in
          </button>
          <button
            onClick={() => setPage('register')}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-700 transition-colors rounded-lg text-sm font-medium"
          >
            Create account
          </button>
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-400">React + Vite</span>
        <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-400">TypeScript</span>
        <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-400">Tailwind CSS</span>
      </div>

      <a
        href="/api/health"
        className="mt-2 px-5 py-2 bg-gray-900 hover:bg-gray-800 transition-colors rounded-lg text-sm font-medium text-gray-400"
      >
        Check API health →
      </a>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
