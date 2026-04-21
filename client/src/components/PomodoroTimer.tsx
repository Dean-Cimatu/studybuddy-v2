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
  { value: 'none', label: 'None' },
  { value: 'white', label: 'White noise' },
  { value: 'brown', label: 'Brown noise' },
  { value: 'rain', label: 'Rain' },
];

export function PomodoroTimer() {
  const logSession = useLogSession();
  const { data: modules = [] } = useModules();
  const [showPicker, setShowPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [logged, setLogged] = useState(false);
  const [settings, setSettings] = useState<PomodoroSettings>(() => loadPomodoroSettings());
  const [ambient, setAmbient] = useState<AmbientType>('none');
  const [sessionNotes, setSessionNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const [draftWork, setDraftWork] = useState(settings.workMinutes);
  const [draftShort, setDraftShort] = useState(settings.shortBreakMinutes);
  const [draftLong, setDraftLong] = useState(settings.longBreakMinutes);
  const [draftSessions, setDraftSessions] = useState(settings.sessionsBeforeLong);

  const pickerRef = useRef<HTMLDivElement>(null);
  const sessionStartRef = useRef<string | null>(null);
  const prevIsRunningRef = useRef(false);
  const prevIsBreakRef = useRef(false);
  const notesRef = useRef(sessionNotes);
  notesRef.current = sessionNotes;

  const timer = usePomodoro((durationMinutes, tag, name) => {
    const endTime = new Date().toISOString();
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

  // Track session start time
  useEffect(() => {
    if (timer.isRunning && !prevIsRunningRef.current && !timer.isBreak) {
      sessionStartRef.current = new Date().toISOString();
    }
    prevIsRunningRef.current = timer.isRunning;
  }, [timer.isRunning, timer.isBreak]);

  // Detect break ending
  useEffect(() => {
    if (!timer.isBreak && prevIsBreakRef.current && timer.isRunning) {
      playBreakEnd();
      notify('Break over', "Time to focus. You've got this!");
    }
    prevIsBreakRef.current = timer.isBreak;
  }, [timer.isBreak, timer.isRunning]);

  // Ambient sound: start on focus, stop on break/pause
  useEffect(() => {
    if (timer.isRunning && !timer.isBreak && ambient !== 'none') {
      startAmbient(ambient);
    } else {
      stopAmbient();
    }
  }, [timer.isRunning, timer.isBreak, ambient]);

  // Stop ambient on unmount
  useEffect(() => () => stopAmbient(), []);

  // Browser tab title
  useEffect(() => {
    if (timer.isRunning) {
      const label = timer.isBreak ? 'Break' : 'Study';
      document.title = `${label} ${formatTime(timer.timeRemaining)} · StudyBuddy`;
    } else {
      document.title = 'StudyBuddy';
    }
    return () => { document.title = 'StudyBuddy'; };
  }, [timer.isRunning, timer.timeRemaining, timer.isBreak]);

  // Close picker on outside click
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

  // External start-session event
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
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        void Notification.requestPermission();
      }
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

  const floatingTimer = timer.isRunning ? createPortal(
    <div className="fixed bottom-5 right-5 z-40 bg-white rounded-2xl shadow-xl border border-slate-200 select-none">
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex gap-0.5">
          {Array.from({ length: SESSION_DOTS }).map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                i < (timer.sessionCount % SESSION_DOTS) || (timer.sessionCount >= SESSION_DOTS && i < SESSION_DOTS)
                  ? 'bg-blue-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <div>
          <p className="text-xs text-slate-400 leading-none mb-0.5">{timer.isBreak ? 'Break' : 'Study'}</p>
          <p className={`font-bold text-base tabular-nums leading-none ${timer.isBreak ? 'text-emerald-500' : 'text-blue-500'}`}>
            {displayTime}
          </p>
        </div>
        {!timer.isBreak && (
          <button
            onClick={() => setShowNotes(v => !v)}
            className={`text-slate-400 hover:text-blue-400 transition-colors p-0.5 ${showNotes ? 'text-blue-400' : ''}`}
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
      </div>
      {showNotes && (
        <div className="px-4 pb-3 border-t border-slate-100 pt-2">
          <textarea
            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:border-blue-400 text-slate-700 placeholder-slate-300"
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

  return (
    <>
      <div className="relative flex items-center gap-1.5 select-none" ref={pickerRef}>
        {/* Compact pill showing state + time */}
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1 transition-colors ${
            timer.isRunning
              ? timer.isBreak ? 'bg-emerald-50 border border-emerald-200' : 'bg-blue-50 border border-blue-200'
              : 'bg-slate-100 border border-slate-200'
          }`}
        >
          {/* Session progress dots */}
          <div className="flex gap-0.5">
            {Array.from({ length: SESSION_DOTS }).map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i < (timer.sessionCount % SESSION_DOTS) || (timer.sessionCount >= SESSION_DOTS && i < SESSION_DOTS)
                    ? 'bg-blue-500' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>

          {timer.isRunning && (
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide leading-none">
              {timer.isBreak ? 'Break' : 'Study'}
            </span>
          )}

          <span className={`font-bold text-sm tabular-nums leading-none ${
            timer.isRunning ? (timer.isBreak ? 'text-emerald-600' : 'text-blue-600') : 'text-slate-600'
          }`}>
            {displayTime}
          </span>

          {timer.moduleTag && !timer.isBreak && (
            <span className="text-[10px] text-slate-500 max-w-[60px] truncate leading-none">
              {timer.moduleTag}
            </span>
          )}
        </div>

        {logged && <span className="text-xs text-emerald-500 animate-pulse font-medium">✓ logged</span>}

        {/* Controls */}
        <div className="flex items-center gap-0.5">
          {!timer.isRunning ? (
            <button
              className="p-1.5 text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
              onClick={handlePlay}
              title="Start / choose module"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </button>
          ) : (
            <button
              className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-colors"
              onClick={timer.pause}
              title="Pause"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {(timer.isRunning || timer.timeRemaining < workSecs) && (
            <button
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              onClick={timer.reset}
              title="Reset"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>

        {/* Unified dropdown */}
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
              <div className="p-3 w-64 space-y-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Timer settings</p>
                </div>
                <div className="space-y-2.5">
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Study (min)</span>
                    <input type="number" min={1} max={120} value={draftWork} onChange={e => setDraftWork(Number(e.target.value))}
                      className="w-16 text-xs text-center border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400" />
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Short break (min)</span>
                    <input type="number" min={1} max={30} value={draftShort} onChange={e => setDraftShort(Number(e.target.value))}
                      className="w-16 text-xs text-center border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400" />
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Long break (min)</span>
                    <input type="number" min={1} max={60} value={draftLong} onChange={e => setDraftLong(Number(e.target.value))}
                      className="w-16 text-xs text-center border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400" />
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Sessions before long</span>
                    <input type="number" min={1} max={8} value={draftSessions} onChange={e => setDraftSessions(Number(e.target.value))}
                      className="w-16 text-xs text-center border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400" />
                  </label>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Ambient sound</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {AMBIENT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setAmbient(opt.value)}
                        className={`text-xs py-1.5 rounded-lg border transition-colors ${
                          ambient === opt.value
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowSettings(false)} className="flex-1 text-xs text-slate-400 hover:text-slate-600 py-1.5 rounded-lg border border-slate-200 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSaveSettings} className="flex-1 text-xs text-white bg-blue-500 hover:bg-blue-600 py-1.5 rounded-lg transition-colors">
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
