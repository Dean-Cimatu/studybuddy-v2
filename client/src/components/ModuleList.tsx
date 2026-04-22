import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Module, ModuleDeadline } from '@studybuddy/shared';
import {
  useModules,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  useAddDeadline,
  useUpdateDeadline,
  useDeleteDeadline,
  useUpdateTopicProgress,
  type CreateModuleInput,
  type CreateDeadlineInput,
} from '../hooks/useModules';
import type { TopicConfidence } from '@studybuddy/shared';
import { DeadlineCountdown } from './DeadlineCountdown';

const PRESET_COLOURS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Turkish' },
  { value: 'ru', label: 'Russian' },
  { value: 'de', label: 'German' },
  { value: 'ar', label: 'Arabic' },
  { value: 'other', label: 'Other' },
];

const DEADLINE_TYPES = ['exam', 'coursework', 'presentation', 'lab', 'other'] as const;

function typeBadge(type: string) {
  const map: Record<string, string> = {
    exam: 'bg-red-50 text-red-600',
    coursework: 'bg-blue-50 text-blue-600',
    presentation: 'bg-purple-50 text-purple-600',
    lab: 'bg-green-50 text-green-600',
    other: 'bg-slate-100 text-slate-600',
  };
  const labels: Record<string, string> = {
    exam: 'Exam', coursework: 'CW', presentation: 'Pres', lab: 'Lab', other: 'Other',
  };
  return { cls: map[type] ?? map.other, label: labels[type] ?? type };
}

interface ModuleFormState {
  name: string;
  fullName: string;
  colour: string;
  language: string;
  university: string;
  weeklyTargetHours: string;
  topics: string;
}

const defaultForm: ModuleFormState = {
  name: '', fullName: '', colour: '#3B82F6', language: 'en', university: '', weeklyTargetHours: '3', topics: '',
};

interface DeadlineFormState {
  title: string;
  date: string;
  type: typeof DEADLINE_TYPES[number];
  weight: string;
  format: string;
}

const defaultDeadlineForm: DeadlineFormState = {
  title: '', date: '', type: 'exam', weight: '', format: '',
};

function moduleToForm(mod: Module): ModuleFormState {
  return {
    name: mod.name,
    fullName: mod.fullName ?? '',
    colour: mod.colour,
    language: mod.language ?? 'en',
    university: mod.university ?? '',
    weeklyTargetHours: String(mod.weeklyTargetHours ?? 3),
    topics: (mod.topics ?? []).join('\n'),
  };
}

function ModuleModal({
  initialModule,
  onClose,
  onSave,
  saving,
}: {
  initialModule?: Module;
  onClose: () => void;
  onSave: (input: CreateModuleInput) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ModuleFormState>(
    initialModule ? moduleToForm(initialModule) : defaultForm
  );
  const isEdit = !!initialModule;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const input: CreateModuleInput = {
      name: form.name.trim(),
      fullName: form.fullName.trim() || undefined,
      colour: form.colour,
      language: form.language,
      university: form.university.trim() || undefined,
      weeklyTargetHours: form.weeklyTargetHours ? Number(form.weeklyTargetHours) : undefined,
      topics: form.topics ? form.topics.split('\n').map(t => t.trim()).filter(Boolean) : undefined,
    };
    onSave(input);
  }

  const inputCls = 'w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          {isEdit ? 'Edit Module' : 'Add Module'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className={inputCls}
            placeholder="Module code (e.g. CST2555) *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            maxLength={50}
            required
          />
          <input
            className={inputCls}
            placeholder="Full name (e.g. Operating Systems)"
            value={form.fullName}
            onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
            maxLength={100}
          />
          <input
            className={inputCls}
            placeholder="University (e.g. University of London)"
            value={form.university}
            onChange={e => setForm(f => ({ ...f, university: e.target.value }))}
            maxLength={120}
          />
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Colour</p>
            <div className="flex gap-2">
              {PRESET_COLOURS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${form.colour === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setForm(f => ({ ...f, colour: c }))}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className={`flex-1 ${inputCls}`}
              value={form.language}
              onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
            >
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <label className="flex flex-col gap-1 w-28">
              <span className="text-xs text-slate-400">hrs / week</span>
              <input
                type="number"
                className={inputCls}
                value={form.weeklyTargetHours}
                onChange={e => setForm(f => ({ ...f, weeklyTargetHours: e.target.value }))}
                min={0}
                max={40}
              />
            </label>
          </div>
          <textarea
            className={`${inputCls} resize-none`}
            placeholder="Topics (one per line)"
            rows={3}
            value={form.topics}
            onChange={e => setForm(f => ({ ...f, topics: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Module'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeadlineModal({ moduleId, onClose }: { moduleId: string; onClose: () => void }) {
  const [form, setForm] = useState<DeadlineFormState>(defaultDeadlineForm);
  const addDeadline = useAddDeadline();

  const inputCls = 'w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400';

  function handleSubmit(e: React.FormEvent) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Add Deadline</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className={inputCls} placeholder="Title (e.g. Final Exam) *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <input type="datetime-local" className={inputCls} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
          <select className={inputCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as typeof DEADLINE_TYPES[number] }))}>
            {DEADLINE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="number" className={`flex-1 ${inputCls}`} placeholder="Weight % (optional)" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} min={0} max={100} />
            <input className={`flex-1 ${inputCls}`} placeholder="Format (optional)" value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={addDeadline.isPending}>
              {addDeadline.isPending ? 'Saving…' : 'Add Deadline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const CONFIDENCE_CYCLE: Record<TopicConfidence, TopicConfidence> = {
  'not-started': 'in-progress',
  'in-progress': 'confident',
  'confident': 'not-started',
};

const CONFIDENCE_STYLE: Record<TopicConfidence, string> = {
  'not-started': 'bg-slate-100 text-slate-500 border-slate-200',
  'in-progress': 'bg-amber-50 text-amber-700 border-amber-200',
  'confident': 'bg-emerald-50 text-emerald-700 border-emerald-300',
};

const CONFIDENCE_LABEL: Record<TopicConfidence, string> = {
  'not-started': '○',
  'in-progress': '◑',
  'confident': '●',
};

function TopicChip({ moduleId, topic, progress }: { moduleId: string; topic: string; progress: TopicConfidence }) {
  const update = useUpdateTopicProgress();
  return (
    <button
      onClick={() => update.mutate({ moduleId, topic, confidence: CONFIDENCE_CYCLE[progress] })}
      title={progress.replace('-', ' ')}
      className={`text-xs rounded-full px-2 py-0.5 border flex items-center gap-1 transition-colors hover:opacity-80 ${CONFIDENCE_STYLE[progress]}`}
    >
      <span>{CONFIDENCE_LABEL[progress]}</span>
      <span>{topic}</span>
    </button>
  );
}

function ModuleCard({ module }: { module: Module }) {
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [showEditModal, setShowEditModal]         = useState(false);
  const updateModule  = useUpdateModule();
  const deleteModule  = useDeleteModule();
  const updateDeadline = useUpdateDeadline();
  const deleteDeadline = useDeleteDeadline();

  return (
    <div className="card-base pl-5 p-4 relative group overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: module.colour }} />
      {/* Action buttons — visible on hover */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          onClick={() => setShowEditModal(true)}
          title="Edit module"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
          onClick={() => updateModule.mutate({ id: module._id, input: { archived: true } })}
          title="Archive module"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </button>
        <button
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          onClick={() => { if (confirm(`Delete ${module.name}?`)) deleteModule.mutate(module._id); }}
          title="Delete module"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="pr-20">
        <Link
          to={`/modules/${module._id}`}
          className="font-semibold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          {module.name}
        </Link>
        {module.fullName && <p className="text-sm text-slate-500 dark:text-slate-400">{module.fullName}</p>}
        {module.university && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0-6l-3.5-1.944M12 20l-3.5-1.944M12 20l3.5-1.944" />
            </svg>
            {module.university}
          </p>
        )}
      </div>

      {module.topics && module.topics.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-slate-400 mb-1.5">Topics — click to update confidence</p>
          <div className="flex flex-wrap gap-1">
            {module.topics.map(topic => {
              const progress = (module.topicProgress?.[topic] ?? 'not-started') as TopicConfidence;
              return <TopicChip key={topic} moduleId={module._id} topic={topic} progress={progress} />;
            })}
          </div>
        </div>
      )}

      {module.deadlines && module.deadlines.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {(module.deadlines as ModuleDeadline[]).map(dl => {
            const { cls, label } = typeBadge(dl.type);
            return (
              <li key={dl._id} className="flex items-center gap-2 group/dl">
                <span className={`text-xs font-medium rounded px-1.5 py-0.5 ${cls}`}>{label}</span>
                <span className="text-sm text-slate-700 dark:text-slate-200 flex-1">{dl.title}</span>
                <DeadlineCountdown date={dl.date} completed={dl.completed} />
                <div className="flex gap-1 opacity-0 group-hover/dl:opacity-100 transition-opacity">
                  {!dl.completed && (
                    <button className="text-xs text-slate-400 hover:text-green-600" onClick={() => updateDeadline.mutate({ moduleId: module._id, deadlineId: dl._id, input: { completed: true } })} title="Mark completed">✓</button>
                  )}
                  <button className="text-xs text-slate-400 hover:text-red-500" onClick={() => deleteDeadline.mutate({ moduleId: module._id, deadlineId: dl._id })} title="Remove">×</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button className="mt-3 text-xs text-blue-500 hover:text-blue-700 hover:underline" onClick={() => setShowDeadlineModal(true)}>
        + Add deadline
      </button>

      {showDeadlineModal && <DeadlineModal moduleId={module._id} onClose={() => setShowDeadlineModal(false)} />}

      {showEditModal && (
        <ModuleModal
          initialModule={module}
          onClose={() => setShowEditModal(false)}
          onSave={input => updateModule.mutate({ id: module._id, input }, { onSuccess: () => setShowEditModal(false) })}
          saving={updateModule.isPending}
        />
      )}
    </div>
  );
}

function ArchivedModuleRow({ module }: { module: Module }) {
  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 opacity-60">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: module.colour }} />
      <span className="text-sm text-slate-600 dark:text-slate-300 flex-1">{module.name}</span>
      {module.fullName && <span className="text-xs text-slate-400 hidden sm:block">{module.fullName}</span>}
      <button
        className="text-xs text-slate-400 hover:text-blue-500 transition-colors px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600"
        onClick={() => updateModule.mutate({ id: module._id, input: { archived: false } })}
        title="Restore module"
      >
        Restore
      </button>
      <button
        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
        onClick={() => { if (confirm(`Delete ${module.name} permanently?`)) deleteModule.mutate(module._id); }}
        title="Delete permanently"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

export function ModuleList() {
  const { data: modules = [], isLoading } = useModules();
  const createModule = useCreateModule();
  const [showModal, setShowModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const active   = modules.filter(m => !m.archived);
  const archived = modules.filter(m => m.archived);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="card-base h-32 skeleton" />
        <div className="card-base h-32 skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Modules</h2>
        <button className="btn-primary text-sm" onClick={() => setShowModal(true)}>
          + Add Module
        </button>
      </div>

      {active.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-slate-400 dark:text-slate-500 text-sm">No modules yet. Add your first course to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map(m => <ModuleCard key={m._id} module={m} />)}
        </div>
      )}

      {archived.length > 0 && (
        <div>
          <button
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-1"
            onClick={() => setShowArchived(v => !v)}
          >
            <span>{showArchived ? '▾' : '▸'}</span>
            <span>{archived.length} archived module{archived.length !== 1 ? 's' : ''}</span>
          </button>
          {showArchived && (
            <div className="mt-2 space-y-1.5">
              {archived.map(m => <ArchivedModuleRow key={m._id} module={m} />)}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ModuleModal
          onClose={() => setShowModal(false)}
          onSave={input => createModule.mutate(input, { onSuccess: () => setShowModal(false) })}
          saving={createModule.isPending}
        />
      )}
    </div>
  );
}
