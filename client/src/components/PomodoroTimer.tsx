import { useState, useRef, useEffect } from 'react';
import { usePomodoro, loadPomodoroSettings, savePomodoroSettings } from '../hooks/usePomodoro';
import type { PomodoroSettings } from '../hooks/usePomodoro';
import { useLogSession } from '../hooks/useStats';
import { useModules } from '../hooks/useModules';
import type { Module } from '@studybuddy/shared';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

const SESSION_DOTS = 4;

export function PomodoroTimer() {
  const logSession = useLogSession();
  const { data: modules = [] } = useModules();
  const [showPicker, setShowPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [logged, setLogged] = useState(false);
  const [settings, setSettings] = useState<PomodoroSettings>(() => loadPomodoroSettings());

  // Draft state for settings form
  const [draftWork, setDraftWork] = useState(settings.workMinutes);
  const [draftShort, setDraftShort] = useState(settings.shortBreakMinutes);
  const [draftLong, setDraftLong] = useState(settings.longBreakMinutes);
  const [draftSessions, setDraftSessions] = useState(settings.sessionsBeforeLong);

  const pickerRef = useRef<HTMLDivElement>(null);
  const sessionStartRef = useRef<string | null>(null);
  const prevIsRunningRef = useRef(false);

  const timer = usePomodoro((durationMinutes, tag, name) => {
    const endTime = new Date().toISOString();
    const startTime = sessionStartRef.current ?? new Date(Date.now() - durationMinutes * 60000).toISOString();
    logSession.mutate({
      startTime,
      endTime,
      durationMinutes,
      type: 'pomodoro',
      moduleTag: tag ?? undefined,
      moduleName: name ?? undefined,
    });
    setLogged(true);
    setTimeout(() => setLogged(false), 2000);
  }, settings);

  useEffect(() => {
    if (timer.isRunning && !prevIsRunningRef.current && !timer.isBreak) {
      sessionStartRef.current = new Date().toISOString();
    }
    prevIsRunningRef.current = timer.isRunning;
  }, [timer.isRunning, timer.isBreak]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
        setShowSettings(false);
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

  function handlePlay() {
    if (!showPicker) {
      // Sync draft values when opening
      setDraftWork(settings.workMinutes);
      setDraftShort(settings.shortBreakMinutes);
      setDraftLong(settings.longBreakMinutes);
      setDraftSessions(settings.sessionsBeforeLong);
      setShowSettings(false);
    }
    setShowPicker(v => !v);
  }

  function handleSelectModule(mod: Module | null) {
    setShowPicker(false);
    setShowSettings(false);
    timer.startWork(mod?.name ?? undefined, mod?.fullName ?? undefined);
    sessionStartRef.current = new Date().toISOString();
  }

  function handleSaveSettings() {
    const s: PomodoroSettings = {
      workMinutes: clamp(draftWork, 1, 120),
      shortBreakMinutes: clamp(draftShort, 1, 30),
      longBreakMinutes: clamp(draftLong, 1, 60),
      sessionsBeforeLong: clamp(draftSessions, 1, 8),
    };
    savePomodoroSettings(s);
    setSettings(s);
    timer.reset();
    setShowPicker(false);
    setShowSettings(false);
  }

  const workSecs = settings.workMinutes * 60;
  const timeColour = timer.isBreak ? 'text-emerald-500' : 'text-blue-500';
  const displayTime = timer.isRunning || timer.timeRemaining < workSecs
    ? formatTime(timer.timeRemaining)
    : formatTime(workSecs);

  return (
    <div className="relative flex items-center gap-2 select-none" ref={pickerRef}>
      {/* Session dots */}
      <div className="flex gap-0.5">
        {Array.from({ length: SESSION_DOTS }).map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i < (timer.sessionCount % SESSION_DOTS) || (timer.sessionCount >= SESSION_DOTS && i < SESSION_DOTS)
                ? 'bg-blue-500'
                : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Time display */}
      <span className={`font-semibold text-sm tabular-nums ${timer.isRunning ? timeColour : 'text-slate-700'}`}>
        {timer.isBreak && timer.isRunning ? `Break ${displayTime}` : displayTime}
      </span>

      {/* Module chip */}
      {timer.moduleTag && (
        <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 max-w-[80px] truncate">
          {timer.moduleTag}
        </span>
      )}

      {/* Logged flash */}
      {logged && (
        <span className="text-xs text-emerald-500 animate-pulse">+logged</span>
      )}

      {/* Controls */}
      <div className="flex items-center gap-1">
        {!timer.isRunning ? (
          <button
            className="btn-ghost p-1 text-slate-600 hover:text-blue-500"
            onClick={handlePlay}
            title="Start"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <button
            className="btn-ghost p-1 text-slate-600 hover:text-amber-500"
            onClick={timer.pause}
            title="Pause"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        {(timer.isRunning || timer.timeRemaining < workSecs) && (
          <button
            className="btn-ghost p-1 text-slate-400 hover:text-slate-600"
            onClick={timer.reset}
            title="Reset"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* Unified dropdown: module picker + settings */}
      {showPicker && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 min-w-[200px] py-1">
          {!showSettings ? (
            <>
              <button
                className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                onClick={() => handleSelectModule(null)}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                No module
              </button>
              {modules.map(mod => (
                <button
                  key={mod._id}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  onClick={() => handleSelectModule(mod)}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: mod.colour }} />
                  <span className="truncate">{mod.name}</span>
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-50 hover:text-slate-600 flex items-center gap-2 transition-colors"
                  onClick={() => setShowSettings(true)}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Timer settings
                </button>
              </div>
            </>
          ) : (
            <div className="p-3 w-56 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Timer settings</p>
              </div>
              <div className="space-y-2.5">
                <label className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">Study (min)</span>
                  <input
                    type="number" min={1} max={120}
                    value={draftWork}
                    onChange={e => setDraftWork(Number(e.target.value))}
                    className="w-16 text-xs text-center border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">Short break (min)</span>
                  <input
                    type="number" min={1} max={30}
                    value={draftShort}
                    onChange={e => setDraftShort(Number(e.target.value))}
                    className="w-16 text-xs text-center border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">Long break (min)</span>
                  <input
                    type="number" min={1} max={60}
                    value={draftLong}
                    onChange={e => setDraftLong(Number(e.target.value))}
                    className="w-16 text-xs text-center border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">Sessions before long</span>
                  <input
                    type="number" min={1} max={8}
                    value={draftSessions}
                    onChange={e => setDraftSessions(Number(e.target.value))}
                    className="w-16 text-xs text-center border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
                  />
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 text-xs text-slate-400 hover:text-slate-600 py-1.5 rounded-lg border border-slate-200 transition-colors"
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
  );
}
