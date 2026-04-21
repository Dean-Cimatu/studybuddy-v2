import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateTask, useDeleteTask, TASKS_KEY } from '../hooks/useTasks';
import type { Task, Priority, TaskStatus } from '@studybuddy/shared';

const PRIORITY_STYLES: Record<Priority, string> = {
  high: 'bg-red-50 text-red-600 border-red-200',
  med:  'bg-amber-50 text-amber-600 border-amber-200',
  low:  'bg-emerald-50 text-emerald-600 border-emerald-200',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'High', med: 'Med', low: 'Low',
};

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  todo: 'doing',
  doing: 'done',
  done: 'todo',
};

function StatusCircle({ status, onClick }: { status: TaskStatus; onClick: () => void }) {
  if (status === 'done') {
    return (
      <button
        onMouseDown={e => { e.preventDefault(); onClick(); }}
        className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 hover:bg-emerald-600 transition-colors mt-0.5"
        title="Cycle status"
      >
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </button>
    );
  }
  if (status === 'doing') {
    return (
      <button
        onMouseDown={e => { e.preventDefault(); onClick(); }}
        className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center shrink-0 hover:bg-blue-50 transition-colors mt-0.5"
        title="Cycle status"
      >
        <div className="w-2 h-2 rounded-full bg-blue-500" />
      </button>
    );
  }
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0 hover:border-blue-400 transition-colors mt-0.5"
      title="Cycle status"
    />
  );
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Todo', doing: 'Doing', done: 'Done',
};

interface Props {
  task: Task;
  isExpanded?: boolean;
  onToggle?: () => void;
  moduleColour?: string;
  isSubtask?: boolean;
}

export function TaskCard({ task, isExpanded, onToggle, moduleColour, isSubtask }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const titleRef = useRef<HTMLInputElement>(null);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (editing) titleRef.current?.focus();
  }, [editing]);

  function startEdit() {
    setTitle(task.title);
    setDescription(task.description ?? '');
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit() {
    const trimmed = title.trim();
    if (!trimmed) { cancelEdit(); return; }
    setEditing(false);
    await updateTask.mutateAsync({
      id: task.id,
      input: { title: trimmed, description: description.trim() || undefined },
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void saveEdit(); }
    if (e.key === 'Escape') cancelEdit();
  }

  async function handleStatusChange(status: TaskStatus) {
    if (task.parentId) {
      const prevStatus = task.status;
      queryClient.setQueryData<Task[]>(TASKS_KEY, (old = []) =>
        old.map(t => {
          if (t.id !== task.parentId) return t;
          const wasDone = prevStatus === 'done';
          const nowDone = status === 'done';
          const delta = nowDone && !wasDone ? 1 : !nowDone && wasDone ? -1 : 0;
          return { ...t, completedSubtaskCount: Math.max(0, (t.completedSubtaskCount ?? 0) + delta) };
        })
      );
    }

    await updateTask.mutateAsync({ id: task.id, input: { status } });

    if (task.parentId && status === 'done') {
      const all = queryClient.getQueryData<Task[]>(TASKS_KEY) ?? [];
      const siblings = all.filter(t => t.parentId === task.parentId && t.id !== task.id);
      if (siblings.every(t => t.status === 'done')) {
        await updateTask.mutateAsync({ id: task.parentId, input: { status: 'done' } });
      }
    }
  }

  function cycleStatus() {
    void handleStatusChange(STATUS_CYCLE[task.status]);
  }

  async function handleDelete() {
    await deleteTask.mutateAsync(task.id);
  }

  const isOptimistic = task.id.startsWith('temp-');
  const total = task.subtaskCount ?? 0;
  const completed = task.completedSubtaskCount ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const daysUntilDue = task.dueDate
    ? Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div
      className={`group relative rounded-lg border bg-white transition-all ${
        isOptimistic ? 'opacity-60' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      } ${isSubtask ? 'p-2.5' : 'p-3'}`}
    >
      {editing ? (
        <div className="space-y-2">
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => void saveEdit()}
            className="w-full bg-transparent text-slate-800 text-sm font-medium focus:outline-none border-b border-blue-400 pb-1"
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Description…"
            className="w-full bg-transparent text-slate-500 text-xs focus:outline-none resize-none placeholder-slate-300"
          />
          <div className="flex gap-2 pt-1">
            <button onMouseDown={e => { e.preventDefault(); void saveEdit(); }} className="text-xs text-blue-500 hover:text-blue-600">Save</button>
            <button onMouseDown={e => { e.preventDefault(); cancelEdit(); }} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2.5">
            <StatusCircle status={task.status} onClick={cycleStatus} />

            <div className="flex-1 min-w-0 cursor-pointer" onClick={task.isGoal && onToggle ? onToggle : startEdit}>
              <div className="flex items-center gap-1.5">
                {task.isGoal && onToggle && (
                  <span className="text-slate-400 text-xs flex-shrink-0 select-none">
                    {isExpanded ? '▾' : '▸'}
                  </span>
                )}
                {moduleColour && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: moduleColour }} />
                )}
                <p className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {task.title}
                </p>
              </div>
              {task.description && !task.isGoal && (
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{task.description}</p>
              )}

              {task.isGoal && total > 0 && (
                <div className="mt-1.5">
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{completed}/{total}</p>
                </div>
              )}
            </div>

            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all text-xs shrink-0 mt-0.5"
              aria-label="Delete task"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-1.5 mt-2 flex-wrap pl-7">
            {!isSubtask && (
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${PRIORITY_STYLES[task.priority]}`}>
                {PRIORITY_LABEL[task.priority]}
              </span>
            )}

            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
              task.status === 'done'
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : task.status === 'doing'
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              {STATUS_LABEL[task.status]}
            </span>

            {task.estimatedMinutes != null && (
              <span className="text-xs text-slate-400">~{task.estimatedMinutes}m</span>
            )}

            {daysUntilDue !== null && (
              <span className={`text-xs ml-auto ${daysUntilDue < 0 ? 'text-red-500' : daysUntilDue <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
                {daysUntilDue < 0
                  ? `${Math.abs(daysUntilDue)}d overdue`
                  : daysUntilDue === 0
                  ? 'Due today'
                  : `${daysUntilDue}d left`}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
