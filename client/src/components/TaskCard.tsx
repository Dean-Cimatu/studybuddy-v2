import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useUpdateTask, useDeleteTask } from '../hooks/useTasks';
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
}

export function TaskCard({ task }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const titleRef = useRef<HTMLInputElement>(null);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

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
    await updateTask.mutateAsync({ id: task.id, input: { status } });
  }

  async function handleDelete() {
    await deleteTask.mutateAsync(task.id);
  }

  const isOptimistic = task.id.startsWith('temp-');

  return (
    <div
      className={`group relative rounded-xl border bg-gray-900 p-4 transition-all ${
        isOptimistic ? 'opacity-60' : 'border-gray-800 hover:border-gray-700'
      }`}
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
            <button
              onMouseDown={e => { e.preventDefault(); void saveEdit(); }}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Save
            </button>
            <button
              onMouseDown={e => { e.preventDefault(); cancelEdit(); }}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={startEdit}>
              <p className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-gray-500' : 'text-white'}`}>
                {task.title}
              </p>
              {task.description && (
                <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
                  {task.description}
                </p>
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
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_STYLES[task.priority]}`}>
              {PRIORITY_LABEL[task.priority]}
            </span>

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

            {task.estimatedMinutes && (
              <span className="text-xs text-gray-600">
                ~{task.estimatedMinutes}m
              </span>
            )}
            {task.dueDate && (
              <span className="text-xs text-gray-600 ml-auto">
                Due {task.dueDate}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
