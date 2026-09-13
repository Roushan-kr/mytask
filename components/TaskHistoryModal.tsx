'use client';

import React from 'react';
import { ITaskDoc, ITag } from '@/lib/types';
import { X, Clock, ArrowRight, PlusCircle, RefreshCw, Archive, Calendar } from 'lucide-react';

interface TaskHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ITaskDoc | null;
  tags: ITag[];
}

export function TaskHistoryModal({ isOpen, onClose, task, tags }: TaskHistoryModalProps) {
  if (!isOpen || !task) return null;

  const getTagName = (tagId?: string | null) => {
    if (!tagId) return 'Initial State';
    if (tagId === 'archived') return 'Archived';
    const tag = tags.find((t) => t.id === tagId);
    return tag ? tag.name : tagId;
  };

  const getTagColor = (tagId?: string | null) => {
    if (!tagId) return '#64748b';
    const tag = tags.find((t) => t.id === tagId);
    return tag ? tag.color : '#6366f1';
  };

  const history = [...(task.history || [])].reverse();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/10 relative max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white leading-none truncate">Task Audit History</h2>
              <p className="text-xs text-slate-400 mt-1 truncate max-w-xs">{task.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline body */}
        <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-4 min-h-0">
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No historical records found for this task.
            </div>
          ) : (
            <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {history.map((record, idx) => {
                const dateObj = new Date(record.timestamp);
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const formattedTime = dateObj.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-slate-900 border-2 border-indigo-500 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 shrink-0">
                          {record.action === 'created' && <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />}
                          {record.action === 'moved' && <RefreshCw className="w-3.5 h-3.5 text-blue-400" />}
                          {record.action === 'archived' && <Archive className="w-3.5 h-3.5 text-amber-400" />}
                          {record.action}
                        </span>

                        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 font-mono shrink-0">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{formattedDate}</span>
                          <span>•</span>
                          <span>{formattedTime}</span>
                        </div>
                      </div>

                      {record.action === 'moved' && record.fromTag && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs flex-wrap">
                          <span
                            className="px-2 py-0.5 rounded-md font-medium text-[11px] truncate max-w-[140px]"
                            style={{
                              backgroundColor: `${getTagColor(record.fromTag)}20`,
                              color: getTagColor(record.fromTag),
                              border: `1px solid ${getTagColor(record.fromTag)}40`,
                            }}
                          >
                            {getTagName(record.fromTag)}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span
                            className="px-2 py-0.5 rounded-md font-medium text-[11px] truncate max-w-[140px]"
                            style={{
                              backgroundColor: `${getTagColor(record.toTag)}20`,
                              color: getTagColor(record.toTag),
                              border: `1px solid ${getTagColor(record.toTag)}40`,
                            }}
                          >
                            {getTagName(record.toTag)}
                          </span>
                        </div>
                      )}

                      {record.action === 'created' && (
                        <div className="mt-1 text-xs text-slate-300">
                          Initial status set to{' '}
                          <span
                            className="px-2 py-0.5 rounded-md font-medium text-[11px] inline-block ml-1"
                            style={{
                              backgroundColor: `${getTagColor(record.toTag)}20`,
                              color: getTagColor(record.toTag),
                              border: `1px solid ${getTagColor(record.toTag)}40`,
                            }}
                          >
                            {getTagName(record.toTag)}
                          </span>
                        </div>
                      )}

                      {record.details && (
                        <p className="text-xs text-slate-400 mt-2 italic bg-slate-950/40 p-2 rounded-lg border border-slate-800/60 break-words">
                          {record.details}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-medium text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
