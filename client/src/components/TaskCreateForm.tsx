import { useState, FormEvent, useRef, useEffect, DragEvent } from 'react';
import { useCreateTask, useBreakdownGoal } from '../hooks/useTasks';
import { useModules } from '../hooks/useModules';
import type { Priority, TaskStatus } from '@studybuddy/shared';

const GOAL_KEYWORDS = [
  'study for', 'prepare for', 'revise', 'exam', 'coursework',
  'assignment', 'project', 'final', 'dissertation', 'thesis', 'presentation',
];

function isGoalLike(title: string, dueDate: string): boolean {
  const lower = title.toLowerCase();
  if (GOAL_KEYWORDS.some(kw => lower.includes(kw))) return true;
  if (title.length > 50) return true;
  if (dueDate) {
    const days = (new Date(dueDate).getTime() - Date.now()) / 86400000;
    if (days > 7) return true;
  }
  return false;
}

function fmt(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? (r > 0 ? `${h}h ${r}m` : `${h}h`) : `${m}m`;
}

interface PreviewItem {
  key: string;
  title: string;
  estimatedMinutes: number;
  weekNumber: number;
  editing: boolean;
}

type Phase = 'form' | 'configure' | 'loading' | 'preview';

function SkeletonRow({ delay }: { delay: number }) {
  return (
    <div
      className="h-10 rounded-lg skeleton"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

export function TaskCreateForm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('med');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [dismissed, setDismissed] = useState(false);

  const [phase, setPhase] = useState<Phase>('form');
  const [moduleId, setModuleId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [error, setError] = useState('');

  const dragIndex = useRef<number | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();
  const breakdown = useBreakdownGoal();
  const { data: modules } = useModules();

  const showBanner = open && !dismissed && isGoalLike(title, dueDate) && phase === 'form';

  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (dueDate && !deadline) setDeadline(dueDate);
  }, [dueDate, deadline]);

  function reset() {
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority('med');
    setStatus('todo');
    setDismissed(false);
    setPhase('form');
    setModuleId('');
    setDeadline('');
    setPreview([]);
    setError('');
    setOpen(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createTask.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate || undefined,
      priority,
      status,
    });
    reset();
  }

  async function handleGenerate() {
    if (!title.trim()) return;
    setPhase('loading');
    setError('');
    try {
      const result = await breakdown.mutateAsync({
        title: title.trim(),
        moduleId: moduleId || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      });
      setPreview(
        result.subtasks.map((t, i) => ({
          key: t.id ?? `sub-${i}`,
          title: t.title,
          estimatedMinutes: t.estimatedMinutes ?? 60,
          weekNumber: i + 1,
          editing: false,
        }))
      );
      setPhase('preview');
    } catch {
      setError('Could not generate breakdown. Try again.');
      setPhase('configure');
    }
  }

  function handleAddAll() {
    reset();
  }

  // ── Drag-and-drop reorder ────────────────────────────────────────────────────

  function onDragStart(_e: DragEvent, i: number) {
    dragIndex.current = i;
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
  }

  function onDrop(_e: DragEvent, i: number) {
    const from = dragIndex.current;
    if (from === null || from === i) return;
    const next = [...preview];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    setPreview(next);
    dragIndex.current = null;
  }

  // ── Collapsed state ──────────────────────────────────────────────────────────

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-sm"
      >
        <span className="text-lg leading-none">+</span>
        Add task
      </button>
    );
  }

  // ── Loading phase ────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-xs text-slate-400">Breaking it down…</p>
        <div className="space-y-2">
          <SkeletonRow delay={0} />
          <SkeletonRow delay={80} />
          <SkeletonRow delay={160} />
          <SkeletonRow delay={240} />
        </div>
      </div>
    );
  }

  // ── Preview phase ────────────────────────────────────────────────────────────

  if (phase === 'preview') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-sm font-medium text-slate-700 truncate">{title}</p>
        <ul className="space-y-1.5">
          {preview.map((item, i) => (
            <li
              key={item.key}
              draggable
              onDragStart={e => onDragStart(e, i)}
              onDragOver={onDragOver}
              onDrop={e => onDrop(e, i)}
              className="flex items-center gap-2 group rounded-lg bg-slate-50 px-3 py-2 cursor-grab active:cursor-grabbing border border-slate-100"
            >
              <span className="text-slate-300 text-xs select-none">⠿</span>
              <input type="checkbox" disabled className="opacity-40 flex-shrink-0" />
              {item.editing ? (
                <input
                  autoFocus
                  className="flex-1 bg-transparent text-slate-700 text-sm focus:outline-none"
                  value={item.title}
                  onChange={e => setPreview(prev => prev.map((p, j) => j === i ? { ...p, title: e.target.value } : p))}
                  onBlur={() => setPreview(prev => prev.map((p, j) => j === i ? { ...p, editing: false } : p))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === 'Escape')
                      setPreview(prev => prev.map((p, j) => j === i ? { ...p, editing: false } : p));
                  }}
                />
              ) : (
                <span
                  className="flex-1 text-sm text-slate-600 cursor-text truncate"
                  onClick={() => setPreview(prev => prev.map((p, j) => j === i ? { ...p, editing: true } : p))}
                >
                  {item.title}
                </span>
              )}
              <span className="text-xs text-slate-400 flex-shrink-0">{fmt(item.estimatedMinutes)}</span>
              <span className="text-xs text-slate-300 flex-shrink-0">W{item.weekNumber}</span>
              <button
                type="button"
                onClick={() => setPreview(prev => prev.filter((_, j) => j !== i))}
                className="text-slate-300 hover:text-red-400 text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={reset}
            className="text-slate-400 hover:text-slate-600 text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleAddAll}
            disabled={preview.length === 0}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            Add all tasks
          </button>
        </div>
      </div>
    );
  }

  // ── Configure phase ──────────────────────────────────────────────────────────

  if (phase === 'configure') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-sm font-medium text-slate-700 truncate">{title}</p>
        {modules && modules.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Module</label>
            <select
              value={moduleId}
              onChange={e => setModuleId(e.target.value)}
              className="input w-full text-sm"
            >
              <option value="">None</option>
              {modules.map(m => (
                <option key={m._id} value={m._id}>{m.name} — {m.fullName || m.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs text-slate-500">Deadline</label>
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="input w-full text-sm"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={reset}
            className="text-slate-400 hover:text-slate-600 text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleGenerate}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            Generate
          </button>
        </div>
      </div>
    );
  }

  // ── Normal form + optional banner ────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <input
        ref={titleRef}
        value={title}
        onChange={e => { setTitle(e.target.value); setDismissed(false); }}
        placeholder="Task title"
        required
        className="w-full bg-transparent text-slate-700 placeholder-slate-300 text-sm font-medium focus:outline-none"
      />
      <input
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full bg-transparent text-slate-500 placeholder-slate-300 text-sm focus:outline-none"
      />

      {showBanner && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
          <p className="flex-1 text-xs text-blue-600">
            This looks like a big goal. Want me to break it down into smaller tasks?
          </p>
          <button
            type="button"
            onClick={() => setPhase('configure')}
            className="text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 px-2.5 py-1 rounded-md transition-colors flex-shrink-0"
          >
            Break it down
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs text-blue-400 hover:text-blue-600 flex-shrink-0 transition-colors"
          >
            × Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <select
          value={priority}
          onChange={e => setPriority(e.target.value as Priority)}
          className="bg-slate-50 text-slate-500 text-xs rounded px-2 py-1.5 border border-slate-200 focus:outline-none focus:border-blue-400"
        >
          <option value="low">Low</option>
          <option value="med">Medium</option>
          <option value="high">High</option>
        </select>
        <select
          value={status}
          onChange={e => setStatus(e.target.value as TaskStatus)}
          className="bg-slate-50 text-slate-500 text-xs rounded px-2 py-1.5 border border-slate-200 focus:outline-none focus:border-blue-400"
        >
          <option value="todo">Todo</option>
          <option value="doing">Doing</option>
          <option value="done">Done</option>
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="bg-slate-50 text-slate-500 text-xs rounded px-2 py-1.5 border border-slate-200 focus:outline-none focus:border-blue-400"
        />
        <div className="flex-1" />
        <button
          type="button"
          onClick={reset}
          className="text-slate-400 hover:text-slate-600 text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim() || createTask.isPending}
          className="bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
        >
          {createTask.isPending ? 'Adding…' : 'Add'}
        </button>
      </div>
    </form>
  );
}
