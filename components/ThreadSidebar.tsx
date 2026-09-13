'use client';

import React, { useState } from 'react';
import { IThreadDoc } from '@/lib/types';
import { createThreadAction, archiveThreadAction } from '@/app/actions/threads';
import { logoutAction } from '@/app/actions/auth';
import {
  Layers,
  Plus,
  Search,
  Activity,
  LogOut,
  Trash2,
  ChevronRight,
  FolderPlus,
  X,
  Check,
  Archive,
  Database,
} from 'lucide-react';
import { InstallPwaButton } from './InstallPwaButton';

interface ThreadSidebarProps {
  threads: IThreadDoc[];
  activeThreadId: string | null;
  onSelectThread: (thread: IThreadDoc) => void;
  onThreadCreated: (newThread: IThreadDoc) => void;
  onThreadArchived: (threadId: string) => void;
  onOpenTimeline: () => void;
  onOpenArchived: () => void;
  onOpenDataBackup: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  userEmail?: string;
}

const PRESET_THREAD_COLORS = [
  '#6366f1',
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#ec4899',
];

export function ThreadSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onThreadCreated,
  onThreadArchived,
  onOpenTimeline,
  onOpenArchived,
  onOpenDataBackup,
  isMobileOpen = false,
  onMobileClose,
  userEmail,
}: ThreadSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [threadName, setThreadName] = useState('');
  const [threadDesc, setThreadDesc] = useState('');
  const [threadColor, setThreadColor] = useState(PRESET_THREAD_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredThreads = threads.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateThreadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadName.trim()) return;

    setIsSubmitting(true);
    const res = await createThreadAction({
      name: threadName.trim(),
      description: threadDesc.trim(),
      color: threadColor,
    });

    setIsSubmitting(false);
    if (res.success && res.data) {
      onThreadCreated(res.data);
      setThreadName('');
      setThreadDesc('');
      setIsCreatingThread(false);
      if (onMobileClose) onMobileClose();
    }
  };

  const handleArchiveThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to archive this thread? Tasks will be preserved in history.')) {
      const res = await archiveThreadAction({ threadId });
      if (res.success) {
        onThreadArchived(threadId);
      }
    }
  };

  const handleThreadClick = (thread: IThreadDoc) => {
    onSelectThread(thread);
    if (onMobileClose) onMobileClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Main Sidebar (Responsive Drawer) */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-950 border-r border-slate-800/80 flex flex-col h-screen shrink-0 select-none shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:static md:z-auto
        `}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white leading-none">TaskFlow</h2>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Thread Kanban Workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsCreatingThread(true)}
              className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors"
              title="Create New Thread"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Mobile Close Button */}
            {onMobileClose && (
              <button
                onClick={onMobileClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition-colors"
                title="Close Sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-slate-800/60">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search threads..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Quick Global Navigation Items */}
        <div className="px-3 pt-3 pb-1 space-y-1">
          <button
            onClick={() => {
              onOpenTimeline();
              if (onMobileClose) onMobileClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <Activity className="w-4 h-4 text-purple-400" />
            <span>Activity Timeline / Calendar</span>
          </button>

          <button
            onClick={() => {
              onOpenArchived();
              if (onMobileClose) onMobileClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <Archive className="w-4 h-4 text-amber-400" />
            <span>Archived Tasks</span>
          </button>

          <button
            onClick={() => {
              onOpenDataBackup();
              if (onMobileClose) onMobileClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <Database className="w-4 h-4 text-indigo-400" />
            <span>Data & Backup (JSON/CSV)</span>
          </button>
        </div>

        {/* Threads Section List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Threads</span>
            <span className="font-mono text-slate-600">{filteredThreads.length}</span>
          </div>

          {filteredThreads.length === 0 ? (
            <div className="text-center py-10 px-3 text-slate-500 text-xs">
              {threads.length === 0 ? (
                <div>
                  <p>No threads created yet.</p>
                  <button
                    onClick={() => setIsCreatingThread(true)}
                    className="mt-2 text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create First Thread</span>
                  </button>
                </div>
              ) : (
                <p>No matching threads found.</p>
              )}
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const threadId = thread._id;
              const isActive = activeThreadId === threadId;

              return (
                <div
                  key={threadId}
                  onClick={() => handleThreadClick(thread)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-indigo-950/70 border-indigo-500/50 text-white shadow-sm'
                      : 'bg-slate-900/40 hover:bg-slate-900 border-transparent hover:border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: thread.color || '#6366f1' }}
                    />
                    <div className="truncate">
                      <span className="text-xs font-semibold block truncate">{thread.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {thread.tags?.length || 0} statuses
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleArchiveThread(e, threadId)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                      title="Archive thread"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight
                      className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-600'}`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* User Footer with Install Button & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-2.5">
          <InstallPwaButton className="w-full" />

          <div className="flex items-center justify-between pt-1">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-medium text-white truncate">Admin</p>
              <p className="text-[10px] text-slate-400 truncate font-mono">{userEmail || 'admin@taskflow.local'}</p>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-slate-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Create Thread Modal */}
        {isCreatingThread && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-white/10 relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Create New Thread</h3>
                </div>
                <button
                  onClick={() => setIsCreatingThread(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateThreadSubmit} className="pt-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Thread Name
                  </label>
                  <input
                    type="text"
                    required
                    value={threadName}
                    onChange={(e) => setThreadName(e.target.value)}
                    placeholder="e.g. Sprint 24 or Mobile App"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={threadDesc}
                    onChange={(e) => setThreadDesc(e.target.value)}
                    placeholder="Short note or objective"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    {PRESET_THREAD_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setThreadColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          threadColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreatingThread(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Creating...' : 'Create'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
