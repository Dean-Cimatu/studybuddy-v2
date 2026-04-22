import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModules } from '../hooks/useModules';
import { useDashboardStats } from '../hooks/useStats';
import { TabNav } from '../components/TabNav';
import { StreakBadge } from '../components/StreakBadge';
import { PomodoroTimer } from '../components/PomodoroTimer';
import { StatsPanel } from '../components/StatsPanel';
import { Heatmap } from '../components/Heatmap';
import { WeeklyReport } from '../components/WeeklyReport';
import { TaskList } from '../components/TaskList';
import { StudyPlanView } from '../components/StudyPlanView';
import { Calendar } from '../components/Calendar';
import { GroupList } from '../components/GroupList';
import { ActivityFeed } from '../components/ActivityFeed';
import { GroupMemberStatus } from '../components/GroupMemberStatus';
import { GroupChallengePanel } from '../components/GroupChallenge';
import { OnboardingModal } from '../components/OnboardingModal';
import type { Module, ModuleDeadline } from '@studybuddy/shared';

const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'planner', label: 'Planner' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'social', label: 'Social' },
];

function UpcomingDeadlines({ modules }: { modules: Module[] }) {
  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const deadlines: (ModuleDeadline & { moduleName: string; colour: string })[] = [];
  for (const mod of modules) {
    for (const d of mod.deadlines ?? []) {
      const date = new Date(d.date);
      if (date >= now && date <= inSevenDays) {
        deadlines.push({ ...d, moduleName: mod.name, colour: mod.colour });
      }
    }
  }
  deadlines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (deadlines.length === 0) return (
    <div className="card-base p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">Upcoming (7 days)</h3>
      <p className="text-sm text-slate-400">No deadlines in the next 7 days</p>
    </div>
  );

  return (
    <div className="card-base p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Upcoming (7 days)</h3>
      <div className="space-y-2">
        {deadlines.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.colour }} />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-slate-700 truncate block">{d.title}</span>
              <span className="text-xs text-slate-400">{d.moduleName}</span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [calendarToast, setCalendarToast] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileTasksOpen, setMobileTasksOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const { data: modules = [], isLoading: modulesLoading } = useModules();
  const { data: stats } = useDashboardStats();

  const rawTab = searchParams.get('tab') ?? 'home';
  const activeTab = TABS.some(t => t.id === rawTab) ? rawTab : 'home';

  function setTab(id: string) {
    setSearchParams({ tab: id }, { replace: true });
  }

  const didHandleCalendarParam = useRef(false);
  useEffect(() => {
    if (!didHandleCalendarParam.current && searchParams.get('calendar') === 'connected') {
      didHandleCalendarParam.current = true;
      setCalendarToast(true);
      setSearchParams({ tab: activeTab }, { replace: true });
      const t = setTimeout(() => setCalendarToast(false), 3500);
      return () => clearTimeout(t);
    }
  }, [searchParams, setSearchParams, activeTab]);

  const showOnboarding =
    !modulesLoading &&
    modules.length === 0 &&
    !localStorage.getItem('studybuddy_onboarded');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {calendarToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          Google Calendar connected ✓
        </div>
      )}

      {showOnboarding && (
        <OnboardingModal onComplete={() => setTab('home')} />
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-slate-800 text-base truncate">
            Hey, {user?.displayName?.split(' ')[0]}!
          </span>
          {stats && <StreakBadge streak={stats.currentStreak} />}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:flex items-center">
            <PomodoroTimer />
          </div>
          <Link
            to="/settings"
            className="p-1.5 text-slate-500 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
          <button
            className="md:hidden p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(v => !v)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
          <div className="flex items-center justify-center">
            <PomodoroTimer />
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6">
        <TabNav tabs={TABS} activeTab={activeTab} onChange={setTab} />
      </div>

      <div className="flex flex-1 gap-6 px-4 md:px-6 py-6 min-h-0">
        <main className="flex-1 min-w-0 max-w-full">
          <div key={activeTab} className="transition-opacity duration-200 animate-fadeIn">
            {activeTab === 'home' && (
              <div className="space-y-6">
                <StatsPanel />
                <WeeklyReport />
                <Heatmap />
                <UpcomingDeadlines modules={modules} />
              </div>
            )}

            {activeTab === 'planner' && <StudyPlanView />}

            {activeTab === 'calendar' && <Calendar />}

            {activeTab === 'social' && (
              <div className="flex gap-4 min-h-[520px]">
                {/* Sidebar */}
                <div className="w-48 shrink-0 card-base py-3">
                  <GroupList selectedGroupId={selectedGroupId} onSelectGroup={setSelectedGroupId} />
                </div>

                {/* Main panel */}
                {selectedGroupId ? (
                  <div className="flex-1 min-w-0 space-y-4">
                    {/* Challenge banner */}
                    <GroupChallengePanel groupId={selectedGroupId} />

                    {/* Leaderboard + Feed */}
                    <div className="flex gap-4">
                      <div className="w-72 shrink-0 rounded-xl bg-slate-800/30 border border-slate-700/40 p-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Leaderboard</p>
                        <GroupMemberStatus groupId={selectedGroupId} />
                      </div>
                      <div className="flex-1 min-w-0 rounded-xl bg-slate-800/30 border border-slate-700/40 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-700/40">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Activity</p>
                        </div>
                        <ActivityFeed groupId={selectedGroupId} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 rounded-xl bg-slate-800/20 border border-slate-700/40 flex flex-col items-center justify-center gap-2 text-center p-8">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-1">
                      <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-400">Select a group</p>
                    <p className="text-xs text-slate-600">Pick a group from the sidebar to see activity and set challenges</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile: collapsible Tasks */}
          <div className="md:hidden mt-6 space-y-3">
            <button
              onClick={() => setMobileTasksOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 card-base"
            >
              <span className="font-medium text-slate-700 text-sm">Tasks</span>
              <span className="text-slate-400 text-xs">{mobileTasksOpen ? '▲' : '▼'}</span>
            </button>
            {mobileTasksOpen && (
              <div className="card-base p-4">
                <TaskList />
              </div>
            )}
          </div>
        </main>

        {activeTab === 'home' && (
          <aside className="hidden md:flex flex-col gap-4 w-80 shrink-0">
            <div className="card-base p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Tasks</h3>
              <TaskList />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
