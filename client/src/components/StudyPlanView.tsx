import { useState } from 'react';
import { useCurrentPlan, useGeneratePlan, useUpdateSession, useRemoveSession } from '../hooks/useStudyPlan';
import { useModules } from '../hooks/useModules';
import { useGoogleCalendarStatus, useGoogleEvents } from '../hooks/useGoogleCalendar';
import type { StudyPlanSession } from '@studybuddy/shared';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR_PX = 56;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt12(hour: number): string {
  const h = hour % 12 || 12;
  return `${h}${hour < 12 ? 'am' : 'pm'}`;
}

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

function _getWeekStartDate(): string {
  const now = new Date();
  const dow = now.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function weekDayLabels(weekStartDate: string): string[] {
  return DAYS.map((d, i) => {
    const date = new Date(`${weekStartDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + i);
    return `${d} ${date.getUTCDate()}`;
  });
}

// ── Session block ─────────────────────────────────────────────────────────────

interface SessionBlockProps {
  session: StudyPlanSession;
  index: number;
  gridStart: number;
  active: boolean;
  onActivate: () => void;
  onClose: () => void;
  onRemove: () => void;
  onMove: () => void;
}

function SessionBlock({ session, gridStart, active, onActivate, onClose, onRemove, onMove }: SessionBlockProps) {
  const top = (session.startHour - gridStart) * HOUR_PX;
  const height = Math.max(24, (session.durationMinutes / 60) * HOUR_PX);

  return (
    <div
      className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 overflow-hidden cursor-pointer select-none z-10 shadow-sm ring-2 ring-transparent hover:ring-white/50 transition-all"
      style={{ top, height, backgroundColor: session.moduleColour }}
      onClick={e => { e.stopPropagation(); if (active) onClose(); else onActivate(); }}
    >
      <p className="text-[10px] text-white/80 leading-tight">{fmt12(session.startHour)} · {fmtDuration(session.durationMinutes)}</p>
      {height > 36 && (
        <p className="text-xs font-semibold text-white leading-tight truncate">{session.topic || session.moduleName}</p>
      )}
      {height > 52 && session.topic && (
        <p className="text-[10px] text-white/70 leading-tight truncate">{session.moduleName}</p>
      )}

      {active && (
        <div
          className="absolute top-full left-0 mt-1 z-30 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px]"
          onClick={e => e.stopPropagation()}
        >
          <button
            className="w-full text-left text-sm px-3 py-1.5 hover:bg-slate-50 text-slate-700"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('studybuddy:start-session', {
                detail: { moduleId: session.moduleId, moduleName: session.moduleName },
              }));
              onClose();
            }}
          >
            ▶ Start Session
          </button>
          <button
            className="w-full text-left text-sm px-3 py-1.5 hover:bg-slate-50 text-slate-700"
            onClick={() => { onMove(); onClose(); }}
          >
            ✎ Move
          </button>
          <button
            className="w-full text-left text-sm px-3 py-1.5 hover:bg-red-50 text-red-600"
            onClick={() => { if (confirm('Remove this session?')) onRemove(); onClose(); }}
          >
            ✕ Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ── Move picker ───────────────────────────────────────────────────────────────

interface MovePickerProps {
  session: StudyPlanSession;
  onSave: (dayOfWeek: number, startHour: number) => void;
  onCancel: () => void;
}

function MovePicker({ session, onSave, onCancel }: MovePickerProps) {
  const [day, setDay] = useState(session.dayOfWeek);
  const [hour, setHour] = useState(session.startHour);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onCancel}>
      <div className="bg-white rounded-xl p-5 shadow-xl w-72" onClick={e => e.stopPropagation()}>
        <p className="text-sm font-semibold text-slate-800 mb-4">Move session</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Day</label>
            <select
              value={day}
              onChange={e => setDay(Number(e.target.value))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400"
            >
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Start time</label>
            <select
              value={hour}
              onChange={e => setHour(Number(e.target.value))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400"
            >
              {Array.from({ length: 14 }, (_, i) => 8 + i).map(h => (
                <option key={h} value={h}>{fmt12(h)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="btn-ghost flex-1 text-sm">Cancel</button>
          <button onClick={() => onSave(day, hour)} className="btn-primary flex-1 text-sm">Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Desktop weekly grid ───────────────────────────────────────────────────────

interface WeeklyGridProps {
  sessions: StudyPlanSession[];
  weekStartDate: string;
  onRemove: (i: number) => void;
  onMove: (i: number, day: number, hour: number) => void;
}

function WeeklyGrid({ sessions, weekStartDate, onRemove, onMove }: WeeklyGridProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [movingIdx, setMovingIdx] = useState<number | null>(null);

  const gridStart = sessions.length
    ? Math.max(7, Math.min(...sessions.map(s => s.startHour)) - 1)
    : 8;
  const gridEnd = sessions.length
    ? Math.min(23, Math.max(...sessions.map(s => s.startHour + Math.ceil(s.durationMinutes / 60))) + 2)
    : 20;
  const gridHeight = (gridEnd - gridStart) * HOUR_PX;

  const connected = useGoogleCalendarStatus();
  const weekEnd = new Date(`${weekStartDate}T00:00:00Z`);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const { data: googleEvents = [] } = useGoogleEvents(
    `${weekStartDate}T00:00:00Z`,
    `${weekEnd.toISOString().slice(0, 10)}T23:59:59Z`
  );

  const hours = Array.from({ length: gridEnd - gridStart }, (_, i) => gridStart + i);

  return (
    <div className="overflow-x-auto" onClick={() => setActiveIdx(null)}>
      <div className="min-w-[640px]">
        {/* Day headers */}
        <div className="flex ml-10 mb-1">
          {weekDayLabels(weekStartDate).map(d => (
            <div key={d} className="flex-1 text-xs font-medium text-slate-500 text-center">{d}</div>
          ))}
        </div>

        {/* Grid body */}
        <div className="flex">
          {/* Time axis */}
          <div className="w-10 flex-shrink-0" style={{ height: gridHeight }}>
            {hours.map(h => (
              <div key={h} style={{ height: HOUR_PX }} className="text-[10px] text-slate-400 text-right pr-1.5 pt-0 leading-none">
                {fmt12(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map((_, dayIdx) => (
            <div
              key={dayIdx}
              className="flex-1 relative border-l border-slate-100"
              style={{ height: gridHeight }}
            >
              {/* Hour lines */}
              {hours.map(h => (
                <div
                  key={h}
                  className="absolute w-full border-t border-slate-100"
                  style={{ top: (h - gridStart) * HOUR_PX }}
                />
              ))}

              {/* Study sessions */}
              {sessions.map((s, i) => s.dayOfWeek === dayIdx && (
                <SessionBlock
                  key={i}
                  session={s}
                  index={i}
                  gridStart={gridStart}
                  active={activeIdx === i}
                  onActivate={() => setActiveIdx(i)}
                  onClose={() => setActiveIdx(null)}
                  onRemove={() => onRemove(i)}
                  onMove={() => setMovingIdx(i)}
                />
              ))}

              {/* Google Calendar events */}
              {connected && googleEvents
                .filter(ev => {
                  if (ev.allDay) return false;
                  const evDate = new Date(ev.start);
                  const weekStart = new Date(`${weekStartDate}T00:00:00Z`);
                  const diff = Math.round((new Date(ev.start.slice(0, 10) + 'T00:00:00Z').getTime() - weekStart.getTime()) / 86400000);
                  return diff === dayIdx && evDate.getUTCHours() >= gridStart && evDate.getUTCHours() < gridEnd;
                })
                .map(ev => {
                  const start = new Date(ev.start);
                  const end = new Date(ev.end);
                  const startH = start.getUTCHours() + start.getUTCMinutes() / 60;
                  const durationH = (end.getTime() - start.getTime()) / 3600000;
                  const top = (startH - gridStart) * HOUR_PX;
                  const height = Math.max(20, durationH * HOUR_PX);
                  return (
                    <div
                      key={ev.id}
                      className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 bg-slate-200 text-slate-600 overflow-hidden z-5"
                      style={{ top, height }}
                      title={ev.title}
                    >
                      <p className="text-[10px] leading-tight truncate">{ev.title}</p>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      {movingIdx !== null && (
        <MovePicker
          session={sessions[movingIdx]!}
          onSave={(day, hour) => { onMove(movingIdx, day, hour); setMovingIdx(null); }}
          onCancel={() => setMovingIdx(null)}
        />
      )}
    </div>
  );
}

// ── Mobile day list ───────────────────────────────────────────────────────────

function MobileDayList({ sessions, onRemove }: { sessions: StudyPlanSession[]; onRemove: (i: number) => void }) {
  return (
    <div className="space-y-4">
      {DAYS.map((day, dayIdx) => {
        const daySessions = sessions
          .map((s, i) => ({ s, i }))
          .filter(({ s }) => s.dayOfWeek === dayIdx);
        if (!daySessions.length) return null;
        return (
          <div key={day}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{day}</p>
            <div className="space-y-2">
              {daySessions.map(({ s, i }) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl p-3 text-white"
                  style={{ backgroundColor: s.moduleColour }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{fmt12(s.startHour)} · {fmtDuration(s.durationMinutes)}</p>
                    <p className="text-sm font-bold truncate">{s.moduleName}</p>
                    <p className="text-xs text-white/80 truncate">{s.topic}</p>
                  </div>
                  <button
                    onClick={() => { if (confirm('Remove?')) onRemove(i); }}
                    className="text-white/70 hover:text-white text-lg flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Module breakdown ──────────────────────────────────────────────────────────

function ModuleBreakdown({ sessions }: { sessions: StudyPlanSession[] }) {
  const map = new Map<string, { colour: string; minutes: number }>();
  for (const s of sessions) {
    const prev = map.get(s.moduleName) ?? { colour: s.moduleColour, minutes: 0 };
    map.set(s.moduleName, { ...prev, minutes: prev.minutes + s.durationMinutes });
  }

  return (
    <div className="flex flex-wrap gap-3 text-sm">
      <span className="text-slate-400 text-xs">Allocated:</span>
      {Array.from(map.entries()).map(([name, { colour, minutes }]) => (
        <span key={name} className="font-medium" style={{ color: colour }}>
          {name} ({fmtDuration(minutes)})
        </span>
      ))}
    </div>
  );
}

// ── StudyPlanView (main) ──────────────────────────────────────────────────────

export function StudyPlanView() {
  const { data: plan, isLoading } = useCurrentPlan();
  const generate = useGeneratePlan();
  const updateSession = useUpdateSession();
  const removeSession = useRemoveSession();
  const { data: modules = [] } = useModules();
  const connected = useGoogleCalendarStatus();
  const [pushToGcal, setPushToGcal] = useState(connected);

  if (isLoading) {
    return (
      <div className="card-base p-6 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl skeleton" />
        ))}
      </div>
    );
  }

  // ── No plan ──────────────────────────────────────────────────────────────────

  if (!plan) {
    const upcomingDeadlines = modules.flatMap(m =>
      m.deadlines.filter(d => new Date(d.date) > new Date())
    );

    return (
      <div className="card-base p-8 text-center">
        <div className="flex justify-center mb-4">
          <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={1.5} />
            <path strokeLinecap="round" strokeWidth={1.5} d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Plan your week</h2>

        {modules.length === 0 ? (
          <p className="text-sm text-slate-500 mb-6">
            Add your modules first to generate a plan.
          </p>
        ) : (
          <p className="text-sm text-slate-500 mb-6">
            You have {modules.length} module{modules.length !== 1 ? 's' : ''} and {upcomingDeadlines.length} upcoming deadline{upcomingDeadlines.length !== 1 ? 's' : ''}.
          </p>
        )}

        {connected && (
          <label className="flex items-center justify-center gap-2 text-sm text-slate-600 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={pushToGcal}
              onChange={e => setPushToGcal(e.target.checked)}
              className="accent-blue-500"
            />
            Add sessions to Google Calendar
          </label>
        )}

        <button
          onClick={() => generate.mutate({ pushToGoogleCalendar: pushToGcal })}
          disabled={generate.isPending || modules.length === 0}
          className="btn-primary text-base px-8"
        >
          {generate.isPending ? 'Generating…' : 'Generate My Plan'}
        </button>

        {generate.isError && (
          <p className="text-xs text-red-500 mt-3">{(generate.error as Error).message}</p>
        )}
      </div>
    );
  }

  // ── Plan exists ──────────────────────────────────────────────────────────────

  const totalHours = (plan.totalPlannedMinutes / 60).toFixed(1).replace(/\.0$/, '');

  function handleRemove(i: number) {
    removeSession.mutate(i);
  }

  function handleMove(i: number, dayOfWeek: number, startHour: number) {
    updateSession.mutate({ index: i, updates: { dayOfWeek, startHour } });
  }

  return (
    <div className="card-base p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">This Week — {totalHours}h planned</h2>
          <p className="text-xs text-slate-400 mt-0.5">Click a session to start, move, or remove it</p>
        </div>
        <button
          onClick={() => {
            if (confirm('Regenerate your plan? Your current sessions will be replaced.')) {
              generate.mutate({ pushToGoogleCalendar: false });
            }
          }}
          disabled={generate.isPending}
          className="btn-secondary text-xs px-3 py-1.5"
        >
          {generate.isPending ? 'Generating…' : 'Regenerate'}
        </button>
      </div>

      {/* Grid — hidden on mobile, shown on sm+ */}
      <div className="hidden sm:block">
        <WeeklyGrid
          sessions={plan.sessions}
          weekStartDate={plan.weekStartDate}
          onRemove={handleRemove}
          onMove={handleMove}
        />
      </div>

      {/* Mobile day list */}
      <div className="sm:hidden">
        <MobileDayList sessions={plan.sessions} onRemove={handleRemove} />
      </div>

      {/* Module breakdown */}
      {plan.sessions.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <ModuleBreakdown sessions={plan.sessions} />
        </div>
      )}
    </div>
  );
}
