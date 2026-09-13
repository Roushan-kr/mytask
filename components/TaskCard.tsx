'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ITaskDoc, ITag } from '@/lib/types';
import {
  GripVertical,
  Clock,
  Calendar,
  Edit2,
  Archive,
  ChevronDown,
  Bell,
} from 'lucide-react';

interface TaskCardProps {
  task: ITaskDoc;
  tags: ITag[];
  onOpenHistory: (task: ITaskDoc) => void;
  onEditTask: (task: ITaskDoc) => void;
  onArchiveTask: (taskId: string) => void;
  onQuickMove: (taskId: string, targetTagId: string) => void;
}

function TaskCardComponent({
  task,
  tags,
  onOpenHistory,
  onEditTask,
  onArchiveTask,
  onQuickMove,
}: TaskCardProps) {
  const taskId = task._id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: taskId,
    data: {
      type: 'Task',
      task,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">High</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Low</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">Medium</span>;
    }
  };

  const historyCount = task.history?.length || 0;

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-40 border-2 border-indigo-500/80 rounded-2xl p-4 bg-indigo-950/30 min-h-[100px]"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="glass-card group rounded-xl p-3.5 shadow-md hover:shadow-xl transition-all duration-200 relative border border-white/5 hover:border-slate-700/80 bg-slate-900/90"
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-300 rounded transition-colors -ml-1"
            title="Drag to reorder or move column"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {getPriorityBadge(task.priority)}

          {/* Reminder Bell Indicator */}
          {task.remind_frequency && task.remind_frequency > 0 && (
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
              title={`Web Push reminder active: Every ${task.remind_frequency} hours`}
            >
              <Bell className="w-2.5 h-2.5 text-indigo-400" />
              <span>{task.remind_frequency}h</span>
            </span>
          )}
        </div>

        {/* Quick Shift Status Dropdown */}
        <div className="relative group/tagselect">
          <select
            value={task.tagId}
            onChange={(e) => onQuickMove(taskId, e.target.value)}
            className="text-[11px] font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-md pl-2 pr-6 py-0.5 border border-slate-700/70 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer capitalize"
            title="Quick Shift Status"
          >
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Task Title */}
      <h3 className="text-sm font-semibold text-white group-hover:text-indigo-200 transition-colors leading-snug mb-1">
        {task.title}
      </h3>

      {/* Task Description */}
      {task.description && (
        <p className="text-xs text-slate-400 line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* Footer info: Due Date, History Trigger & Card Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center gap-2.5">
          {/* Due date if set */}
          {task.dueDate && (
            <div className="flex items-center gap-1 text-slate-400" title="Due date">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>
                {new Date(task.dueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}

          {/* History Pill */}
          <button
            onClick={() => onOpenHistory(task)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/70 hover:bg-indigo-950 text-slate-400 hover:text-indigo-300 border border-slate-700/50 transition-colors"
            title="View Audit Log & Timestamp History"
          >
            <Clock className="w-3 h-3" />
            <span className="font-mono">{historyCount}</span>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEditTask(task)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Edit Task"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onArchiveTask(taskId)}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Archive Task"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const TaskCard = React.memo(TaskCardComponent);
