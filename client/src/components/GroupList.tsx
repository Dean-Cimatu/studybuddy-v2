import { useState } from 'react';
import { useGroups, useCreateGroup, useJoinGroup, useLeaveGroup } from '../hooks/useGroups';
import type { StudyGroup } from '@studybuddy/shared';

interface GroupListProps {
  selectedGroupId: string | null;
  onSelectGroup: (id: string) => void;
}

export function GroupList({ selectedGroupId, onSelectGroup }: GroupListProps) {
  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createName, setCreateName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function copyInviteCode(code: string, id: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  async function handleCreate() {
    if (!createName.trim()) return;
    setError(null);
    try {
      await createGroup.mutateAsync(createName.trim());
      setCreateName('');
      setShowCreate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create group');
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return;
    setError(null);
    try {
      await joinGroup.mutateAsync(inviteCode.trim());
      setInviteCode('');
      setShowJoin(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid invite code');
    }
  }

  async function handleLeave(e: React.MouseEvent, group: StudyGroup) {
    e.stopPropagation();
    await leaveGroup.mutateAsync(group._id);
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="h-16 rounded-lg bg-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => { setShowCreate(true); setShowJoin(false); setError(null); }} className="btn-primary text-sm flex-1">
          Create Group
        </button>
        <button onClick={() => { setShowJoin(true); setShowCreate(false); setError(null); }} className="btn-secondary text-sm flex-1">
          Join Group
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {showCreate && (
        <div className="rounded-lg bg-slate-800 border border-slate-700 p-3 space-y-2">
          <input
            className="input w-full text-sm"
            placeholder="Group name"
            value={createName}
            onChange={e => setCreateName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={createGroup.isPending} className="btn-primary text-sm">
              {createGroup.isPending ? 'Creating…' : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {showJoin && (
        <div className="rounded-lg bg-slate-800 border border-slate-700 p-3 space-y-2">
          <input
            className="input w-full text-sm"
            placeholder="Enter invite code"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={handleJoin} disabled={joinGroup.isPending} className="btn-primary text-sm">
              {joinGroup.isPending ? 'Joining…' : 'Join'}
            </button>
            <button onClick={() => setShowJoin(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {!groups || groups.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-4">
          No study groups yet. Create one or join with an invite code.
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map(group => (
            <div
              key={group._id}
              onClick={() => onSelectGroup(group._id)}
              className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                selectedGroupId === group._id
                  ? 'border-blue-500 bg-slate-800'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-100 text-sm">{group.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{group.members.length} member{group.members.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={e => handleLeave(e, group)}
                  className="text-slate-500 hover:text-slate-300 text-xs ml-2 shrink-0"
                >
                  Leave
                </button>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-slate-500 text-xs">Code:</span>
                <code className="text-xs text-slate-300 font-mono bg-slate-700 px-1.5 py-0.5 rounded">
                  {group.inviteCode}
                </code>
                <button
                  onClick={e => { e.stopPropagation(); copyInviteCode(group.inviteCode, group._id); }}
                  className="text-slate-500 hover:text-slate-300 text-xs"
                >
                  {copiedId === group._id ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
