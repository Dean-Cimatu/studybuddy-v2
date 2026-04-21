import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCreateModule } from '../hooks/useModules';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Turkish' },
  { value: 'ru', label: 'Russian' },
  { value: 'de', label: 'German' },
  { value: 'ar', label: 'Arabic' },
  { value: 'other', label: 'Other' },
];

interface PendingModule {
  name: string;
  fullName: string;
  language: string;
}

interface OnboardingModalProps {
  onComplete: () => void;
}

async function saveProfile(fields: Record<string, unknown>): Promise<void> {
  await fetch('/api/auth/profile', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const { user, refreshUser } = useAuth();
  const createModule = useCreateModule();

  const [step, setStep] = useState(0);

  // Step 1 state
  const [discipline, setDiscipline] = useState(user?.discipline ?? '');

  // Step 2 state
  const [goalHours, setGoalHours] = useState(15);
  const [sessionLength, setSessionLength] = useState<25 | 50 | 90>(25);
  const [studyTime, setStudyTime] = useState<'morning' | 'afternoon' | 'evening' | 'no-preference'>('no-preference');

  // Step 3 state
  const [modules, setModules] = useState<PendingModule[]>([{ name: '', fullName: '', language: 'en' }]);
  const [saving, setSaving] = useState(false);
  const [modulesAdded, setModulesAdded] = useState(false);

  function go(nextStep: number) {
    setStep(nextStep);
  }

  async function handleStep1Next() {
    if (discipline.trim()) {
      await saveProfile({ discipline: discipline.trim() }).catch(() => {});
    }
    go(1);
  }

  async function handleStep2Next() {
    await saveProfile({
      studyGoalHours: goalHours,
      preferredSessionLength: sessionLength,
      preferredStudyTime: studyTime,
    }).catch(() => {});
    go(2);
  }

  async function handleStep3Next() {
    const valid = modules.filter(m => m.name.trim());
    if (valid.length > 0) {
      setSaving(true);
      try {
        for (const mod of valid) {
          await createModule.mutateAsync({
            name: mod.name.trim(),
            fullName: mod.fullName.trim() || undefined,
            language: mod.language,
          });
        }
        setModulesAdded(true);
      } catch {
        // non-fatal
      }
      setSaving(false);
    }
    go(3);
  }

  function finish() {
    localStorage.setItem('studybuddy_onboarded', '1');
    void refreshUser();
    onComplete();
  }

  const STEP_LABELS = ['Welcome', 'Goals', 'Modules', 'Ready'];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-6 pb-2">
          {STEP_LABELS.map((_, i) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === step ? 'bg-blue-500' : i < step ? 'bg-blue-300' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="px-8 py-6 min-h-[320px]">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome to StudyBuddy!</h2>
              <p className="text-slate-500 mb-6">Let's get you set up in a few quick steps.</p>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                What do you study?
              </label>
              <input
                className="input w-full"
                placeholder="e.g. Computer Science, Business, Medicine"
                value={discipline}
                onChange={e => setDiscipline(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {/* Step 1: Goals */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">Set your study goals</h2>
                <p className="text-slate-500 text-sm">These can always be changed later.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Weekly study goal: <span className="text-blue-600">{goalHours}h</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={40}
                  value={goalHours}
                  onChange={e => setGoalHours(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>5h</span><span>40h</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Preferred session length</p>
                <div className="flex gap-2">
                  {([25, 50, 90] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => setSessionLength(l)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        sessionLength === l
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {l} min
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">When do you study best?</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['morning', 'afternoon', 'evening', 'no-preference'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setStudyTime(t)}
                      className={`py-2 rounded-lg text-sm border transition-colors capitalize ${
                        studyTime === t
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {t === 'no-preference' ? 'Flexible' : t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Add modules */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">Add your first course</h2>
                <p className="text-slate-500 text-sm">You can add more courses later.</p>
              </div>
              {modules.map((mod, i) => (
                <div key={i} className="space-y-2 p-3 border border-slate-200 rounded-lg">
                  <input
                    className="input w-full text-sm"
                    placeholder="Module code (e.g. CST4600)"
                    value={mod.name}
                    onChange={e => {
                      const next = [...modules];
                      next[i] = { ...next[i], name: e.target.value };
                      setModules(next);
                    }}
                  />
                  <input
                    className="input w-full text-sm"
                    placeholder="Full module name (optional)"
                    value={mod.fullName}
                    onChange={e => {
                      const next = [...modules];
                      next[i] = { ...next[i], fullName: e.target.value };
                      setModules(next);
                    }}
                  />
                  <select
                    className="input w-full text-sm"
                    value={mod.language}
                    onChange={e => {
                      const next = [...modules];
                      next[i] = { ...next[i], language: e.target.value };
                      setModules(next);
                    }}
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              ))}
              <button
                onClick={() => setModules(prev => [...prev, { name: '', fullName: '', language: 'en' }])}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add another module
              </button>
            </div>
          )}

          {/* Step 3: Ready */}
          {step === 3 && (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">You're ready!</h2>
              <p className="text-slate-500 mb-2">
                {goalHours}h/week goal · {sessionLength} min sessions
              </p>
              {modulesAdded && (
                <p className="text-sm text-emerald-600 mb-2">
                  Modules added successfully ✓
                </p>
              )}
              <p className="text-slate-400 text-sm">Start studying or let AI plan your week.</p>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-8 pb-6 flex items-center justify-between">
          <button
            onClick={() => step > 0 ? go(step - 1) : undefined}
            className={`text-sm text-slate-500 hover:text-slate-700 ${step === 0 ? 'invisible' : ''}`}
          >
            ← Back
          </button>

          <div className="flex gap-3">
            {step === 2 && (
              <button
                onClick={() => go(3)}
                className="text-sm text-slate-400 hover:text-slate-600"
              >
                Skip for now
              </button>
            )}

            {step === 0 && (
              <button onClick={() => void handleStep1Next()} className="btn-primary">
                Next →
              </button>
            )}
            {step === 1 && (
              <button onClick={() => void handleStep2Next()} className="btn-primary">
                Next →
              </button>
            )}
            {step === 2 && (
              <button onClick={() => void handleStep3Next()} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Next →'}
              </button>
            )}
            {step === 3 && (
              <div className="flex gap-2">
                <button
                  onClick={finish}
                  className="btn-secondary"
                >
                  Go to Dashboard
                </button>
                {modulesAdded && (
                  <button
                    onClick={() => {
                      finish();
                      // switch to planner tab after modal closes
                      setTimeout(() => {
                        const params = new URLSearchParams(window.location.search);
                        params.set('tab', 'planner');
                        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }, 100);
                    }}
                    className="btn-primary"
                  >
                    Generate my study plan
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
