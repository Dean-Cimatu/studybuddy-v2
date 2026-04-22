import { useState } from 'react';
import { useGroup, useSetChallenge, useClearChallenge } from '../hooks/useGroups';
import type { GroupChallenge } from '@studybuddy/shared';

interface GroupChallengeProps {
  groupId: string;
  initialOpen?: boolean;
  onFormClose?: () => void;
}

function currentWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  return d.toISOString().slice(0, 10);
}

function daysLeftInWeek(): number {
  const now = new Date();
  const day = now.getUTCDay();
  const toSunday = day === 0 ? 0 : 7 - day;
  return toSunday;
}

function memberStatus(hoursThisWeek: number, targetHours: number, isCurrentWeek: boolean) {
  if (!isCurrentWeek) {
    return hoursThisWeek >= targetHours
      ? { label: 'Completed', colour: 'text-emerald-400' }
      : { label: 'Fell short', colour: 'text-red-400' };
  }
  const pct = hoursThisWeek / targetHours;
  if (pct >= 1) return { label: 'Done!', colour: 'text-emerald-400' };
  const daysLeft = daysLeftInWeek();
  const needed = targetHours - hoursThisWeek;
  const hoursPerDay = daysLeft > 0 ? needed / daysLeft : Infinity;
  if (hoursPerDay > 6) return { label: 'At risk', colour: 'text-red-400' };
  if (hoursPerDay > 3) return { label: 'Behind', colour: 'text-amber-400' };
  return { label: 'On track', colour: 'text-emerald-400' };
}

function SetChallengeForm({ groupId, existing, onClose }: {
  groupId: string;
  existing?: GroupChallenge | null;
  onClose: () => void;
}) {
  const [hours, setHours] = useState(existing?.targetHours ?? 10);
  const [title, setTitle] = useState(existing?.title ?? '');
  const setChallenge = useSetChallenge();

  async function handleSubmit() {
    if (hours < 1) return;
    await setChallenge.mutateAsync({ groupId, targetHours: hours, title });
    onClose();
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-2">
      <input
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
        placeholder="Challenge title (optional)"
        value={title}
        maxLength={80}
        onChange={e => setTitle(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400 shrink-0">Target hours this week</label>
        <input
          type="number"
          min={1}
          max={168}
          value={hours}
          onChange={e => setHours(Number(e.target.value))}
          className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-sm text-slate-200 text-center focus:outline-none focus:border-blue-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={setChallenge.isPending}
          className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
        >
          {setChallenge.isPending ? 'Saving…' : existing ? 'Update' : 'Set challenge'}
        </button>
        <button
          onClick={onClose}
          className="text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function GroupChallengePanel({ groupId, initialOpen = false, onFormClose }: GroupChallengeProps) {
  const { data } = useGroup(groupId);
  const clearChallenge = useClearChallenge();
  const [showForm, setShowForm] = useState(initialOpen);

  function closeForm() {
    setShowForm(false);
    onFormClose?.();
  }

  if (!data) return null;

  const { group, memberStats } = data;
  const challenge = group.challenge;
  const thisWeek = currentWeekStart();
  const isCurrentWeek = challenge?.weekStart === thisWeek;
  const isExpired = challenge && !isCurrentWeek;

  const ranked = [...group.members]
    .map(m => ({ ...m, stats: memberStats[m.userId] ?? { hoursThisWeek: 0 } }))
    .sort((a, b) => b.stats.hoursThisWeek - a.stats.hoursThisWeek);

  if (!challenge) {
    return (
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Weekly Challenge</p>
            <p className="text-sm text-slate-500 mt-0.5">No active challenge — dare your group</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium transition-colors"
          >
            + Set one
          </button>
        </div>
        {showForm && <SetChallengeForm groupId={groupId} onClose={closeForm} />}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${
      isExpired
        ? 'bg-slate-800/30 border-slate-700/40'
        : 'bg-gradient-to-br from-blue-950/40 to-slate-800/60 border-blue-700/30'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {isExpired ? 'Last week\'s challenge' : 'Weekly Challenge'}
            </p>
            {!isExpired && (
              <span className="text-[10px] font-medium text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                {daysLeftInWeek()} days left
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-100 mt-0.5">
            {challenge.title || `Study ${challenge.targetHours}h this week`}
          </p>
          {challenge.title && (
            <p className="text-xs text-slate-400">{challenge.targetHours}h target</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isExpired && (
            <button
              onClick={() => setShowForm(v => !v)}
              className="text-[11px] px-2 py-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => clearChallenge.mutate(groupId)}
            className="text-[11px] px-2 py-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Member progress */}
      <div className="space-y-2.5">
        {ranked.map(member => {
          const h = member.stats.hoursThisWeek;
          const pct = Math.min(100, (h / challenge.targetHours) * 100);
          const status = memberStatus(h, challenge.targetHours, !isExpired);
          const won = h >= challenge.targetHours;

          return (
            <div key={member.userId}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {won && !isExpired && (
                    <svg className="w-3 h-3 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="text-xs text-slate-300 font-medium truncate">{member.name.split(' ')[0]}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-medium ${status.colour}`}>{status.label}</span>
                  <span className="text-xs text-slate-400 tabular-nums">{h}h / {challenge.targetHours}h</span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${won ? 'bg-emerald-500' : 'bg-blue-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <SetChallengeForm groupId={groupId} existing={challenge} onClose={closeForm} />
      )}
    </div>
  );
}
