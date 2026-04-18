import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TaskList } from '../components/TaskList';
import { Sidebar } from '../components/Sidebar';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    void navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top nav */}
      <header className="h-14 border-b border-gray-800 px-6 flex items-center gap-4 shrink-0">
        <span className="text-lg">📚</span>
        <span className="font-semibold text-white text-sm tracking-tight">StudyBuddy v2</span>
        <div className="flex-1" />
        <span className="text-sm text-gray-400">
          {user?.displayName}
        </span>
        <button
          onClick={() => void handleLogout()}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
        >
          Sign out
        </button>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Task area — 65% */}
        <main className="flex-[65] min-w-0 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white">My Tasks</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <TaskList />
          </div>
        </main>

        {/* Sidebar — 35% */}
        <aside className="flex-[35] min-w-[280px] max-w-sm border-l border-gray-800 overflow-y-auto p-4">
          <Sidebar />
        </aside>
      </div>
    </div>
  );
}
