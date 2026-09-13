'use client';

import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ITaskDoc, IThreadDoc, ITag } from '@/lib/types';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { moveTaskAction } from '@/app/actions/tasks';
import { calculateMidpointOrder } from '@/lib/fractional-order';
import { Plus, SlidersHorizontal } from 'lucide-react';

interface KanbanBoardProps {
  thread: IThreadDoc;
  tasks: ITaskDoc[];
  onTasksChange: (tasks: ITaskDoc[]) => void;
  onOpenTagManager: () => void;
  onAddTask: (tagId?: string) => void;
  onOpenHistory: (task: ITaskDoc) => void;
  onEditTask: (task: ITaskDoc) => void;
  onArchiveTask: (taskId: string) => void;
}

export function KanbanBoard({
  thread,
  tasks,
  onTasksChange,
  onOpenTagManager,
  onAddTask,
  onOpenHistory,
  onEditTask,
  onArchiveTask,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<ITaskDoc | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const threadTags = useMemo(() => thread.tags || [], [thread.tags]);

  // Group tasks by tagId sorted by order with useMemo for high-performance rendering
  const tasksByTag = useMemo(() => {
    const map: { [tagId: string]: ITaskDoc[] } = {};
    for (const tag of threadTags) {
      map[tag.id] = [];
    }
    for (const task of tasks) {
      if (map[task.tagId]) {
        map[task.tagId].push(task);
      } else if (threadTags[0]) {
        if (!map[threadTags[0].id]) map[threadTags[0].id] = [];
        map[threadTags[0].id].push(task);
      }
    }
    for (const tagId in map) {
      map[tagId].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return map;
  }, [tasks, threadTags]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t._id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (activeId === overId) return;

    const activeTaskItem = tasks.find((t) => t._id === activeId);
    if (!activeTaskItem) return;

    const isOverColumn = threadTags.some((tag) => tag.id === overId);
    const overTaskItem = tasks.find((t) => t._id === overId);

    const targetTagId = isOverColumn ? overId : overTaskItem ? overTaskItem.tagId : null;

    if (targetTagId && activeTaskItem.tagId !== targetTagId) {
      const updated: ITaskDoc[] = tasks.map((t) => {
        if (t._id === activeId) {
          return { ...t, tagId: targetTagId };
        }
        return t;
      });
      onTasksChange(updated);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    const activeTaskItem = tasks.find((t) => t._id === activeId);
    if (!activeTaskItem) return;

    const isOverColumn = threadTags.some((tag) => tag.id === overId);
    const overTaskItem = tasks.find((t) => t._id === overId);

    const targetTagId = isOverColumn ? overId : overTaskItem ? overTaskItem.tagId : activeTaskItem.tagId;
    const sourceTagId = activeTaskItem.tagId;

    const columnTasks = (tasksByTag[targetTagId] || []).filter((t) => t._id !== activeId);

    let insertIndex = columnTasks.length;
    if (overTaskItem && overTaskItem.tagId === targetTagId) {
      insertIndex = columnTasks.findIndex((t) => t._id === overId);
      if (insertIndex === -1) insertIndex = columnTasks.length;
    }

    const prevTask = columnTasks[insertIndex - 1];
    const nextTask = columnTasks[insertIndex];

    const prevOrder = prevTask ? prevTask.order : null;
    const nextOrder = nextTask ? nextTask.order : null;
    const newFractionalOrder = calculateMidpointOrder(prevOrder, nextOrder);

    // If dropped back in the same column and same position, exit cleanly without network call
    if (
      sourceTagId === targetTagId &&
      Math.abs((activeTaskItem.order || 0) - newFractionalOrder) < 0.0001
    ) {
      return;
    }

    const rollbackSnapshot = [...tasks];

    const optimisticTasks: ITaskDoc[] = tasks.map((t) => {
      if (t._id === activeId) {
        return {
          ...t,
          tagId: targetTagId,
          order: newFractionalOrder,
        };
      }
      return t;
    });
    onTasksChange(optimisticTasks);

    const res = await moveTaskAction({
      taskId: activeId,
      threadId: thread._id,
      sourceTagId,
      targetTagId,
      targetOrder: newFractionalOrder,
      prevOrder,
      nextOrder,
    });

    if (!res.success) {
      onTasksChange(rollbackSnapshot);
      setErrorToast(res.error || 'Failed to move task');
      setTimeout(() => setErrorToast(null), 4000);
    }
  };

  const handleQuickMove = async (taskId: string, targetTagId: string) => {
    const task = tasks.find((t) => t._id === taskId);
    if (!task || task.tagId === targetTagId) return;

    const sourceTagId = task.tagId;
    const columnTasks = tasksByTag[targetTagId] || [];
    const highestTask = columnTasks[columnTasks.length - 1];
    const prevOrder = highestTask ? highestTask.order : null;
    const nextOrder = null;
    const newFractionalOrder = calculateMidpointOrder(prevOrder, nextOrder);

    const rollbackSnapshot = [...tasks];

    const optimistic: ITaskDoc[] = tasks.map((t) => {
      if (t._id === taskId) {
        return { ...t, tagId: targetTagId, order: newFractionalOrder };
      }
      return t;
    });
    onTasksChange(optimistic);

    const res = await moveTaskAction({
      taskId,
      threadId: thread._id,
      sourceTagId,
      targetTagId,
      targetOrder: newFractionalOrder,
      prevOrder,
      nextOrder,
    });

    if (!res.success) {
      onTasksChange(rollbackSnapshot);
      setErrorToast(res.error || 'Failed to update status');
      setTimeout(() => setErrorToast(null), 4000);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {errorToast && (
        <div className="mx-6 mt-3 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center justify-between animate-in slide-in-from-top">
          <span>{errorToast}</span>
          <button onClick={() => setErrorToast(null)} className="text-white hover:underline ml-3">
            Dismiss
          </button>
        </div>
      )}

      {/* Board Controls / Columns Header */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: thread.color || '#6366f1' }}
            />
            <h1 className="text-lg font-bold text-white tracking-tight">{thread.name}</h1>
          </div>
          {thread.description && (
            <span className="text-xs text-slate-400 border-l border-slate-700 pl-3">
              {thread.description}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTagManager}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Customize Columns</span>
          </button>

          <button
            onClick={() => onAddTask(threadTags[0]?.id)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-medium text-white transition-colors shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* DnD Kanban Columns Stream */}
      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-start gap-5 h-full pb-4 min-w-max">
            {threadTags.map((tag) => (
              <KanbanColumn
                key={tag.id}
                tag={tag}
                tasks={tasksByTag[tag.id] || []}
                allTags={threadTags}
                onAddTask={onAddTask}
                onOpenHistory={onOpenHistory}
                onEditTask={onEditTask}
                onArchiveTask={onArchiveTask}
                onQuickMove={handleQuickMove}
              />
            ))}

            {/* Add Column Quick Placeholder Button */}
            <div
              onClick={onOpenTagManager}
              className="w-72 shrink-0 h-40 rounded-2xl border-2 border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/40 flex flex-col items-center justify-center text-slate-500 hover:text-indigo-300 cursor-pointer transition-all duration-200"
            >
              <Plus className="w-6 h-6 mb-1 text-slate-400" />
              <span className="text-xs font-semibold">+ Add New Column</span>
            </div>
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="w-80 rotate-2 scale-105 shadow-2xl">
                <TaskCard
                  task={activeTask}
                  tags={threadTags}
                  onOpenHistory={() => {}}
                  onEditTask={() => {}}
                  onArchiveTask={() => {}}
                  onQuickMove={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
