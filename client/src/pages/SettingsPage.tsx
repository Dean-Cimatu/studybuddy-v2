import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GoogleCalendarConnect } from '../components/GoogleCalendarConnect';
import { AchievementBadge } from '../components/AchievementBadge';
import { ModuleList } from '../components/ModuleList';
import { ACHIEVEMENTS } from '@studybuddy/shared';

const ACCENT_COLOURS = [
  { value: 'blue',   bg: 'bg-blue-500' },
  { value: 'green',  bg: 'bg-emerald-500' },
  { value: 'purple', bg: 'bg-violet-500' },
  { value: 'amber',  bg: 'bg-amber-500' },
] as const;

const STUDY_TIMES = [
  { value: 'morning',       label: 'Morning' },
  { value: 'afternoon',     label: 'Afternoon' },
  { value: 'evening',       label: 'Evening' },
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

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-5 ${className}`}>
      {children}
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">{children}</h2>;
}

export function SettingsPage() {
  const { user, updateUser, darkMode, toggleDarkMode, logout } = useAuth();
  const navigate = useNavigate();
  const [customHoursMode, setCustomHoursMode] = useState(false);

  const [displayName, setDisplayName]   = useState(user?.displayName ?? '');
  const [discipline, setDiscipline]     = useState(user?.discipline ?? '');
  const [university, setUniversity]     = useState(user?.university ?? '');
  const [yearOfStudy, setYearOfStudy]   = useState(user?.yearOfStudy ?? '');
  const [bio, setBio]                   = useState(user?.bio ?? '');
  const [linkedinUrl, setLinkedinUrl]   = useState(user?.linkedinUrl ?? '');
  const [githubUrl, setGithubUrl]       = useState(user?.githubUrl ?? '');
  const [goalHours, setGoalHours]       = useState(user?.studyGoalHours ?? 15);
  const [studyTime, setStudyTime] = useState(user?.preferredStudyTime ?? 'no-preference');
  const [accent, setAccent]       = useState(user?.themeAccent ?? 'blue');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const saveTimer        = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const fieldCls = 'w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors';

  const pillBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm border transition-colors ${
      active
        ? 'bg-blue-500 text-white border-blue-500'
        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-2xl mx-auto py-8 px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
          <div className="w-16 text-right">
            {saveState === 'saving' && <span className="text-xs text-slate-400">Saving…</span>}
            {saveState === 'saved'  && <span className="text-xs text-emerald-500">✓ Saved</span>}
          </div>
        </div>

        {/* ── Profile ── */}
        <SectionCard>
          <SectionTitle>Profile</SectionTitle>

          {/* Avatar + name row */}
          <div className="flex items-center gap-4 mb-5">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0 ${nameToColour(displayName || 'U')}`}>
              {initials(displayName || user?.displayName || 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Display name</p>
              <input
                className={fieldCls}
                placeholder="Your name"
                value={displayName}
                onChange={e => { setDisplayName(e.target.value); scheduleSave({ name: e.target.value }); }}
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="mb-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Email</p>
            <input className={`${fieldCls} opacity-50 cursor-not-allowed`} value={user?.email ?? ''} disabled />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Subject / Discipline</label>
              <input
                className={fieldCls}
                placeholder="e.g. Computer Science"
                value={discipline}
                onChange={e => { setDiscipline(e.target.value); scheduleSave({ discipline: e.target.value }); }}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">University</label>
              <input
                className={fieldCls}
                placeholder="e.g. Middlesex University"
                value={university}
                onChange={e => { setUniversity(e.target.value); scheduleSave({ university: e.target.value }); }}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">Year of Study</label>
            <div className="flex flex-wrap gap-2">
              {['1st', '2nd', '3rd', '4th', 'Masters', 'PhD', 'Other'].map(y => (
                <button key={y} type="button" onClick={() => { setYearOfStudy(y); scheduleSave({ yearOfStudy: y }); }} className={pillBtn(yearOfStudy === y)}>
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Bio</label>
            <textarea
              className={`${fieldCls} resize-none`}
              placeholder="A short bio about yourself…"
              rows={2}
              maxLength={300}
              value={bio}
              onChange={e => { setBio(e.target.value); scheduleSave({ bio: e.target.value }); }}
            />
            <p className="text-xs text-slate-400 text-right mt-0.5">{bio.length}/300</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">LinkedIn URL</label>
              <input
                className={fieldCls}
                placeholder="linkedin.com/in/yourname"
                value={linkedinUrl}
                onChange={e => { setLinkedinUrl(e.target.value); scheduleSave({ linkedinUrl: e.target.value }); }}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">GitHub URL</label>
              <input
                className={fieldCls}
                placeholder="github.com/yourname"
                value={githubUrl}
                onChange={e => { setGithubUrl(e.target.value); scheduleSave({ githubUrl: e.target.value }); }}
              />
            </div>
          </div>
        </SectionCard>

        {/* ── Modules ── */}
        <SectionCard>
          <ModuleList />
        </SectionCard>

        {/* ── Study Preferences ── */}
        <SectionCard>
          <SectionTitle>Study Preferences</SectionTitle>
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 block mb-2">
                Weekly study goal: <span className="text-blue-500 font-semibold">{goalHours}h</span>
              </label>
              <input
                type="range"
                min={5}
                max={40}
                value={Math.min(goalHours, 40)}
                onChange={e => { const val = Number(e.target.value); setGoalHours(val); scheduleSave({ studyGoalHours: val }); }}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1 mb-2"><span>5h</span><span>40h</span></div>
              {customHoursMode ? (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min={41}
                    max={168}
                    value={goalHours > 40 ? goalHours : 41}
                    onChange={e => {
                      const val = Math.min(168, Math.max(41, Number(e.target.value)));
                      setGoalHours(val);
                      scheduleSave({ studyGoalHours: val });
                    }}
                    className="w-24 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:border-blue-400 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    autoFocus
                  />
                  <span className="text-sm text-slate-500 dark:text-slate-400">hours / week</span>
                  <button
                    type="button"
                    onClick={() => { setCustomHoursMode(false); setGoalHours(40); scheduleSave({ studyGoalHours: 40 }); }}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-auto"
                  >
                    Back to slider
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCustomHoursMode(true)}
                  className="text-xs text-slate-400 hover:text-blue-500 transition-colors"
                >
                  Need more than 40h? →
                </button>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Preferred study time</p>
              <div className="grid grid-cols-2 gap-2">
                {STUDY_TIMES.map(t => (
                  <button key={t.value} onClick={() => { setStudyTime(t.value); scheduleSave({ preferredStudyTime: t.value }); }} className={`py-2 rounded-lg text-sm border transition-colors ${pillBtn(studyTime === t.value)}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Appearance ── */}
        <SectionCard>
          <SectionTitle>Appearance</SectionTitle>

          {/* Dark mode toggle */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Dark mode</p>
              <p className="text-xs text-slate-400">Switch between light and dark theme</p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${darkMode ? 'bg-blue-500' : 'bg-slate-300'}`}
              aria-label="Toggle dark mode"
            >
              <span
                className={`absolute top-0.5 left-0 w-5 h-5 rounded-full shadow transition-transform duration-200 ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`}
                style={{ backgroundColor: '#ffffff' }}
              />
            </button>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Accent colour</p>
          <div className="flex gap-3">
            {ACCENT_COLOURS.map(c => (
              <button
                key={c.value}
                onClick={() => { setAccent(c.value); scheduleSave({ themeAccent: c.value }); }}
                className={`w-9 h-9 rounded-full ${c.bg} transition-all ${accent === c.value ? 'ring-2 ring-offset-2 ring-slate-400' : 'opacity-70 hover:opacity-100'}`}
                title={c.value}
              />
            ))}
          </div>
        </SectionCard>

        {/* ── Integrations ── */}
        <SectionCard>
          <SectionTitle>Integrations</SectionTitle>
          <div className="space-y-3">
            <GoogleCalendarConnect />
          </div>
        </SectionCard>

        {/* ── Account ── */}
        <SectionCard>
          <SectionTitle>Account</SectionTitle>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Email</span>
              <span className="text-slate-700 dark:text-slate-200">{user?.email}</span>
            </div>
            {memberSince && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Member since</span>
                <span className="text-slate-700 dark:text-slate-200">{memberSince}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {user?.totalStudyMinutes ? formatMinutes(user.totalStudyMinutes) : '0h'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Total study</p>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{user?.longestStreak ?? 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Best streak</p>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{user?.streak ?? 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Current streak</p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/stats"
                className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors py-1"
              >
                <span>Detailed study stats</span>
                <span>→</span>
              </Link>
            </div>

            <div className="pt-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Achievements</p>
              <div className="grid grid-cols-3 gap-2">
                {ACHIEVEMENTS.map(ach => (
                  <AchievementBadge key={ach.id} achievement={ach} earned={earnedSet.has(ach.id)} />
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => void logout().then(() => navigate('/login'))}
                className="w-full mt-3 py-2.5 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </SectionCard>

      </div>
    </div>
  );
}
