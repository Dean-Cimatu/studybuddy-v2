import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'studybuddy-pomodoro';
const SETTINGS_KEY = 'studybuddy-pomodoro-settings';

export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLong: number;
}

export const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLong: 4,
};

export function loadPomodoroSettings(): PomodoroSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PomodoroSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function savePomodoroSettings(s: PomodoroSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

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
  isPaused: boolean;
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

export function usePomodoro(
  logSession?: (durationMinutes: number, moduleTag: string | null, moduleName: string | null) => void,
  settings?: PomodoroSettings,
): PomodoroState {
  const s = settings ?? DEFAULT_SETTINGS;
  const workSecsRef = useRef(s.workMinutes * 60);
  const shortBreakRef = useRef(s.shortBreakMinutes * 60);
  const longBreakRef = useRef(s.longBreakMinutes * 60);
  const sessionsBeforeLongRef = useRef(s.sessionsBeforeLong);
  workSecsRef.current = s.workMinutes * 60;
  shortBreakRef.current = s.shortBreakMinutes * 60;
  longBreakRef.current = s.longBreakMinutes * 60;
  sessionsBeforeLongRef.current = s.sessionsBeforeLong;

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [moduleTag, setModuleTag] = useState<string | null>(null);
  const [moduleName, setModuleName] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(() => s.workMinutes * 60);

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
    return count > 0 && count % sessionsBeforeLongRef.current === 0
      ? longBreakRef.current
      : shortBreakRef.current;
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
          logSessionRef.current?.(workSecsRef.current / 60, saved.moduleTag, saved.moduleName);
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
          setTimeRemaining(workSecsRef.current);
        }
      }
    } else if (!saved.isRunning && saved.pausedRemaining !== null) {
      pausedRemaining.current = saved.pausedRemaining;
      setTimeRemaining(saved.pausedRemaining);
      setIsPaused(true);
    } else {
      setTimeRemaining(saved.isBreak ? breakDuration(saved.sessionCount) : workSecsRef.current);
    }
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
          logSessionRef.current?.(workSecsRef.current / 60, moduleTagRef.current, moduleNameRef.current);
          const breakSecs = breakDuration(newCount);
          targetEndTime.current = Date.now() + breakSecs * 1000;
          setIsBreak(true);
          isBreakRef.current = true;
          setTimeRemaining(breakSecs);
        } else {
          const nextCount = sessionCountRef.current % sessionsBeforeLongRef.current === 0
            ? 0
            : sessionCountRef.current;
          setSessionCount(nextCount);
          sessionCountRef.current = nextCount;
          targetEndTime.current = Date.now() + workSecsRef.current * 1000;
          setIsBreak(false);
          isBreakRef.current = false;
          setTimeRemaining(workSecsRef.current);
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
    targetEndTime.current = Date.now() + workSecsRef.current * 1000;
    setIsBreak(false);
    isBreakRef.current = false;
    setTimeRemaining(workSecsRef.current);
    setIsPaused(false);
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    if (!isRunning || targetEndTime.current === null) return;
    const remaining = Math.max(0, Math.ceil((targetEndTime.current - Date.now()) / 1000));
    pausedRemaining.current = remaining;
    targetEndTime.current = null;
    setIsRunning(false);
    setIsPaused(true);
    setTimeRemaining(remaining);
  }, [isRunning]);

  const resume = useCallback(() => {
    const remaining = pausedRemaining.current ?? timeRemaining;
    pausedRemaining.current = null;
    targetEndTime.current = Date.now() + remaining * 1000;
    setIsPaused(false);
    setIsRunning(true);
  }, [timeRemaining]);

  const reset = useCallback(() => {
    targetEndTime.current = null;
    pausedRemaining.current = null;
    setIsRunning(false);
    setIsPaused(false);
    setIsBreak(false);
    isBreakRef.current = false;
    setSessionCount(0);
    sessionCountRef.current = 0;
    setModuleTag(null);
    setModuleName(null);
    moduleTagRef.current = null;
    moduleNameRef.current = null;
    setTimeRemaining(workSecsRef.current);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const skip = useCallback(() => {
    if (isBreakRef.current) {
      const nextCount = sessionCountRef.current % sessionsBeforeLongRef.current === 0
        ? 0
        : sessionCountRef.current;
      setSessionCount(nextCount);
      sessionCountRef.current = nextCount;
      targetEndTime.current = isRunning ? Date.now() + workSecsRef.current * 1000 : null;
      pausedRemaining.current = isRunning ? null : workSecsRef.current;
      setIsBreak(false);
      isBreakRef.current = false;
      setTimeRemaining(workSecsRef.current);
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

  return { timeRemaining, isRunning, isPaused, isBreak, sessionCount, moduleTag, moduleName, startWork, pause, resume, reset, skip };
}
