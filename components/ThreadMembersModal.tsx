'use client';

import React, { useState, useEffect } from 'react';
import { IThreadDoc } from '@/lib/types';
import {
  getThreadMembersAction,
  inviteThreadMemberAction,
  removeThreadMemberAction,
  IThreadMemberInfo,
} from '@/app/actions/threads';
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  Eye,
  Trash2,
  X,
  Mail,
  Check,
  AlertCircle,
} from 'lucide-react';

interface ThreadMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: IThreadDoc;
  currentUserEmail?: string;
}

export function ThreadMembersModal({
  isOpen,
  onClose,
  thread,
  currentUserEmail,
}: ThreadMembersModalProps) {
  const [members, setMembers] = useState<IThreadMemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && thread?._id) {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      getThreadMembersAction(thread._id).then((res) => {
        if (res.success && res.data) {
          setMembers(res.data);
        }
        setLoading(false);
      });
    }
  }, [isOpen, thread?._id]);

  if (!isOpen) return null;

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const res = await inviteThreadMemberAction({
      threadId: thread._id,
      email: inviteEmail.trim(),
      role: inviteRole,
    });

    setIsSubmitting(false);

    if (res.success && res.member) {
      setMembers((prev) => {
        const filtered = prev.filter((m) => m.userId !== res.member!.userId);
        return [...filtered, res.member!];
      });
      setInviteEmail('');
      setSuccessMsg(`✅ Successfully added ${res.member.name} as ${res.member.role}`);
    } else {
      setError(res.error || 'Failed to invite member');
    }
  };

  const handleRemoveMember = async (targetUserId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this thread?`)) return;

    const res = await removeThreadMemberAction({
      threadId: thread._id,
      targetUserId,
    });

    if (res.success) {
      setMembers((prev) => prev.filter((m) => m.userId !== targetUserId));
    } else {
      setError(res.error || 'Failed to remove member');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-white/10 bg-slate-900/90 relative overflow-hidden flex flex-col max-h-[85vh]">
        {/* Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Thread Collaborators
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {members.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Manage who can view or edit &ldquo;{thread.name}&rdquo;</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto py-4 space-y-4 pr-1 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Invite Form */}
          <form onSubmit={handleInviteSubmit} className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider block">
              Assign / Invite Teammate
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@domain.com"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="bg-slate-900 border border-slate-700/80 text-slate-300 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 shrink-0 w-full sm:w-auto"
              >
                <option value="editor">Editor (Can edit tasks)</option>
                <option value="viewer">Viewer (Read only)</option>
              </select>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Inviting...' : 'Invite'}</span>
              </button>
            </div>
          </form>

          {/* Members List */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider block">
              Current Members
            </span>

            {loading ? (
              <div className="py-8 text-center text-slate-500">
                <span className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full inline-block animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-slate-500 py-4 text-center">No collaborators assigned.</p>
            ) : (
              <div className="divide-y divide-slate-800/60 rounded-2xl bg-slate-950/40 border border-slate-800/80 overflow-hidden">
                {members.map((m) => {
                  const isCurrentUser = m.email === currentUserEmail;
                  const isOwner = m.role === 'owner';

                  return (
                    <div key={m.userId} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-[11px] shrink-0">
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-white truncate">{m.name}</span>
                            {isCurrentUser && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">{m.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isOwner ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>Owner</span>
                          </span>
                        ) : m.role === 'editor' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            <Shield className="w-3 h-3 text-indigo-400" />
                            <span>Editor</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            <Eye className="w-3 h-3 text-slate-400" />
                            <span>Viewer</span>
                          </span>
                        )}

                        {!isOwner && (
                          <button
                            onClick={() => handleRemoveMember(m.userId, m.name)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Remove collaborator"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
