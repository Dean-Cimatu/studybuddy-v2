import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'studybuddy-pomodoro';
const WORK_SECONDS = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;
const SESSIONS_BEFORE_LONG = 4;

interface PersistedState {
  targetEndTime: number | null;
  isRunning: boolean;
  isBreak: boolean;
  sessionCount: number;
  moduleTag: string | null;
  moduleName: string | null;
  pausedRemaining: number | null;
}

function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch {
    return null;
  }
}

function savePersisted(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export interface PomodoroState {
  timeRemaining: number;
  isRunning: boolean;
  isBreak: boolean;
  sessionCount: number;
  moduleTag: string | null;
  moduleName: string | null;
  startWork: (moduleTag?: string, moduleName?: string) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
}

export function usePomodoro(logSession?: (durationMinutes: number, moduleTag: string | null, moduleName: string | null) => void): PomodoroState {
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [moduleTag, setModuleTag] = useState<string | null>(null);
  const [moduleName, setModuleName] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(WORK_SECONDS);

  const targetEndTime = useRef<number | null>(null);
  const pausedRemaining = useRef<number | null>(null);
  const sessionCountRef = useRef(0);
  const isBreakRef = useRef(false);
  const moduleTagRef = useRef<string | null>(null);
  const moduleNameRef = useRef<string | null>(null);
  const logSessionRef = useRef(logSession);
  logSessionRef.current = logSession;

  // Keep refs in sync with state
  useEffect(() => { sessionCountRef.current = sessionCount; }, [sessionCount]);
  useEffect(() => { isBreakRef.current = isBreak; }, [isBreak]);
  useEffect(() => { moduleTagRef.current = moduleTag; }, [moduleTag]);
  useEffect(() => { moduleNameRef.current = moduleName; }, [moduleName]);

  function breakDuration(count: number) {
    return count > 0 && count % SESSIONS_BEFORE_LONG === 0 ? LONG_BREAK : SHORT_BREAK;
  }

  const persist = useCallback(() => {
    savePersisted({
      targetEndTime: targetEndTime.current,
      isRunning,
      isBreak,
      sessionCount,
      moduleTag,
      moduleName,
      pausedRemaining: pausedRemaining.current,
    });
  }, [isRunning, isBreak, sessionCount, moduleTag, moduleName]);

  useEffect(() => { persist(); }, [persist]);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = loadPersisted();
    if (!saved) return;

    setIsBreak(saved.isBreak);
    setSessionCount(saved.sessionCount);
    setModuleTag(saved.moduleTag);
    setModuleName(saved.moduleName);
    sessionCountRef.current = saved.sessionCount;
    isBreakRef.current = saved.isBreak;
    moduleTagRef.current = saved.moduleTag;
    moduleNameRef.current = saved.moduleName;

    if (saved.isRunning && saved.targetEndTime !== null) {
      const remaining = Math.ceil((saved.targetEndTime - Date.now()) / 1000);
      if (remaining > 0) {
        targetEndTime.current = saved.targetEndTime;
        setIsRunning(true);
        setTimeRemaining(remaining);
      } else {
        // Session completed while page was closed
        if (!saved.isBreak) {
          const newCount = saved.sessionCount + 1;
          setSessionCount(newCount);
          sessionCountRef.current = newCount;
          logSessionRef.current?.(WORK_SECONDS / 60, saved.moduleTag, saved.moduleName);
          const breakSecs = breakDuration(newCount);
          targetEndTime.current = Date.now() + breakSecs * 1000;
          setIsBreak(true);
          isBreakRef.current = true;
          setIsRunning(true);
          setTimeRemaining(breakSecs);
        } else {
          setIsBreak(false);
          isBreakRef.current = false;
          targetEndTime.current = null;
          setIsRunning(false);
          setTimeRemaining(WORK_SECONDS);
        }
      }
    } else if (!saved.isRunning && saved.pausedRemaining !== null) {
      pausedRemaining.current = saved.pausedRemaining;
      setTimeRemaining(saved.pausedRemaining);
    } else {
      setTimeRemaining(saved.isBreak ? breakDuration(saved.sessionCount) : WORK_SECONDS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      if (targetEndTime.current === null) return;
      const remaining = Math.max(0, Math.ceil((targetEndTime.current - Date.now()) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        if (!isBreakRef.current) {
          const newCount = sessionCountRef.current + 1;
          setSessionCount(newCount);
          sessionCountRef.current = newCount;
          logSessionRef.current?.(WORK_SECONDS / 60, moduleTagRef.current, moduleNameRef.current);
          const breakSecs = breakDuration(newCount);
          targetEndTime.current = Date.now() + breakSecs * 1000;
          setIsBreak(true);
          isBreakRef.current = true;
          setTimeRemaining(breakSecs);
        } else {
          const nextCount = sessionCountRef.current % SESSIONS_BEFORE_LONG === 0
            ? 0
            : sessionCountRef.current;
          setSessionCount(nextCount);
          sessionCountRef.current = nextCount;
          targetEndTime.current = Date.now() + WORK_SECONDS * 1000;
          setIsBreak(false);
          isBreakRef.current = false;
          setTimeRemaining(WORK_SECONDS);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const startWork = useCallback((tag?: string, name?: string) => {
    const tag_ = tag ?? null;
    const name_ = name ?? null;
    setModuleTag(tag_);
    setModuleName(name_);
    moduleTagRef.current = tag_;
    moduleNameRef.current = name_;
    pausedRemaining.current = null;
    targetEndTime.current = Date.now() + WORK_SECONDS * 1000;
    setIsBreak(false);
    isBreakRef.current = false;
    setTimeRemaining(WORK_SECONDS);
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    if (!isRunning || targetEndTime.current === null) return;
    const remaining = Math.max(0, Math.ceil((targetEndTime.current - Date.now()) / 1000));
    pausedRemaining.current = remaining;
    targetEndTime.current = null;
    setIsRunning(false);
    setTimeRemaining(remaining);
  }, [isRunning]);

  const resume = useCallback(() => {
    const remaining = pausedRemaining.current ?? timeRemaining;
    pausedRemaining.current = null;
    targetEndTime.current = Date.now() + remaining * 1000;
    setIsRunning(true);
  }, [timeRemaining]);

  const reset = useCallback(() => {
    targetEndTime.current = null;
    pausedRemaining.current = null;
    setIsRunning(false);
    setIsBreak(false);
    isBreakRef.current = false;
    setSessionCount(0);
    sessionCountRef.current = 0;
    setModuleTag(null);
    setModuleName(null);
    moduleTagRef.current = null;
    moduleNameRef.current = null;
    setTimeRemaining(WORK_SECONDS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const skip = useCallback(() => {
    if (isBreakRef.current) {
      const nextCount = sessionCountRef.current % SESSIONS_BEFORE_LONG === 0
        ? 0
        : sessionCountRef.current;
      setSessionCount(nextCount);
      sessionCountRef.current = nextCount;
      targetEndTime.current = isRunning ? Date.now() + WORK_SECONDS * 1000 : null;
      pausedRemaining.current = isRunning ? null : WORK_SECONDS;
      setIsBreak(false);
      isBreakRef.current = false;
      setTimeRemaining(WORK_SECONDS);
    } else {
      const newCount = sessionCountRef.current + 1;
      setSessionCount(newCount);
      sessionCountRef.current = newCount;
      const breakSecs = breakDuration(newCount);
      targetEndTime.current = isRunning ? Date.now() + breakSecs * 1000 : null;
      pausedRemaining.current = isRunning ? null : breakSecs;
      setIsBreak(true);
      isBreakRef.current = true;
      setTimeRemaining(breakSecs);
    }
  }, [isRunning]);

  return { timeRemaining, isRunning, isBreak, sessionCount, moduleTag, moduleName, startWork, pause, resume, reset, skip };
}
