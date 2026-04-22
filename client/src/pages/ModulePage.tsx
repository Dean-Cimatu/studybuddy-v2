import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { ModuleDeadline, ModuleResource, TopicConfidence } from '@studybuddy/shared';
import {
  useModules,
  useUpdateModule,
  useDeleteModule,
  useAddDeadline,
  useUpdateDeadline,
  useDeleteDeadline,
  useUpdateTopicProgress,
  useAddResource,
  useDeleteResource,
  useCommunityModule,
  type CreateDeadlineInput,
  type CreateResourceInput,
} from '../hooks/useModules';

const CONFIDENCE_CYCLE: Record<TopicConfidence, TopicConfidence> = {
  'not-started': 'in-progress',
  'in-progress': 'confident',
  'confident': 'not-started',
};

const CONFIDENCE_STYLE: Record<TopicConfidence, string> = {
  'not-started': 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600',
  'in-progress': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  'confident': 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
};

const CONFIDENCE_LABEL: Record<TopicConfidence, string> = {
  'not-started': '○ Not started',
  'in-progress': '◑ In progress',
  'confident': '● Confident',
};

const DEADLINE_TYPES = ['exam', 'coursework', 'presentation', 'lab', 'other'] as const;

const RESOURCE_TYPES: { value: ModuleResource['type']; label: string; icon: string }[] = [
  { value: 'youtube', label: 'YouTube', icon: '▶' },
  { value: 'url', label: 'Link', icon: '🔗' },
  { value: 'pdf', label: 'PDF', icon: '📄' },
  { value: 'book', label: 'Book', icon: '📚' },
  { value: 'note', label: 'Note', icon: '📝' },
];

function resourceIcon(type: ModuleResource['type']) {
  return RESOURCE_TYPES.find(r => r.value === type)?.icon ?? '🔗';
}

function typeBadge(type: string) {
  const map: Record<string, string> = {
    exam: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    coursework: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    presentation: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    lab: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    other: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  };
  const labels: Record<string, string> = {
    exam: 'Exam', coursework: 'CW', presentation: 'Pres', lab: 'Lab', other: 'Other',
  };
  return { cls: map[type] ?? map.other, label: labels[type] ?? type };
}

const inputCls = 'w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400';

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function DeadlineItem({ moduleId, deadline }: { moduleId: string; deadline: ModuleDeadline }) {
  const updateDeadline = useUpdateDeadline();
  const deleteDeadline = useDeleteDeadline();
  const { cls, label } = typeBadge(deadline.type);
  const date = new Date(deadline.date);
  const isPast = date < new Date();
  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-lg border group ${deadline.completed ? 'opacity-50 border-slate-200 dark:border-slate-700' : isPast ? 'border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700'}`}>
      <span className={`text-xs font-medium rounded px-1.5 py-0.5 shrink-0 ${cls}`}>{label}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${deadline.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{deadline.title}</p>
        <p className="text-xs text-slate-400">
          {date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          {deadline.weight != null && ` · ${deadline.weight}%`}
          {deadline.format && ` · ${deadline.format}`}
        </p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!deadline.completed && (
          <button
            className="text-xs text-slate-400 hover:text-emerald-600 px-2 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
            onClick={() => updateDeadline.mutate({ moduleId, deadlineId: deadline._id, input: { completed: true } })}
          >
            Done
          </button>
        )}
        <button
          className="text-xs text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          onClick={() => deleteDeadline.mutate({ moduleId, deadlineId: deadline._id })}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function AddDeadlineForm({ moduleId, onClose }: { moduleId: string; onClose: () => void }) {
  const addDeadline = useAddDeadline();
  const [form, setForm] = useState({ title: '', date: '', type: 'exam' as typeof DEADLINE_TYPES[number], weight: '', format: '' });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    const input: CreateDeadlineInput = {
      title: form.title.trim(),
      date: new Date(form.date).toISOString(),
      type: form.type,
      weight: form.weight ? Number(form.weight) : undefined,
      format: form.format.trim() || undefined,
    };
    addDeadline.mutate({ moduleId, input }, { onSuccess: onClose });
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
      <div className="flex gap-2">
        <input className={inputCls} placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        <select className={`w-36 shrink-0 ${inputCls}`} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as typeof DEADLINE_TYPES[number] }))}>
          {DEADLINE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <input type="datetime-local" className={inputCls} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
        <input type="number" className={`w-28 shrink-0 ${inputCls}`} placeholder="Weight %" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} min={0} max={100} />
        <input className={inputCls} placeholder="Format" value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))} />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary text-sm" disabled={addDeadline.isPending}>
          {addDeadline.isPending ? 'Saving…' : 'Add Deadline'}
        </button>
      </div>
    </form>
  );
}

function ResourceItem({ moduleId, resource, community }: { moduleId: string; resource: ModuleResource; community?: boolean }) {
  const deleteResource = useDeleteResource();
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 group hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      <span className="text-base shrink-0">{resourceIcon(resource.type)}</span>
      <div className="flex-1 min-w-0">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
        >
          {resource.title}
        </a>
        <p className="text-xs text-slate-400 capitalize">{resource.type}</p>
      </div>
      {!community && (
        <button
          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
          onClick={() => deleteResource.mutate({ moduleId, resourceId: resource._id })}
          title="Remove resource"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function AddResourceForm({ moduleId, onClose }: { moduleId: string; onClose: () => void }) {
  const addResource = useAddResource();
  const [form, setForm] = useState<{ type: ModuleResource['type']; title: string; url: string }>({
    type: 'url', title: '', url: '',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) return;
    const input: CreateResourceInput = { type: form.type, title: form.title.trim(), url: form.url.trim() };
    addResource.mutate({ moduleId, input }, { onSuccess: onClose });
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
      <div className="flex gap-2">
        <select className={`w-36 shrink-0 ${inputCls}`} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ModuleResource['type'] }))}>
          {RESOURCE_TYPES.map(r => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
        </select>
        <input className={inputCls} placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} maxLength={200} required />
      </div>
      <input className={inputCls} placeholder="URL *" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} maxLength={2000} required />
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary text-sm" disabled={addResource.isPending}>
          {addResource.isPending ? 'Saving…' : 'Add Resource'}
        </button>
      </div>
    </form>
  );
}

function CommunitySection({ university, code, moduleId }: { university: string; code: string; moduleId: string }) {
  const { data, isLoading } = useCommunityModule(university, code);

  if (isLoading) {
    return (
      <div className="card-base p-5">
        <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse w-32 mb-3" />
        <div className="space-y-2">
          <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data || data.contributorCount === 0) {
    return (
      <div className="card-base p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">Community</h2>
        <p className="text-xs text-slate-400">
          No one else is sharing {code} at {university} yet.
          Enable sharing below to be the first contributor.
        </p>
      </div>
    );
  }

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Community</h2>
        <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 px-2 py-0.5 rounded-full font-medium">
          {data.contributorCount} contributor{data.contributorCount !== 1 ? 's' : ''}
        </span>
      </div>

      {data.topics.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Topics covered by the community</p>
          <div className="flex flex-wrap gap-1.5">
            {data.topics.map(t => (
              <span key={t} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.resources.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Shared resources</p>
          <div className="space-y-2">
            {data.resources.map((r, i) => (
              <ResourceItem key={i} moduleId={moduleId} resource={r} community />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ModulePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: modules = [], isLoading } = useModules();
  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();
  const updateTopicProgress = useUpdateTopicProgress();

  const module = modules.find(m => m._id === id);

  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [showAddDeadline, setShowAddDeadline] = useState(false);
  const [showAddResource, setShowAddResource] = useState(false);

  useEffect(() => {
    if (module) {
      setNotes(module.notes ?? '');
      setNotesDirty(false);
    }
  }, [module?._id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-3">
        <p className="text-slate-500">Module not found.</p>
        <Link to="/modules" className="btn-primary text-sm">Back to Modules</Link>
      </div>
    );
  }

  const activeDeadlines = module.deadlines.filter(d => !d.completed).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const completedDeadlines = module.deadlines.filter(d => d.completed);
  const hasCommunity = !!(module.university && module.name);

  function saveNotes() {
    updateModule.mutate({ id: module!._id, input: { notes } }, {
      onSuccess: () => setNotesDirty(false),
    });
  }

  function toggleShare() {
    updateModule.mutate({ id: module!._id, input: { shareWithCommunity: !module!.shareWithCommunity } });
  }

  function handleDelete() {
    if (!confirm(`Delete ${module!.name} permanently?`)) return;
    deleteModule.mutate(module!._id, { onSuccess: () => navigate('/modules') });
  }

  const topicProgressMap = module.topicProgress as Record<string, TopicConfidence>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-3 flex items-center gap-3">
        <Link
          to="/modules"
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: module.colour }} />
          <div className="min-w-0">
            <h1 className="font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">{module.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {module.fullName && <span className="text-xs text-slate-400 truncate">{module.fullName}</span>}
              {module.university && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  {module.fullName && <span className="text-slate-300 dark:text-slate-600">·</span>}
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0-6l-3.5-1.944M12 20l-3.5-1.944M12 20l3.5-1.944" />
                  </svg>
                  {module.university}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Share toggle */}
          {module.university && (
            <button
              onClick={toggleShare}
              className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                module.shareWithCommunity
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400'
              }`}
              title={module.shareWithCommunity ? 'Sharing with community — click to stop' : 'Share resources with classmates'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {module.shareWithCommunity ? 'Sharing' : 'Share'}
            </button>
          )}
          <span className="hidden sm:block text-xs text-slate-400">{module.weeklyTargetHours}h/wk</span>
          <button
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            onClick={handleDelete}
            title="Delete module"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 md:px-6 py-6 max-w-5xl mx-auto w-full">
        {/* No university prompt */}
        {!module.university && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Add your university to this module to connect with classmates studying the same course.
            <Link to="/modules" className="underline font-medium ml-auto shrink-0">Edit module</Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left column: Topics + Notes + Community */}
          <div className="lg:col-span-2 space-y-5">

            {/* Topics */}
            {module.topics && module.topics.length > 0 && (
              <Section title="Topics">
                <div className="space-y-2">
                  {module.topics.map(topic => {
                    const confidence = (topicProgressMap[topic] ?? 'not-started') as TopicConfidence;
                    return (
                      <div key={topic} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-700 dark:text-slate-200">{topic}</span>
                        <button
                          onClick={() => updateTopicProgress.mutate({ moduleId: module._id, topic, confidence: CONFIDENCE_CYCLE[confidence] })}
                          className={`text-xs rounded-full px-2.5 py-1 border font-medium transition-colors hover:opacity-80 whitespace-nowrap ${CONFIDENCE_STYLE[confidence]}`}
                        >
                          {CONFIDENCE_LABEL[confidence]}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex gap-4 text-xs text-slate-400">
                  {(['not-started', 'in-progress', 'confident'] as TopicConfidence[]).map(c => {
                    const count = module.topics.filter(t => (topicProgressMap[t] ?? 'not-started') === c).length;
                    return (
                      <span key={c}>{CONFIDENCE_LABEL[c].split(' ')[1]} {count}</span>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Notes */}
            <Section title="Notes">
              <textarea
                className={`${inputCls} resize-none font-mono text-xs`}
                rows={10}
                placeholder="Add notes, key concepts, formulas, lecture summaries…&#10;&#10;Everything you add here helps generate more accurate flashcards and study guides for this module."
                value={notes}
                onChange={e => { setNotes(e.target.value); setNotesDirty(true); }}
                maxLength={2000}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400">{notes.length}/2000</span>
                <button
                  className="btn-primary text-sm"
                  onClick={saveNotes}
                  disabled={!notesDirty || updateModule.isPending}
                >
                  {updateModule.isPending ? 'Saving…' : 'Save Notes'}
                </button>
              </div>
            </Section>

            {/* Community */}
            {hasCommunity && (
              <CommunitySection university={module.university} code={module.name} moduleId={module._id} />
            )}

            {/* Mobile share toggle */}
            {module.university && (
              <div className="sm:hidden card-base p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Share with classmates</p>
                  <p className="text-xs text-slate-400 mt-0.5">Let others at {module.university} see your resources</p>
                </div>
                <button
                  onClick={toggleShare}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${module.shareWithCommunity ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${module.shareWithCommunity ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            )}

          </div>

          {/* Right column: Deadlines + Resources */}
          <div className="space-y-5">

            {/* Deadlines */}
            <Section
              title="Deadlines"
              action={
                <button
                  onClick={() => setShowAddDeadline(v => !v)}
                  className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                >
                  + Add
                </button>
              }
            >
              {activeDeadlines.length === 0 && !showAddDeadline && (
                <p className="text-xs text-slate-400">No upcoming deadlines.</p>
              )}
              <div className="space-y-2">
                {activeDeadlines.map(d => (
                  <DeadlineItem key={d._id} moduleId={module._id} deadline={d} />
                ))}
              </div>

              {showAddDeadline && (
                <AddDeadlineForm moduleId={module._id} onClose={() => setShowAddDeadline(false)} />
              )}

              {completedDeadlines.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-slate-400 mb-1.5">{completedDeadlines.length} completed</p>
                  <div className="space-y-1.5">
                    {completedDeadlines.map(d => (
                      <DeadlineItem key={d._id} moduleId={module._id} deadline={d} />
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* Resources */}
            <Section
              title="My Resources"
              action={
                <button
                  onClick={() => setShowAddResource(v => !v)}
                  className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                >
                  + Add
                </button>
              }
            >
              {module.resources.length === 0 && !showAddResource && (
                <p className="text-xs text-slate-400">Add lecture slides, YouTube videos, textbook chapters…</p>
              )}
              <div className="space-y-2">
                {module.resources.map(r => (
                  <ResourceItem key={r._id} moduleId={module._id} resource={r} />
                ))}
              </div>

              {showAddResource && (
                <AddResourceForm moduleId={module._id} onClose={() => setShowAddResource(false)} />
              )}
            </Section>

            {/* Desktop share toggle card */}
            {module.university && (
              <div className="hidden sm:block card-base p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Share with classmates</p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {module.shareWithCommunity
                        ? `Your resources are visible to others studying ${module.name} at ${module.university}.`
                        : `Enable to let others studying ${module.name} at ${module.university} see your resources.`}
                    </p>
                  </div>
                  <button
                    onClick={toggleShare}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${module.shareWithCommunity ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${module.shareWithCommunity ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
