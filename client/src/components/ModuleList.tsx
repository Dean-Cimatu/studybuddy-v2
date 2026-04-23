import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Module } from '@studybuddy/shared';
import {
  useModules,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  type CreateModuleInput,
} from '../hooks/useModules';
import type { TopicConfidence } from '@studybuddy/shared';

const PRESET_COLOURS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Turkish' },
  { value: 'ru', label: 'Russian' },
  { value: 'de', label: 'German' },
  { value: 'ar', label: 'Arabic' },
  { value: 'other', label: 'Other' },
];

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
    onSave({
      name: form.name.trim(),
      fullName: form.fullName.trim() || undefined,
      colour: form.colour,
      language: form.language,
      university: form.university.trim() || undefined,
      weeklyTargetHours: form.weeklyTargetHours ? Number(form.weeklyTargetHours) : undefined,
      topics: form.topics ? form.topics.split('\n').map(t => t.trim()).filter(Boolean) : undefined,
    });
  }

  const inputCls = 'w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-5">
          {isEdit ? 'Edit Module' : 'New Module'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Code *</label>
              <input
                className={inputCls}
                placeholder="e.g. CST2555"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                maxLength={50}
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">hrs / week</label>
              <input
                type="number"
                className={inputCls}
                value={form.weeklyTargetHours}
                onChange={e => setForm(f => ({ ...f, weeklyTargetHours: e.target.value }))}
                min={0}
                max={40}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Full name</label>
            <input
              className={inputCls}
              placeholder="e.g. Operating Systems"
              value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              maxLength={100}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">University</label>
            <input
              className={inputCls}
              placeholder="e.g. University of London"
              value={form.university}
              onChange={e => setForm(f => ({ ...f, university: e.target.value }))}
              maxLength={120}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Colour</label>
            <div className="flex gap-2">
              {PRESET_COLOURS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${form.colour === c ? 'border-slate-800 dark:border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setForm(f => ({ ...f, colour: c }))}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Language</label>
            <select
              className={inputCls}
              value={form.language}
              onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
            >
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Topics <span className="text-slate-400">(one per line)</span></label>
            <textarea
              className={`${inputCls} resize-none`}
              placeholder="Recursion&#10;Big-O complexity&#10;Sorting algorithms"
              rows={3}
              value={form.topics}
              onChange={e => setForm(f => ({ ...f, topics: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Module'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function nextDeadline(module: Module) {
  const now = new Date();
  return module.deadlines
    .filter(d => !d.completed && new Date(d.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;
}

function topicSummary(module: Module): { total: number; confident: number; inProgress: number } {
  const total = module.topics.length;
  let confident = 0, inProgress = 0;
  for (const t of module.topics) {
    const c = (module.topicProgress?.[t] ?? 'not-started') as TopicConfidence;
    if (c === 'confident') confident++;
    else if (c === 'in-progress') inProgress++;
  }
  return { total, confident, inProgress };
}

function DeadlinePill({ deadline }: { deadline: NonNullable<ReturnType<typeof nextDeadline>> }) {
  const days = Math.ceil((new Date(deadline.date).getTime() - Date.now()) / 86400000);
  const urgent = days <= 3;
  const soon = days <= 7;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
      urgent
        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
        : soon
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
    }`}>
      {urgent ? '⚠ ' : ''}{deadline.title} · {days === 0 ? 'today' : `${days}d`}
    </span>
  );
}

function ModuleCard({ module, onEdit, onArchive, onDelete }: {
  module: Module;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const next = nextDeadline(module);
  const { total, confident, inProgress } = topicSummary(module);
  const confidentPct = total > 0 ? (confident / total) * 100 : 0;
  const inProgressPct = total > 0 ? (inProgress / total) * 100 : 0;

  return (
    <div className="relative group">
      <Link
        to={`/modules/${module._id}`}
        className="block card-base pl-4 pr-16 py-4 hover:shadow-md transition-shadow"
      >
        {/* Colour bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: module.colour }} />

        {/* Name row */}
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight">{module.name}</span>
              {module.fullName && (
                <span className="text-sm text-slate-500 dark:text-slate-400 truncate">{module.fullName}</span>
              )}
            </div>
            {module.university && (
              <div className="flex items-center gap-1 mt-1">
                <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0v6" />
                </svg>
                <span className="text-xs text-slate-400 dark:text-slate-500">{module.university}</span>
              </div>
            )}
          </div>
          {/* Arrow */}
          <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Footer row */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {next && <DeadlinePill deadline={next} />}

          {total > 0 && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-24 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${confidentPct}%` }} />
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${inProgressPct}%` }} />
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {confident}/{total} confident
              </span>
            </div>
          )}

          {!next && total === 0 && (
            <span className="text-xs text-slate-400">No deadlines or topics yet</span>
          )}
        </div>
      </Link>

      {/* Action buttons — outside the link */}
      <div className="absolute top-3 right-3 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          onClick={onEdit}
          title="Edit"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
          onClick={onArchive}
          title="Archive"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </button>
        <button
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          onClick={onDelete}
          title="Delete"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ArchivedModuleRow({ module }: { module: Module }) {
  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-80 transition-opacity">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: module.colour }} />
      <span className="text-sm text-slate-700 dark:text-slate-300 font-medium flex-1">{module.name}</span>
      {module.fullName && <span className="text-xs text-slate-400 hidden sm:block truncate max-w-[160px]">{module.fullName}</span>}
      <button
        className="text-xs text-slate-400 hover:text-blue-600 transition-colors px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600"
        onClick={() => updateModule.mutate({ id: module._id, input: { archived: false } })}
      >
        Restore
      </button>
      <button
        className="text-xs text-slate-400 hover:text-red-500 transition-colors p-1"
        onClick={() => { if (confirm(`Delete ${module.name} permanently?`)) deleteModule.mutate(module._id); }}
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
  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();
  const [showModal, setShowModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const active   = modules.filter(m => !m.archived);
  const archived = modules.filter(m => m.archived);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="card-base h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-slate-400">
          {active.length} active module{active.length !== 1 ? 's' : ''}
        </p>
        <button className="btn-primary text-sm" onClick={() => setShowModal(true)}>
          + Add Module
        </button>
      </div>

      {active.length === 0 ? (
        <div className="card-base py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No modules yet</p>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Add your first course to get started</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {active.map(m => (
            <ModuleCard
              key={m._id}
              module={m}
              onEdit={() => setEditingModule(m)}
              onArchive={() => updateModule.mutate({ id: m._id, input: { archived: true } })}
              onDelete={() => { if (confirm(`Delete ${m.name}?`)) deleteModule.mutate(m._id); }}
            />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="pt-1">
          <button
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-1.5 py-1"
            onClick={() => setShowArchived(v => !v)}
          >
            <svg className={`w-3 h-3 transition-transform ${showArchived ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {archived.length} archived
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

      {editingModule && (
        <ModuleModal
          initialModule={editingModule}
          onClose={() => setEditingModule(null)}
          onSave={input => updateModule.mutate(
            { id: editingModule._id, input },
            { onSuccess: () => setEditingModule(null) }
          )}
          saving={updateModule.isPending}
        />
      )}
    </div>
  );
}
