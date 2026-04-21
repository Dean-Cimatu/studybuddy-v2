import { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useModules } from '../hooks/useModules';
import { TaskCard } from './TaskCard';
import { TaskCreateForm } from './TaskCreateForm';
import type { TaskStatus } from '@studybuddy/shared';

const COLUMNS: { status: TaskStatus; label: string; accent: string }[] = [
  { status: 'todo',  label: 'Todo',  accent: 'bg-slate-400' },
  { status: 'doing', label: 'Doing', accent: 'bg-indigo-500' },
  { status: 'done',  label: 'Done',  accent: 'bg-emerald-500' },
];

export function TaskList() {
  const { data: tasks = [], isLoading, isError } = useTasks();
  const { data: modules = [] } = useModules();
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const moduleColours = new Map(modules.map(m => [m._id, m.colour]));

  function toggleGoal(id: string) {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
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

  return (
    <div className="space-y-8">
      {COLUMNS.map(({ status, label, accent }) => {
        const goals = tasks.filter(t => t.isGoal && t.status === status);
        const flatTasks = tasks.filter(t => !t.isGoal && t.parentId === null && t.status === status);
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
                        {subtasks.map(sub => (
                          <TaskCard key={sub.id} task={sub} isSubtask />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {flatTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}

              {count === 0 && (
                <p className="text-xs text-slate-400 px-1 py-2">No tasks here yet.</p>
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
