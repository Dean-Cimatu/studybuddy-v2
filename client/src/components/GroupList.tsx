import { useState } from 'react';
import { useGroups, useCreateGroup, useJoinGroup, useLeaveGroup } from '../hooks/useGroups';
import { useToast } from '../contexts/ToastContext';
import type { StudyGroup } from '@studybuddy/shared';

interface GroupListProps {
  selectedGroupId: string | null;
  onSelectGroup: (id: string | null) => void;
}

export function GroupList({ selectedGroupId, onSelectGroup }: GroupListProps) {
  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();

  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none');
  const [createName, setCreateName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { showToast } = useToast();

  function openMode(m: 'create' | 'join') {
    setMode(prev => prev === m ? 'none' : m);
    setError(null);
    setCreateName('');
    setInviteCode('');
  }

  async function handleCreate() {
    if (!createName.trim()) return;
    setError(null);
    try {
      const group = await createGroup.mutateAsync(createName.trim());
      setCreateName('');
      setMode('none');
      onSelectGroup(group._id);
      showToast('Group created!', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create group';
      setError(msg);
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return;
    setError(null);
    try {
      const group = await joinGroup.mutateAsync(inviteCode.trim());
      setInviteCode('');
      setMode('none');
      onSelectGroup(group._id);
      showToast('Joined group!', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid invite code';
      setError(msg);
    }
  }

  async function handleLeave(e: React.MouseEvent, group: StudyGroup) {
    e.stopPropagation();
    const isLast = group.members.length <= 1;
    const confirmed = isLast
      ? confirm(`You're the only member. Leaving will delete "${group.name}". Continue?`)
      : confirm(`Leave "${group.name}"?`);
    if (!confirmed) return;
    if (selectedGroupId === group._id) onSelectGroup(null);
    await leaveGroup.mutateAsync(group._id);
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-1.5 p-2">
        {[1, 2].map(i => <div key={i} className="h-9 rounded-lg bg-slate-800 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 mb-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Groups</span>
        <div className="flex gap-1">
          <button
            onClick={() => openMode('create')}
            className={`text-xs px-2 py-1 rounded-md transition-colors ${
              mode === 'create'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            + New
          </button>
          <button
            onClick={() => openMode('join')}
            className={`text-xs px-2 py-1 rounded-md transition-colors ${
              mode === 'join'
                ? 'bg-slate-600 text-slate-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            Join
          </button>
        </div>
      </div>

      {/* Inline form */}
      {mode !== 'none' && (
        <div className="mx-2 mb-2 rounded-lg bg-slate-800 border border-slate-700 p-2.5 space-y-2">
          <input
            className="input w-full text-sm"
            placeholder={mode === 'create' ? 'Group name…' : 'Invite code…'}
            value={mode === 'create' ? createName : inviteCode}
            onChange={e => mode === 'create' ? setCreateName(e.target.value) : setInviteCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (mode === 'create' ? handleCreate() : handleJoin())}
            autoFocus
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-1.5">
            <button
              onClick={mode === 'create' ? handleCreate : handleJoin}
              disabled={createGroup.isPending || joinGroup.isPending}
              className="btn-primary text-xs py-1 px-3"
            >
              {createGroup.isPending || joinGroup.isPending ? '…' : mode === 'create' ? 'Create' : 'Join'}
            </button>
            <button onClick={() => setMode('none')} className="text-xs text-slate-400 hover:text-slate-200 px-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Group rows */}
      <div className="flex-1 overflow-y-auto space-y-0.5 px-2">
        {!groups || groups.length === 0 ? (
          <p className="text-slate-500 text-xs text-center py-6 px-2">
            No groups yet — create one or join with an invite code.
          </p>
        ) : (
          groups.map(group => (
            <div
              key={group._id}
              onClick={() => onSelectGroup(group._id)}
              className={`group flex items-center justify-between rounded-lg px-2.5 py-2 cursor-pointer transition-colors ${
                selectedGroupId === group._id
                  ? 'bg-blue-500/15 text-slate-100'
                  : 'text-slate-300 hover:bg-slate-700/60'
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{group.name}</p>
                <p className="text-xs text-slate-500">{group.members.length} member{group.members.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={e => { e.stopPropagation(); copyCode(group.inviteCode, group._id); }}
                  className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                  title="Copy invite code"
                >
                  {copiedId === group._id ? (
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={e => handleLeave(e, group)}
                  className="p-1 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Leave group"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
