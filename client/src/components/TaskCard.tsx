import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateTask, useDeleteTask, TASKS_KEY } from '../hooks/useTasks';
import type { Task, Priority, TaskStatus } from '@studybuddy/shared';

const PRIORITY_STYLES: Record<Priority, string> = {
  high: 'bg-red-500/15 text-red-400 border-red-500/30',
  med:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'High', med: 'Med', low: 'Low',
};

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo',  label: 'Todo'  },
  { value: 'doing', label: 'Doing' },
  { value: 'done',  label: 'Done'  },
];

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
    // Optimistically update parent goal's completedSubtaskCount
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

    // Auto-complete parent goal if all subtasks are now done
    if (task.parentId && status === 'done') {
      const all = queryClient.getQueryData<Task[]>(TASKS_KEY) ?? [];
      const siblings = all.filter(t => t.parentId === task.parentId && t.id !== task.id);
      if (siblings.every(t => t.status === 'done')) {
        await updateTask.mutateAsync({ id: task.parentId, input: { status: 'done' } });
      }
    }
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
      className={`group relative rounded-xl border bg-gray-900 transition-all ${
        isOptimistic ? 'opacity-60' : 'border-gray-800 hover:border-gray-700'
      } ${isSubtask ? 'p-3' : 'p-4'}`}
    >
      {editing ? (
        <div className="space-y-2">
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => void saveEdit()}
            className="w-full bg-transparent text-white text-sm font-medium focus:outline-none border-b border-indigo-500 pb-1"
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Description…"
            className="w-full bg-transparent text-gray-400 text-xs focus:outline-none resize-none placeholder-gray-600"
          />
          <div className="flex gap-2 pt-1">
            <button onMouseDown={e => { e.preventDefault(); void saveEdit(); }} className="text-xs text-indigo-400 hover:text-indigo-300">Save</button>
            <button onMouseDown={e => { e.preventDefault(); cancelEdit(); }} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={task.isGoal && onToggle ? onToggle : startEdit}>
              <div className="flex items-center gap-2">
                {task.isGoal && onToggle && (
                  <span className="text-gray-500 text-xs flex-shrink-0 select-none">
                    {isExpanded ? '▾' : '▸'}
                  </span>
                )}
                {moduleColour && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: moduleColour }} />
                )}
                <p className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-gray-500' : 'text-white'}`}>
                  {task.title}
                </p>
              </div>
              {task.description && !task.isGoal && (
                <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{task.description}</p>
              )}

              {task.isGoal && total > 0 && (
                <div className="mt-2">
                  <div className="h-2 w-full rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{completed}/{total} tasks</p>
                </div>
              )}
            </div>

            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all text-sm shrink-0 mt-0.5"
              aria-label="Delete task"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {!isSubtask && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_STYLES[task.priority]}`}>
                {PRIORITY_LABEL[task.priority]}
              </span>
            )}

            <select
              value={task.status}
              onChange={e => void handleStatusChange(e.target.value as TaskStatus)}
              onClick={e => e.stopPropagation()}
              className="bg-gray-800 text-gray-400 text-xs rounded-lg px-2 py-1 border border-gray-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {task.estimatedMinutes != null && (
              <span className="text-xs text-gray-600">~{task.estimatedMinutes}m</span>
            )}

            {daysUntilDue !== null && (
              <span className={`text-xs ml-auto ${daysUntilDue < 0 ? 'text-red-400' : daysUntilDue <= 3 ? 'text-amber-400' : 'text-gray-600'}`}>
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
