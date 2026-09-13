'use client';

import React, { useState, useEffect } from 'react';
import { getTaskTimelineAction } from '@/app/actions/tasks';
import { X, Calendar, Clock, Activity, ArrowRight, PlusCircle, RefreshCw, Archive, Filter } from 'lucide-react';

import { useEscapeKey } from '@/lib/hooks/useEscapeKey';

interface TimelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  threadId?: string;
  threadName?: string;
}

interface TimelineEvent {
  taskId: string;
  taskTitle: string;
  threadId: string;
  action: string;
  fromTag?: string | null;
  toTag: string;
  timestamp: string;
  details?: string;
}

export function TimelineDrawer({ isOpen, onClose, threadId, threadName }: TimelineDrawerProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getTaskTimelineAction(threadId).then((res) => {
        setLoading(false);
        if (res.success && res.data) {
          setEvents(res.data);
        }
      });
    }
  }, [isOpen, threadId]);

  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const filteredEvents = events.filter((e) => {
    if (filterAction === 'all') return true;
    return e.action === filterAction;
  });

  // Group events by day: "YYYY-MM-DD"
  const groupedByDate: { [dateStr: string]: TimelineEvent[] } = {};
  for (const event of filteredEvents) {
    const d = new Date(event.timestamp);
    const dateKey = d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(event);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="glass-panel w-full max-w-md h-full shadow-2xl border-l border-white/10 flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-none">Activity Timeline</h2>
              <p className="text-xs text-slate-400 mt-1">
                {threadName ? `Filtered: ${threadName}` : 'All Thread Activity'}
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

        {/* Filter bar */}
        <div className="flex items-center gap-2 py-3 border-b border-slate-800 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-400">Action:</span>
          {(['all', 'created', 'moved', 'archived'] as const).map((act) => (
            <button
              key={act}
              onClick={() => setFilterAction(act)}
              className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                filterAction === act
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              {act}
            </button>
          ))}
        </div>

        {/* Content stream */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <span className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-xs">Loading activity stream...</span>
            </div>
          ) : Object.keys(groupedByDate).length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              No activity logs recorded yet.
            </div>
          ) : (
            Object.entries(groupedByDate).map(([dateLabel, dateEvents]) => (
              <div key={dateLabel} className="space-y-3">
                {/* Date Header Badge */}
                <div className="sticky top-0 z-10 flex items-center gap-2 bg-slate-900/90 py-1.5 px-3 rounded-lg border border-slate-800 text-xs font-semibold text-indigo-300 backdrop-blur-md">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{dateLabel}</span>
                  <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                    {dateEvents.length} {dateEvents.length === 1 ? 'event' : 'events'}
                  </span>
                </div>

                {/* Event Items */}
                <div className="pl-3 space-y-2.5 border-l-2 border-slate-800 ml-3">
                  {dateEvents.map((evt, idx) => {
                    const timeStr = new Date(evt.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span className="font-semibold text-white truncate max-w-[200px]">
                            {evt.taskTitle}
                          </span>
                          <span className="font-mono text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeStr}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          {evt.action === 'created' && (
                            <>
                              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Created in <span className="font-medium text-emerald-300">{evt.toTag}</span></span>
                            </>
                          )}
                          {evt.action === 'moved' && (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                              <span>Moved</span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[11px]">{evt.fromTag}</span>
                              <ArrowRight className="w-3 h-3 text-slate-500" />
                              <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 text-[11px]">{evt.toTag}</span>
                            </>
                          )}
                          {evt.action === 'archived' && (
                            <>
                              <Archive className="w-3.5 h-3.5 text-amber-400" />
                              <span>Archived</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
