import { useTasks } from '../hooks/useTasks';
import { TaskCard } from './TaskCard';
import { TaskCreateForm } from './TaskCreateForm';
import type { Task, TaskStatus } from '@studybuddy/shared';

const COLUMNS: { status: TaskStatus; label: string; accent: string }[] = [
  { status: 'todo',  label: 'Todo',  accent: 'bg-gray-500' },
  { status: 'doing', label: 'Doing', accent: 'bg-indigo-500' },
  { status: 'done',  label: 'Done',  accent: 'bg-emerald-500' },
];

export function TaskList() {
  const { data: tasks = [], isLoading, isError } = useTasks();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
        Loading tasks…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-40 text-red-400 text-sm">
        Failed to load tasks. Try refreshing.
      </div>
    );
  }

  const byStatus = (status: TaskStatus): Task[] =>
    tasks.filter(t => t.status === status);

  return (
    <div className="space-y-8">
      {COLUMNS.map(({ status, label, accent }) => {
        const group = byStatus(status);
        return (
          <section key={status}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${accent}`} />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {label}
              </h2>
              <span className="text-xs text-gray-600 ml-1">{group.length}</span>
            </div>

            <div className="space-y-2">
              {group.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
              {group.length === 0 && (
                <p className="text-xs text-gray-700 px-1 py-2">No tasks here yet.</p>
              )}
            </div>
          </section>
        );
      })}

      <div className="pt-2">
        <TaskCreateForm />
      </div>
    </div>
  );
}
