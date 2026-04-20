import { useState } from 'react';
import type { Module, ModuleDeadline } from '@studybuddy/shared';
import {
  useModules,
  useCreateModule,
  useDeleteModule,
  useAddDeadline,
  useUpdateDeadline,
  useDeleteDeadline,
  type CreateModuleInput,
  type CreateDeadlineInput,
} from '../hooks/useModules';
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
  weeklyTargetHours: string;
  topics: string;
}

const defaultForm: ModuleFormState = {
  name: '', fullName: '', colour: '#3B82F6', language: 'en', weeklyTargetHours: '3', topics: '',
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

function ModuleModal({ onClose, onSave, saving }: {
  onClose: () => void;
  onSave: (input: CreateModuleInput) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ModuleFormState>(defaultForm);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const input: CreateModuleInput = {
      name: form.name.trim(),
      fullName: form.fullName.trim() || undefined,
      colour: form.colour,
      language: form.language,
      weeklyTargetHours: form.weeklyTargetHours ? Number(form.weeklyTargetHours) : undefined,
      topics: form.topics ? form.topics.split('\n').map(t => t.trim()).filter(Boolean) : undefined,
    };
    onSave(input);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Add Module</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Module code (e.g. CST2555) *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            maxLength={50}
            required
          />
          <input
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Full name (e.g. Operating Systems)"
            value={form.fullName}
            onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
            maxLength={100}
          />
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Colour</p>
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
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.language}
              onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
            >
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <input
              type="number"
              className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Hrs/week"
              value={form.weeklyTargetHours}
              onChange={e => setForm(f => ({ ...f, weeklyTargetHours: e.target.value }))}
              min={0}
              max={40}
            />
          </div>
          <textarea
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Topics (one per line)"
            rows={3}
            value={form.topics}
            onChange={e => setForm(f => ({ ...f, topics: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : 'Save Module'}
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
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Add Deadline</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Title (e.g. Final Exam) *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />
          <input
            type="datetime-local"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            required
          />
          <select
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value as typeof DEADLINE_TYPES[number] }))}
          >
            {DEADLINE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Weight % (optional)"
              value={form.weight}
              onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
              min={0}
              max={100}
            />
            <input
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Format (optional)"
              value={form.format}
              onChange={e => setForm(f => ({ ...f, format: e.target.value }))}
            />
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

function ModuleCard({ module }: { module: Module }) {
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const deleteModule = useDeleteModule();
  const updateDeadline = useUpdateDeadline();
  const deleteDeadline = useDeleteDeadline();

  return (
    <div
      className="card-base p-4 relative group"
      style={{ borderLeft: `4px solid ${module.colour}` }}
    >
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="btn-ghost p-1.5 text-slate-400 hover:text-red-500"
          onClick={() => deleteModule.mutate(module._id)}
          title="Delete module"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="pr-10">
        <p className="font-semibold text-slate-800">{module.name}</p>
        {module.fullName && <p className="text-sm text-slate-500">{module.fullName}</p>}
      </div>

      {module.topics && module.topics.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {module.topics.map(topic => (
            <span key={topic} className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{topic}</span>
          ))}
        </div>
      )}

      {module.deadlines && module.deadlines.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {(module.deadlines as ModuleDeadline[]).map(dl => {
            const { cls, label } = typeBadge(dl.type);
            return (
              <li key={dl._id} className="flex items-center gap-2 group/dl">
                <span className={`text-xs font-medium rounded px-1.5 py-0.5 ${cls}`}>{label}</span>
                <span className="text-sm text-slate-700 flex-1">{dl.title}</span>
                <DeadlineCountdown date={dl.date} completed={dl.completed} />
                <div className="flex gap-1 opacity-0 group-hover/dl:opacity-100 transition-opacity">
                  {!dl.completed && (
                    <button
                      className="text-xs text-slate-400 hover:text-green-600"
                      onClick={() => updateDeadline.mutate({ moduleId: module._id, deadlineId: dl._id, input: { completed: true } })}
                      title="Mark completed"
                    >✓</button>
                  )}
                  <button
                    className="text-xs text-slate-400 hover:text-red-500"
                    onClick={() => deleteDeadline.mutate({ moduleId: module._id, deadlineId: dl._id })}
                    title="Remove deadline"
                  >×</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        className="mt-3 text-xs text-blue-500 hover:text-blue-700 hover:underline"
        onClick={() => setShowDeadlineModal(true)}
      >
        + Add deadline
      </button>

      {showDeadlineModal && (
        <DeadlineModal moduleId={module._id} onClose={() => setShowDeadlineModal(false)} />
      )}
    </div>
  );
}

export function ModuleList() {
  const { data: modules = [], isLoading } = useModules();
  const createModule = useCreateModule();
  const [showModal, setShowModal] = useState(false);

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
        <h2 className="text-base font-semibold text-slate-700">Modules</h2>
        <button className="btn-primary text-sm" onClick={() => setShowModal(true)}>
          + Add Module
        </button>
      </div>

      {modules.length === 0 ? (
        <div className="card-base p-8 text-center">
          <p className="text-slate-500 text-sm mb-4">No modules yet. Add your first course to get started.</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>Add Module</button>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map(m => <ModuleCard key={m._id} module={m} />)}
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
