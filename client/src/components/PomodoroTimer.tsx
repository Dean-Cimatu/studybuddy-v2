import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePomodoro, loadPomodoroSettings, savePomodoroSettings } from '../hooks/usePomodoro';
import type { PomodoroSettings } from '../hooks/usePomodoro';
import { useLogSession } from '../hooks/useStats';
import { useModules } from '../hooks/useModules';
import type { Module } from '@studybuddy/shared';
import { playWorkEnd, playBreakEnd, startAmbient, stopAmbient, type AmbientType } from '../utils/sounds';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function notify(title: string, body: string) {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body, silent: true });
  }
}

const SESSION_DOTS = 4;
const AMBIENT_OPTIONS: { value: AmbientType; label: string }[] = [
  { value: 'none',  label: 'None' },
  { value: 'white', label: 'White noise' },
  { value: 'brown', label: 'Brown noise' },
  { value: 'rain',  label: 'Rain' },
];

export function PomodoroTimer() {
  const logSession = useLogSession();
  const { data: modules = [] } = useModules();

  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab]       = useState<'start' | 'settings'>('start');
  const [logged, setLogged]             = useState(false);
  const [settings, setSettings]         = useState<PomodoroSettings>(() => loadPomodoroSettings());
  const [ambient, setAmbient]           = useState<AmbientType>('none');
  const [sessionNotes, setSessionNotes] = useState('');
  const [showNotes, setShowNotes]       = useState(false);

  const [draftWork, setDraftWork]           = useState(settings.workMinutes);
  const [draftShort, setDraftShort]         = useState(settings.shortBreakMinutes);
  const [draftLong, setDraftLong]           = useState(settings.longBreakMinutes);
  const [draftSessions, setDraftSessions]   = useState(settings.sessionsBeforeLong);

  const wrapperRef       = useRef<HTMLDivElement>(null);
  const sessionStartRef  = useRef<string | null>(null);
  const prevIsRunningRef = useRef(false);
  const prevIsBreakRef   = useRef(false);
  const notesRef         = useRef(sessionNotes);
  notesRef.current = sessionNotes;

  const timer = usePomodoro((durationMinutes, tag, name) => {
    const endTime   = new Date().toISOString();
    const startTime = sessionStartRef.current ?? new Date(Date.now() - durationMinutes * 60000).toISOString();
    logSession.mutate({
      startTime, endTime, durationMinutes, type: 'pomodoro',
      moduleTag: tag ?? undefined, moduleName: name ?? undefined,
      notes: notesRef.current || undefined,
    });
    setLogged(true);
    setSessionNotes('');
    setShowNotes(false);
    setTimeout(() => setLogged(false), 2000);
    playWorkEnd();
    notify('Session complete!', tag ? `Great work on ${tag}. Take a break.` : 'Great work! Take a break.');
  }, settings);

  useEffect(() => {
    if (timer.isRunning && !prevIsRunningRef.current && !timer.isBreak) {
      sessionStartRef.current = new Date().toISOString();
    }
    prevIsRunningRef.current = timer.isRunning;
  }, [timer.isRunning, timer.isBreak]);

  useEffect(() => {
    if (!timer.isBreak && prevIsBreakRef.current && timer.isRunning) {
      playBreakEnd();
      notify('Break over', "Time to focus. You've got this!");
    }
    prevIsBreakRef.current = timer.isBreak;
  }, [timer.isBreak, timer.isRunning]);

  useEffect(() => {
    if (timer.isRunning && !timer.isBreak && ambient !== 'none') startAmbient(ambient);
    else stopAmbient();
  }, [timer.isRunning, timer.isBreak, ambient]);

  useEffect(() => () => stopAmbient(), []);

  useEffect(() => {
    if (timer.isRunning) {
      document.title = `${timer.isBreak ? 'Break' : 'Study'} ${formatTime(timer.timeRemaining)} · StudyBuddy`;
    } else {
      document.title = 'StudyBuddy';
    }
    return () => { document.title = 'StudyBuddy'; };
  }, [timer.isRunning, timer.timeRemaining, timer.isBreak]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    function handleStartSession(e: Event) {
      const detail = (e as CustomEvent<{ moduleTag?: string; moduleName?: string }>).detail ?? {};
      if (!timer.isRunning) {
        timer.startWork(detail.moduleTag, detail.moduleName);
        sessionStartRef.current = new Date().toISOString();
      }
    }
    window.addEventListener('studybuddy:start-session', handleStartSession);
    return () => window.removeEventListener('studybuddy:start-session', handleStartSession);
  }, [timer]);

  function openDropdown(tab: 'start' | 'settings' = 'start') {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    setDraftWork(settings.workMinutes);
    setDraftShort(settings.shortBreakMinutes);
    setDraftLong(settings.longBreakMinutes);
    setDraftSessions(settings.sessionsBeforeLong);
    setActiveTab(tab);
    setShowDropdown(v => !v);
  }

  function handleSelectModule(mod: Module | null) {
    setShowDropdown(false);
    timer.startWork(mod?.name ?? undefined, mod?.fullName ?? undefined);
    sessionStartRef.current = new Date().toISOString();
  }

  function handleSaveSettings() {
    const s: PomodoroSettings = {
      workMinutes:        clamp(draftWork, 1, 120),
      shortBreakMinutes:  clamp(draftShort, 1, 30),
      longBreakMinutes:   clamp(draftLong, 1, 60),
      sessionsBeforeLong: clamp(draftSessions, 1, 8),
    };
    savePomodoroSettings(s);
    setSettings(s);
    timer.reset();
    setShowDropdown(false);
  }

  const workSecs    = settings.workMinutes * 60;
  const displayTime = timer.isRunning || timer.timeRemaining < workSecs
    ? formatTime(timer.timeRemaining)
    : formatTime(workSecs);

  // ── Floating widget ───────────────────────────────────────────────────────
  const floatingTimer = timer.isRunning ? createPortal(
    <div className="fixed bottom-5 right-5 z-40 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 select-none">
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex gap-0.5">
          {Array.from({ length: SESSION_DOTS }).map((_, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${
              i < (timer.sessionCount % SESSION_DOTS) ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-600'
            }`} />
          ))}
        </div>
        <div>
          <p className="text-xs text-slate-400 leading-none mb-0.5">
            {timer.isBreak ? 'Break' : timer.moduleTag ?? 'Focus'}
          </p>
          <p className={`font-bold text-base tabular-nums leading-none ${timer.isBreak ? 'text-emerald-500' : 'text-blue-500'}`}>
            {displayTime}
          </p>
        </div>
        {!timer.isBreak && (
          <button
            onClick={() => setShowNotes(v => !v)}
            className={`p-0.5 transition-colors ${showNotes ? 'text-blue-400' : 'text-slate-400 hover:text-blue-400'}`}
            title="Session notes"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
        <button onClick={timer.pause} className="text-slate-400 hover:text-amber-500 transition-colors p-0.5" title="Pause">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
        <button onClick={timer.reset} className="text-slate-400 hover:text-red-400 transition-colors p-0.5" title="End session">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {showNotes && (
        <div className="px-4 pb-3 border-t border-slate-100 dark:border-slate-700 pt-2">
          <textarea
            className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:border-blue-400 text-slate-700 dark:text-slate-200 dark:bg-slate-700 placeholder-slate-300"
            placeholder="Notes for this session…"
            rows={3}
            maxLength={500}
            value={sessionNotes}
            onChange={e => setSessionNotes(e.target.value)}
          />
        </div>
      )}
    </div>,
    document.body
  ) : null;

  // ── Header render ─────────────────────────────────────────────────────────
  return (
    <>
      <div className="relative flex items-center gap-1 select-none" ref={wrapperRef}>

        {/* Running state */}
        {timer.isRunning ? (
          <>
            <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 border ${
              timer.isBreak
                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700'
                : 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700'
            }`}>
              <div className="flex gap-0.5">
                {Array.from({ length: SESSION_DOTS }).map((_, i) => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full ${
                    i < (timer.sessionCount % SESSION_DOTS) ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`} />
                ))}
              </div>
              <span className={`text-xs font-medium ${timer.isBreak ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {timer.isBreak ? 'Break' : timer.moduleTag ?? 'Focus'}
              </span>
              <span className={`font-bold text-sm tabular-nums ${timer.isBreak ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {displayTime}
              </span>
            </div>
            <button
              onClick={timer.pause}
              className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-full transition-colors"
              title="Pause"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={timer.reset}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
              title="End session"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          /* Idle / paused state — single pill, click to open unified dropdown */
          <button
            onClick={() => openDropdown('start')}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-200 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium tabular-nums">{displayTime}</span>
          </button>
        )}

        {logged && <span className="text-xs text-emerald-500 font-medium">Logged</span>}

        {/* ── Unified dropdown ── */}
        {showDropdown && (
          <div className="absolute top-full right-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 w-64">

            {/* Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-700">
              {(['start', 'settings'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                    activeTab === tab
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 -mb-px'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {tab === 'start' ? 'Start Session' : 'Timer Settings'}
                </button>
              ))}
            </div>

            {/* Start tab */}
            {activeTab === 'start' && (
              <div className="py-1.5">
                <p className="px-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Choose module</p>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                  onClick={() => handleSelectModule(null)}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-500 shrink-0" />
                  No module
                </button>
                {modules.map(mod => (
                  <button
                    key={mod._id}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                    onClick={() => handleSelectModule(mod)}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: mod.colour }} />
                    <span className="truncate">{mod.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Settings tab */}
            {activeTab === 'settings' && (
              <div className="p-4 space-y-4">
                <div className="space-y-2.5">
                  {[
                    { label: 'Focus (min)',          value: draftWork,     set: setDraftWork,     min: 1, max: 120 },
                    { label: 'Short break (min)',    value: draftShort,    set: setDraftShort,    min: 1, max: 30  },
                    { label: 'Long break (min)',     value: draftLong,     set: setDraftLong,     min: 1, max: 60  },
                    { label: 'Sessions before long', value: draftSessions, set: setDraftSessions, min: 1, max: 8   },
                  ].map(row => (
                    <label key={row.label} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{row.label}</span>
                      <input
                        type="number"
                        min={row.min}
                        max={row.max}
                        value={row.value}
                        onChange={e => row.set(Number(e.target.value))}
                        className="w-16 text-xs text-center border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400"
                      />
                    </label>
                  ))}
                </div>

                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Ambient sound</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {AMBIENT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setAmbient(opt.value)}
                        className={`text-xs py-1.5 rounded-lg border transition-colors ${
                          ambient === opt.value
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowDropdown(false)}
                    className="flex-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    className="flex-1 text-xs text-white bg-blue-500 hover:bg-blue-600 py-1.5 rounded-lg transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {floatingTimer}
    </>
  );
}
