'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ITaskDoc, ITag, IThreadDoc } from '@/lib/types';
import {
  getArchivedTasksAction,
  restoreTaskAction,
  permanentlyDeleteTaskAction,
} from '@/app/actions/tasks';
import {
  Archive,
  Trash2,
  RotateCcw,
  Search,
  Clock,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  Layers,
  ArrowRight,
  PlusCircle,
  RefreshCw,
  Bell,
} from 'lucide-react';

interface ArchivedTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThread: IThreadDoc | null;
  threads: IThreadDoc[];
  onTaskRestored?: (task: ITaskDoc) => void;
}

export function ArchivedTasksModal({
  isOpen,
  onClose,
  currentThread,
  threads,
  onTaskRestored,
}: ArchivedTasksModalProps) {
  const [archivedTasks, setArchivedTasks] = useState<ITaskDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterThreadId, setFilterThreadId] = useState<string>(
    currentThread ? currentThread._id : 'all'
  );
  const [expandedTaskHistories, setExpandedTaskHistories] = useState<Record<string, boolean>>({});
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [restoringTaskId, setRestoringTaskId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchArchivedTasks = useCallback(async () => {
    setLoading(true);
    const targetThreadId = filterThreadId === 'all' ? undefined : filterThreadId;
    const res = await getArchivedTasksAction(targetThreadId);
    if (res.success && res.data) {
      setArchivedTasks(res.data);
    }
    setLoading(false);
  }, [filterThreadId]);

  useEffect(() => {
    if (isOpen) {
      fetchArchivedTasks();
    }
  }, [isOpen, fetchArchivedTasks]);

  if (!isOpen) return null;

  const handleRestore = async (task: ITaskDoc) => {
    setRestoringTaskId(task._id);
    const res = await restoreTaskAction({ taskId: task._id });
    setRestoringTaskId(null);

    if (res.success && res.data) {
      setArchivedTasks((prev) => prev.filter((t) => t._id !== task._id));
      if (onTaskRestored) {
        onTaskRestored(res.data);
      }
    }
  };

  const handlePermanentDelete = async (taskId: string) => {
    setDeletingTaskId(taskId);
    const res = await permanentlyDeleteTaskAction({ taskId });
    setDeletingTaskId(null);
    setConfirmDeleteId(null);

    if (res.success) {
      setArchivedTasks((prev) => prev.filter((t) => t._id !== taskId));
    }
  };

  const toggleHistory = (taskId: string) => {
    setExpandedTaskHistories((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const getThreadInfo = (threadId: string) => {
    return threads.find((t) => t._id === threadId);
  };

  const getTagName = (thread: IThreadDoc | undefined, tagId?: string | null) => {
    if (!tagId) return 'Initial State';
    if (tagId === 'archived') return 'Archived';
    const tag = thread?.tags?.find((t) => t.id === tagId);
    return tag ? tag.name : tagId;
  };

  const getTagColor = (thread: IThreadDoc | undefined, tagId?: string | null) => {
    if (!tagId) return '#64748b';
    const tag = thread?.tags?.find((t) => t.id === tagId);
    return tag ? tag.color : '#6366f1';
  };

  const filteredTasks = archivedTasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel w-full max-w-3xl rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/10 relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white leading-none">Archived Tasks</h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-mono font-medium text-slate-400">
                  {archivedTasks.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Restore tasks back to the Kanban board, or permanently purge them along with their entire history.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Bar */}
        <div className="py-3 border-b border-slate-800/80 flex flex-wrap items-center gap-3 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search archived tasks..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterThreadId}
              onChange={(e) => setFilterThreadId(e.target.value)}
              className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-slate-900">All Threads</option>
              {threads.map((t) => (
                <option key={t._id} value={t._id} className="bg-slate-900">
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <span className="text-xs">Loading archived tasks...</span>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-2">
              <Archive className="w-10 h-10 mx-auto text-slate-700 opacity-60" />
              <p className="text-sm font-medium text-slate-400">No archived tasks found</p>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Tasks you archive from your Kanban columns will appear here.
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const thread = getThreadInfo(task.threadId);
              const isHistoryOpen = !!expandedTaskHistories[task._id];
              const isConfirmingDelete = confirmDeleteId === task._id;
              const isRestoring = restoringTaskId === task._id;
              const isDeleting = deletingTaskId === task._id;
              const historyList = [...(task.history || [])].reverse();

              const archivedDate = task.archivedAt
                ? new Date(task.archivedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Unknown';

              return (
                <div
                  key={task._id}
                  className="rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/90 transition-all p-4 space-y-3"
                >
                  {/* Top Row: Thread name + Archived Date + Status + Priority */}
                  <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                    <div className="flex items-center gap-2">
                      {thread && (
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1.5"
                          style={{
                            backgroundColor: `${thread.color || '#6366f1'}15`,
                            color: thread.color || '#818cf8',
                            border: `1px solid ${thread.color || '#6366f1'}30`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: thread.color || '#6366f1' }}
                          />
                          {thread.name}
                        </span>
                      )}

                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                        style={{
                          backgroundColor: `${getTagColor(thread, task.tagId)}15`,
                          color: getTagColor(thread, task.tagId),
                          border: `1px solid ${getTagColor(thread, task.tagId)}30`,
                        }}
                      >
                        Status: {getTagName(thread, task.tagId)}
                      </span>

                      {task.priority && task.priority !== 'medium' && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            task.priority === 'urgent'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : task.priority === 'high'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {task.priority}
                        </span>
                      )}

                      {task.remind_frequency ? (
                        <span className="flex items-center gap-1 text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                          <Bell className="w-3 h-3" />
                          <span>{task.remind_frequency}h reminder</span>
                        </span>
                      ) : null}
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-600" />
                      <span>Archived: {archivedDate}</span>
                    </div>
                  </div>

                  {/* Task Title & Description */}
                  <div>
                    <h3 className="text-sm font-semibold text-white leading-snug">{task.title}</h3>
                    {task.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons & History Accordion Toggle */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
                    {/* View History Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleHistory(task._id)}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{historyList.length} history events</span>
                      {isHistoryOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 ml-auto">
                      {/* Restore Button */}
                      <button
                        type="button"
                        disabled={isRestoring || isDeleting}
                        onClick={() => handleRestore(task)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                        <span>{isRestoring ? 'Restoring...' : 'Restore to Board'}</span>
                      </button>

                      {/* Permanent Delete Controls */}
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5 bg-rose-950/70 border border-rose-500/50 p-1 rounded-xl animate-in fade-in">
                          <div className="flex items-center gap-1 px-1.5 text-[11px] text-rose-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Purge task & history?</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handlePermanentDelete(task._id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-sm"
                          >
                            {isDeleting ? 'Purging...' : 'Yes, Purge Forever'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isRestoring || isDeleting}
                          onClick={() => setConfirmDeleteId(task._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs font-medium transition-colors disabled:opacity-50"
                          title="Permanently delete task and erase audit history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Permanently</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Audit History Trail */}
                  {isHistoryOpen && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 pl-2 space-y-2.5 animate-in fade-in duration-150">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Task Audit History Trail
                      </p>
                      <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                        {historyList.map((rec, hIdx) => {
                          const hDate = new Date(rec.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          return (
                            <div key={hIdx} className="relative text-xs">
                              <div className="absolute -left-5 top-1 w-3.5 h-3.5 rounded-full bg-slate-900 border border-indigo-500/60 flex items-center justify-center">
                                <div className="w-1 h-1 rounded-full bg-indigo-400" />
                              </div>

                              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold uppercase tracking-wider text-[10px] text-indigo-300 flex items-center gap-1">
                                    {rec.action === 'created' && <PlusCircle className="w-3 h-3 text-emerald-400" />}
                                    {rec.action === 'moved' && <RefreshCw className="w-3 h-3 text-blue-400" />}
                                    {rec.action === 'archived' && <Archive className="w-3 h-3 text-amber-400" />}
                                    {rec.action}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">{hDate}</span>
                                </div>

                                {rec.action === 'moved' && rec.fromTag && (
                                  <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
                                    <span className="text-slate-400 font-mono">{getTagName(thread, rec.fromTag)}</span>
                                    <ArrowRight className="w-3 h-3 text-slate-600" />
                                    <span className="text-indigo-300 font-mono">{getTagName(thread, rec.toTag)}</span>
                                  </div>
                                )}

                                {rec.details && (
                                  <p className="text-[11px] text-slate-400 mt-1 italic">{rec.details}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500">
            Deleting an archived task permanently erases its history record from database.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
