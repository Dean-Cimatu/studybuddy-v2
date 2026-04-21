import { useState } from 'react';
import { useTasks, useUpdateTask } from '../hooks/useTasks';
import { useModules } from '../hooks/useModules';
import { useGoogleEvents } from '../hooks/useGoogleCalendar';
import type { Task } from '@studybuddy/shared';
import type { GoogleCalendarEvent } from '../hooks/useGoogleCalendar';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const TODAY = toYMD(new Date());

function buildGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  const startDow = first.getDay();
  const backfill = startDow === 0 ? 6 : startDow - 1;
  const start = new Date(first);
  start.setDate(start.getDate() - backfill);

  const endDow = last.getDay();
  const forwardfill = endDow === 0 ? 0 : 7 - endDow;
  const end = new Date(last);
  end.setDate(end.getDate() + forwardfill);

  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface DeadlineMark {
  label: string;
  colour: string;
}

// ── DeadlineBar ───────────────────────────────────────────────────────────────

function DeadlineBar({ label, colour }: DeadlineMark) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="h-1 rounded-full w-full" style={{ backgroundColor: colour }} />
      {hover && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-20 whitespace-nowrap rounded bg-slate-800 px-2 py-0.5 text-[10px] text-white shadow pointer-events-none">
          {label}
        </div>
      )}
    </div>
  );
}

// ── DayCell ───────────────────────────────────────────────────────────────────

interface DayCellProps {
  date: Date;
  ymd: string;
  isCurrentMonth: boolean;
  tasks: Task[];
  deadlines: DeadlineMark[];
  googleEvents: GoogleCalendarEvent[];
  isSelected: boolean;
  onClick: () => void;
}

function DayCell({ date, ymd, isCurrentMonth, tasks, deadlines, googleEvents, isSelected, onClick }: DayCellProps) {
  const isToday = ymd === TODAY;
  const dots = tasks.map(t => t.status === 'done' ? 'done' : 'todo');
  const visible = dots.slice(0, 4);
  const extra = dots.length - visible.length;

  return (
    <div
      onClick={onClick}
      className={`bg-white p-1.5 sm:p-2 min-h-[50px] sm:min-h-[80px] cursor-pointer select-none flex flex-col gap-1 ${
        isSelected ? 'ring-2 ring-inset ring-blue-200' : ''
      }`}
    >
      <div>
        {isToday ? (
          <span className="inline-flex w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-500 text-white items-center justify-center text-xs sm:text-sm font-medium">
            {date.getDate()}
          </span>
        ) : (
          <span className={`text-xs sm:text-sm ${isCurrentMonth ? 'text-slate-800' : 'text-slate-300'}`}>
            {date.getDate()}
          </span>
        )}
      </div>

      {dots.length > 0 && (
        <div className="flex flex-wrap items-center gap-0.5">
          {visible.map((kind, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${kind === 'done' ? 'bg-emerald-400' : 'bg-blue-400'}`}
            />
          ))}
          {extra > 0 && <span className="text-[10px] text-slate-400 leading-none">+{extra}</span>}
        </div>
      )}

      {googleEvents.slice(0, 2).map(ev => (
        <div
          key={ev.id}
          className="text-[9px] leading-tight bg-slate-100 text-slate-500 rounded px-1 py-0.5 truncate"
          title={ev.title}
        >
          {ev.allDay ? '' : new Date(ev.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' '}
          {ev.title}
        </div>
      ))}
      {googleEvents.length > 2 && (
        <span className="text-[9px] text-slate-400">+{googleEvents.length - 2} more</span>
      )}

      {deadlines.length > 0 && (
        <div className="mt-auto space-y-0.5">
          {deadlines.map((d, i) => <DeadlineBar key={i} label={d.label} colour={d.colour} />)}
        </div>
      )}
    </div>
  );
}

// ── DayPanel ─────────────────────────────────────────────────────────────────

interface DayPanelProps {
  date: string;
  tasks: Task[];
  deadlines: DeadlineMark[];
  googleEvents: GoogleCalendarEvent[];
}

function DayPanel({ date, tasks, deadlines, googleEvents }: DayPanelProps) {
  const updateTask = useUpdateTask();
  const formatted = new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="mt-4 rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-semibold text-slate-700 mb-3">{formatted}</p>

      {tasks.length === 0 && deadlines.length === 0 && googleEvents.length === 0 && (
        <p className="text-xs text-slate-400">Nothing scheduled.</p>
      )}

      {deadlines.map((d, i) => (
        <div key={i} className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.colour }} />
          <span className="text-xs text-slate-600">{d.label}</span>
        </div>
      ))}

      {googleEvents.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {googleEvents.map(ev => (
            <li key={ev.id} className="flex items-center gap-2">
              <span className="text-xs">📅</span>
              <span className="text-sm text-slate-600">
                {!ev.allDay && (
                  <span className="text-slate-400 mr-1">
                    {new Date(ev.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {ev.title}
              </span>
            </li>
          ))}
        </ul>
      )}

      <ul className="space-y-2">
        {tasks.map(task => (
          <li key={task.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={task.status === 'done'}
              onChange={e =>
                void updateTask.mutateAsync({
                  id: task.id,
                  input: { status: e.target.checked ? 'done' : 'todo' },
                })
              }
              className="rounded accent-blue-500 cursor-pointer"
            />
            <span className={`text-sm ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
              {task.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────

export function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: modules = [] } = useModules();

  const monthStart = new Date(year, month, 1).toISOString();
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
  const { data: googleEventList = [] } = useGoogleEvents(monthStart, monthEnd);

  const googleEventMap = new Map<string, GoogleCalendarEvent[]>();
  for (const ev of googleEventList) {
    const ymd = (ev.allDay ? ev.start : ev.start).slice(0, 10);
    const list = googleEventMap.get(ymd) ?? [];
    list.push(ev);
    googleEventMap.set(ymd, list);
  }

  const taskMap = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const ymd = task.dueDate.slice(0, 10);
    const list = taskMap.get(ymd) ?? [];
    list.push(task);
    taskMap.set(ymd, list);
  }

  const deadlineMap = new Map<string, DeadlineMark[]>();
  for (const mod of modules) {
    for (const dl of mod.deadlines) {
      const ymd = dl.date.slice(0, 10);
      const type = dl.type.charAt(0).toUpperCase() + dl.type.slice(1);
      const list = deadlineMap.get(ymd) ?? [];
      list.push({ label: `${type}: ${mod.name}`, colour: mod.colour });
      deadlineMap.set(ymd, list);
    }
  }

  const days = buildGrid(year, month);

  if (tasksLoading) {
    return (
      <div className="card-base p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="w-6 h-6 skeleton" />
          <div className="w-32 h-6 skeleton" />
          <div className="w-6 h-6 skeleton" />
        </div>
        <div className="grid grid-cols-7 gap-px">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-10 skeleton m-0.5 rounded" />
          ))}
        </div>
      </div>
    );
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const selectedTasks = selected ? (taskMap.get(selected) ?? []) : [];
  const selectedDeadlines = selected ? (deadlineMap.get(selected) ?? []) : [];
  const selectedGoogleEvents = selected ? (googleEventMap.get(selected) ?? []) : [];

  return (
    <div className="card-base p-4 sm:p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={prevMonth} className="btn-ghost px-2 py-1 text-sm">◀</button>
        <h2 className="text-lg font-semibold text-slate-800">{MONTH_NAMES[month]} {year}</h2>
        <button onClick={nextMonth} className="btn-ghost px-2 py-1 text-sm">▶</button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="text-xs text-slate-400 text-center uppercase py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-lg overflow-hidden">
        {days.map(day => {
          const ymd = toYMD(day);
          return (
            <DayCell
              key={ymd}
              date={day}
              ymd={ymd}
              isCurrentMonth={day.getMonth() === month}
              tasks={taskMap.get(ymd) ?? []}
              deadlines={deadlineMap.get(ymd) ?? []}
              googleEvents={googleEventMap.get(ymd) ?? []}
              isSelected={selected === ymd}
              onClick={() => setSelected(prev => prev === ymd ? null : ymd)}
            />
          );
        })}
      </div>

      {/* Day panel */}
      {selected && (
        <DayPanel
          date={selected}
          tasks={selectedTasks}
          deadlines={selectedDeadlines}
          googleEvents={selectedGoogleEvents}
        />
      )}
    </div>
  );
}
