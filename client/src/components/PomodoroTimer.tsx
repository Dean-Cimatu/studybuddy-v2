import { useState, useRef, useEffect } from 'react';
import { usePomodoro } from '../hooks/usePomodoro';
import { useLogSession } from '../hooks/useStats';
import { useModules } from '../hooks/useModules';
import type { Module } from '@studybuddy/shared';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const SESSION_DOTS = 4;

export function PomodoroTimer() {
  const logSession = useLogSession();
  const { data: modules = [] } = useModules();
  const [showModulePicker, setShowModulePicker] = useState(false);
  const [logged, setLogged] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const sessionStartRef = useRef<string | null>(null);
  const prevIsRunningRef = useRef(false);
  const prevIsBreakRef = useRef(false);

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
  });

  // Track when a work session starts to record startTime
  useEffect(() => {
    if (timer.isRunning && !prevIsRunningRef.current && !timer.isBreak) {
      sessionStartRef.current = new Date().toISOString();
    }
    if (!timer.isRunning && prevIsRunningRef.current) {
      // paused or stopped — keep startTime for resume
    }
    prevIsRunningRef.current = timer.isRunning;
    prevIsBreakRef.current = timer.isBreak;
  }, [timer.isRunning, timer.isBreak]);

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowModulePicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handlePlay() {
    if (modules.length === 0) {
      timer.startWork();
    } else {
      setShowModulePicker(v => !v);
    }
  }

  function handleSelectModule(mod: Module | null) {
    setShowModulePicker(false);
    timer.startWork(mod?.name ?? undefined, mod?.fullName ?? undefined);
    sessionStartRef.current = new Date().toISOString();
  }

  const timeColour = timer.isBreak ? 'text-emerald-500' : 'text-blue-500';
  const displayTime = timer.isRunning || timer.timeRemaining < (25 * 60)
    ? formatTime(timer.timeRemaining)
    : '25:00';

  return (
    <div className="relative flex items-center gap-2 select-none">
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

        {(timer.isRunning || timer.timeRemaining < 25 * 60) && (
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

      {/* Module picker dropdown */}
      {showModulePicker && (
        <div
          ref={pickerRef}
          className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 min-w-[180px] py-1"
        >
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
        </div>
      )}
    </div>
  );
}
