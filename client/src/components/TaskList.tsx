import { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useModules } from '../hooks/useModules';
import { TaskCard } from './TaskCard';
import { TaskCreateForm } from './TaskCreateForm';
import type { Task, TaskStatus } from '@studybuddy/shared';

const COLUMNS: { status: TaskStatus; label: string; accent: string }[] = [
  { status: 'todo',  label: 'Todo',  accent: 'bg-slate-400' },
  { status: 'doing', label: 'Doing', accent: 'bg-indigo-500' },
  { status: 'done',  label: 'Done',  accent: 'bg-emerald-500' },
];

type SortKey = 'default' | 'priority' | 'due';
type StatusFilter = 'all' | TaskStatus;

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function sortTasks(tasks: Task[], sort: SortKey): Task[] {
  if (sort === 'priority') {
    return [...tasks].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority ?? 'low'] ?? 3;
      const pb = PRIORITY_ORDER[b.priority ?? 'low'] ?? 3;
      return pa - pb;
    });
  }
  if (sort === 'due') {
    return [...tasks].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }
  return tasks;
}

export function TaskList() {
  const { data: tasks = [], isLoading, isError } = useTasks();
  const { data: modules = [] } = useModules();
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('default');

  const moduleColours = new Map(modules.map(m => [m._id, m.colour]));

  function toggleGoal(id: string) {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-40 text-slate-500 text-sm">Loading tasks…</div>;
  }

  if (isError) {
    return <div className="flex items-center justify-center h-40 text-red-400 text-sm">Failed to load tasks. Try refreshing.</div>;
  }

  const filteredTasks = tasks.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (moduleFilter !== 'all' && t.moduleId !== moduleFilter) return false;
    return true;
  });

  const sortedTasks = sortTasks(filteredTasks, sortBy);

  const activeColumns = statusFilter === 'all'
    ? COLUMNS
    : COLUMNS.filter(c => c.status === statusFilter);

  const hasFilters = statusFilter !== 'all' || moduleFilter !== 'all' || sortBy !== 'default';

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status filter pills */}
        <div className="flex gap-1">
          {(['all', 'todo', 'doing', 'done'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                statusFilter === s
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Module filter */}
        {modules.length > 0 && (
          <select
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:border-blue-400"
          >
            <option value="all">All modules</option>
            {modules.map(m => (
              <option key={m._id} value={m._id}>{m.name}</option>
            ))}
          </select>
        )}

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:border-blue-400"
        >
          <option value="default">Default order</option>
          <option value="priority">By priority</option>
          <option value="due">By due date</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => { setStatusFilter('all'); setModuleFilter('all'); setSortBy('default'); }}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Columns */}
      <div className="space-y-8">
        {activeColumns.map(({ status, label, accent }) => {
          const goals = sortedTasks.filter(t => t.isGoal && t.status === status);
          const flatTasks = sortedTasks.filter(t => !t.isGoal && t.parentId === null && t.status === status);
          const count = goals.length + flatTasks.length;

          return (
            <section key={status}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${accent}`} />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</h2>
                <span className="text-xs text-slate-500 ml-1">{count}</span>
              </div>

              <div className="space-y-2">
                {goals.map(goal => {
                  const isExpanded = expandedGoals.has(goal.id);
                  const subtasks = tasks.filter(t => t.parentId === goal.id);
                  return (
                    <div key={goal.id}>
                      <TaskCard
                        task={goal}
                        isExpanded={isExpanded}
                        onToggle={() => toggleGoal(goal.id)}
                        moduleColour={goal.moduleId ? moduleColours.get(goal.moduleId) : undefined}
                      />
                      {isExpanded && subtasks.length > 0 && (
                        <div className="ml-4 mt-1.5 border-l-2 border-slate-200 pl-3 space-y-1.5">
                          {subtasks.map(sub => <TaskCard key={sub.id} task={sub} isSubtask />)}
                        </div>
                      )}
                    </div>
                  );
                })}

                {flatTasks.map(task => (
                  <TaskCard key={task.id} task={task} moduleColour={task.moduleId ? moduleColours.get(task.moduleId) : undefined} />
                ))}

                {count === 0 && (
                  <p className="text-xs text-slate-400 px-1 py-2">No tasks here yet.</p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="pt-2">
        <TaskCreateForm />
      </div>
    </div>
  );
}
