import { useState, FormEvent, useRef, useEffect } from 'react';
import { useCreateTask } from '../hooks/useTasks';
import type { Priority, TaskStatus } from '@studybuddy/shared';

export function TaskCreateForm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('med');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const titleRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();

  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  function reset() {
    setTitle('');
    setDescription('');
    setPriority('med');
    setStatus('todo');
    setOpen(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createTask.mutateAsync({ title: title.trim(), description: description.trim() || undefined, priority, status });
    reset();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-gray-700 text-gray-500 hover:border-indigo-500 hover:text-indigo-400 transition-colors text-sm"
      >
        <span className="text-lg leading-none">+</span>
        Add task
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-indigo-500/50 bg-gray-900 p-4 space-y-3"
    >
      <input
        ref={titleRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Task title"
        required
        className="w-full bg-transparent text-white placeholder-gray-500 text-sm font-medium focus:outline-none"
      />
      <input
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full bg-transparent text-gray-400 placeholder-gray-600 text-sm focus:outline-none"
      />
      <div className="flex items-center gap-2 pt-1">
        <select
          value={priority}
          onChange={e => setPriority(e.target.value as Priority)}
          className="bg-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-indigo-500"
        >
          <option value="low">Low</option>
          <option value="med">Medium</option>
          <option value="high">High</option>
        </select>
        <select
          value={status}
          onChange={e => setStatus(e.target.value as TaskStatus)}
          className="bg-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-indigo-500"
        >
          <option value="todo">Todo</option>
          <option value="doing">Doing</option>
          <option value="done">Done</option>
        </select>
        <div className="flex-1" />
        <button
          type="button"
          onClick={reset}
          className="text-gray-500 hover:text-gray-300 text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim() || createTask.isPending}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
        >
          {createTask.isPending ? 'Adding…' : 'Add'}
        </button>
      </div>
    </form>
  );
}
