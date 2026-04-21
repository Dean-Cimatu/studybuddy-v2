import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GoogleCalendarConnect } from '../components/GoogleCalendarConnect';
import { AchievementBadge } from '../components/AchievementBadge';
import { ACHIEVEMENTS } from '@studybuddy/shared';

const ACCENT_COLOURS = [
  { value: 'blue', bg: 'bg-blue-500' },
  { value: 'green', bg: 'bg-emerald-500' },
  { value: 'purple', bg: 'bg-violet-500' },
  { value: 'amber', bg: 'bg-amber-500' },
] as const;

const SESSION_LENGTHS = [25, 50, 90] as const;
const STUDY_TIMES = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'no-preference', label: 'Flexible' },
] as const;


function nameToColour(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colours = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
  return colours[Math.abs(hash) % colours.length];
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  return h < 1 ? `${m}m` : `${h}h ${m % 60 > 0 ? `${m % 60}m` : ''}`.trim();
}

async function apiSaveProfile(fields: Record<string, unknown>): Promise<{ user: Record<string, unknown> }> {
  const res = await fetch('/api/auth/profile', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  return res.json() as Promise<{ user: Record<string, unknown> }>;
}

export function SettingsPage() {
  const { user, updateUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [discipline, setDiscipline] = useState(user?.discipline ?? '');
  const [goalHours, setGoalHours] = useState(user?.studyGoalHours ?? 15);
  const [sessionLength, setSessionLength] = useState<25 | 50 | 90>(
    (user?.preferredSessionLength as 25 | 50 | 90) ?? 25
  );
  const [studyTime, setStudyTime] = useState(user?.preferredStudyTime ?? 'no-preference');
  const [accent, setAccent] = useState(user?.themeAccent ?? 'blue');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedDisplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleSave(fields: Record<string, unknown>) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveState('saving');
      void apiSaveProfile(fields).then(() => {
        updateUser(fields as Parameters<typeof updateUser>[0]);
        setSaveState('saved');
        if (savedDisplayTimer.current) clearTimeout(savedDisplayTimer.current);
        savedDisplayTimer.current = setTimeout(() => setSaveState('idle'), 2000);
      }).catch(() => setSaveState('idle'));
    }, 500);
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (savedDisplayTimer.current) clearTimeout(savedDisplayTimer.current);
    };
  }, []);

  const earnedSet = new Set([
    ...(user?.achievements ?? []),
    ...(user?.streakMilestonesAwarded ?? []).map(m => `streak-${m}`),
  ]);

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Back button */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← Back to Dashboard
          </Link>
          {saveState === 'saving' && <span className="text-xs text-slate-400">Saving…</span>}
          {saveState === 'saved' && <span className="text-xs text-emerald-600">✓ Saved</span>}
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-8">Settings</h1>

        {/* Section 1: Profile */}
        <section className="card-base p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Profile</h2>
          <div className="flex items-center gap-4 mb-5">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0 ${nameToColour(displayName || 'U')}`}
            >
              {initials(displayName || user?.displayName || 'U')}
            </div>
            <div className="flex-1 space-y-2">
              <input
                className="input w-full"
                placeholder="Display name"
                value={displayName}
                onChange={e => {
                  setDisplayName(e.target.value);
                  scheduleSave({ name: e.target.value, discipline });
                }}
              />
              <input
                className="input w-full"
                placeholder="What do you study?"
                value={discipline}
                onChange={e => {
                  setDiscipline(e.target.value);
                  scheduleSave({ name: displayName, discipline: e.target.value });
                }}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Study Preferences */}
        <section className="card-base p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Study Preferences</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Weekly study goal: <span className="text-blue-600 font-semibold">{goalHours}h</span>
              </label>
              <input
                type="range"
                min={5}
                max={40}
                value={goalHours}
                onChange={e => {
                  const val = Number(e.target.value);
                  setGoalHours(val);
                  scheduleSave({ studyGoalHours: val });
                }}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>5h</span><span>40h</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Session length</p>
              <div className="flex gap-2">
                {SESSION_LENGTHS.map(l => (
                  <button
                    key={l}
                    onClick={() => {
                      setSessionLength(l);
                      scheduleSave({ preferredSessionLength: l });
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      sessionLength === l
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {l} min
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Preferred study time</p>
              <div className="grid grid-cols-2 gap-2">
                {STUDY_TIMES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setStudyTime(t.value);
                      scheduleSave({ preferredStudyTime: t.value });
                    }}
                    className={`py-2 rounded-lg text-sm border transition-colors ${
                      studyTime === t.value
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Appearance */}
        <section className="card-base p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Appearance</h2>
          <p className="text-sm text-slate-500 mb-3">Accent colour</p>
          <div className="flex gap-3">
            {ACCENT_COLOURS.map(c => (
              <button
                key={c.value}
                onClick={() => {
                  setAccent(c.value);
                  scheduleSave({ themeAccent: c.value });
                }}
                className={`w-9 h-9 rounded-full ${c.bg} transition-all ${
                  accent === c.value ? 'ring-2 ring-offset-2 ring-slate-400' : 'opacity-70 hover:opacity-100'
                }`}
                title={c.value}
              />
            ))}
          </div>
        </section>

        {/* Section 4: Integrations */}
        <section className="card-base p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Integrations</h2>
          <div className="space-y-3">
            <GoogleCalendarConnect />
            <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg opacity-50">
              <div className="flex items-center gap-3">
                <span className="text-xl">🃏</span>
                <div>
                  <p className="text-sm font-medium text-slate-700">DeckForge</p>
                  <p className="text-xs text-slate-400">Flashcard sync</p>
                </div>
              </div>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Coming soon</span>
            </div>
          </div>
        </section>

        {/* Section 5: Account */}
        <section className="card-base p-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Account</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Email</span>
              <span className="text-slate-700">{user?.email}</span>
            </div>
            {memberSince && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Member since</span>
                <span className="text-slate-700">{memberSince}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-xl font-bold text-slate-800">
                  {user?.totalStudyMinutes ? formatMinutes(user.totalStudyMinutes) : '0h'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Total study</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-xl font-bold text-slate-800">{user?.longestStreak ?? 0}</p>
                <p className="text-xs text-slate-500 mt-0.5">Longest streak</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-xl font-bold text-slate-800">{user?.streak ?? 0}</p>
                <p className="text-xs text-slate-500 mt-0.5">Current streak</p>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-sm font-medium text-slate-700 mb-3">Achievements</p>
              <div className="grid grid-cols-3 gap-2">
                {ACHIEVEMENTS.map(ach => (
                  <AchievementBadge key={ach.id} achievement={ach} earned={earnedSet.has(ach.id)} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
