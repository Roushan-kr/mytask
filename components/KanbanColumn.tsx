'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ITaskDoc, ITag } from '@/lib/types';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  tag: ITag;
  tasks: ITaskDoc[];
  allTags: ITag[];
  onAddTask: (tagId: string) => void;
  onOpenHistory: (task: ITaskDoc) => void;
  onEditTask: (task: ITaskDoc) => void;
  onArchiveTask: (taskId: string) => void;
  onQuickMove: (taskId: string, targetTagId: string) => void;
}

export function KanbanColumn({
  tag,
  tasks,
  allTags,
  onAddTask,
  onOpenHistory,
  onEditTask,
  onArchiveTask,
  onQuickMove,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: tag.id,
    data: {
      type: 'Column',
      tag,
    },
  });

  const taskIds = tasks.map((t) => t._id);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-[84vw] max-w-[320px] sm:w-80 shrink-0 snap-center rounded-2xl transition-colors border ${
        isOver
          ? 'bg-slate-900/90 border-indigo-500/60 ring-2 ring-indigo-500/20'
          : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700/80'
      } backdrop-blur-md max-h-full`}
    >
      {/* Column Header */}
      <div className="p-3.5 pb-2.5 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div
            className="w-3 h-3 rounded-full shadow-sm ring-2 ring-white/10"
            style={{ backgroundColor: tag.color }}
          />
          <h2 className="font-semibold text-sm text-white capitalize tracking-wide">
            {tag.name}
          </h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700/50">
            {tasks.length}
          </span>
        </div>

        <button
          onClick={() => onAddTask(tag.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={`Add task to ${tag.name}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Task Droppable List */}
      <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[140px]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              tags={allTags}
              onOpenHistory={onOpenHistory}
              onEditTask={onEditTask}
              onArchiveTask={onArchiveTask}
              onQuickMove={onQuickMove}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="h-28 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-500 text-xs p-3 text-center">
            <span>No tasks in {tag.name}</span>
            <button
              onClick={() => onAddTask(tag.id)}
              className="mt-1.5 text-indigo-400 hover:text-indigo-300 font-medium"
            >
              + Add first task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
