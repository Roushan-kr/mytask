'use server';

import { connectDB } from '@/lib/db';
import { Task } from '@/models/Task';
import { getCurrentSession } from '@/lib/auth';
import { ITaskDoc } from '@/lib/types';
import {
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
  archiveTaskSchema,
} from '@/lib/validations';
import {
  calculateMidpointOrder,
  isRebalanceNeeded,
  rebalanceSequence,
} from '@/lib/fractional-order';
import { revalidatePath } from 'next/cache';

const MAX_TASK_HISTORY_RECORDS = 100;

export async function getTasksAction(threadId: string): Promise<{ success: boolean; data?: ITaskDoc[]; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    await connectDB();
    const tasks = await Task.find({
      threadId,
      isArchived: false,
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return {
      success: true,
      data: JSON.parse(JSON.stringify(tasks)),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch tasks' };
  }
}

export async function createTaskAction(payload: {
  threadId: string;
  title: string;
  description?: string;
  tagId: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  remind_frequency?: number | null;
  prevOrder?: number | null;
  nextOrder?: number | null;
}): Promise<{ success: boolean; data?: ITaskDoc; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const parsed = createTaskSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Validation error' };
    }

    await connectDB();

    let taskOrder: number;
    if (parsed.data.prevOrder !== undefined || parsed.data.nextOrder !== undefined) {
      taskOrder = calculateMidpointOrder(parsed.data.prevOrder, parsed.data.nextOrder);
    } else {
      const highestInTag = await Task.findOne({
        threadId: parsed.data.threadId,
        tagId: parsed.data.tagId,
        isArchived: false,
      })
        .sort({ order: -1 })
        .select('order')
        .lean();

      taskOrder = (highestInTag?.order || 0) + 1000;
    }

    const now = new Date();
    const task = await Task.create({
      threadId: parsed.data.threadId,
      title: parsed.data.title,
      description: parsed.data.description || '',
      tagId: parsed.data.tagId,
      priority: parsed.data.priority || 'medium',
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      remind_frequency: parsed.data.remind_frequency ?? undefined,
      order: taskOrder,
      history: [
        {
          action: 'created',
          fromTag: null,
          toTag: parsed.data.tagId,
          timestamp: now,
          details: `Created in '${parsed.data.tagId}'`,
        },
      ],
    });

    revalidatePath(`/?thread=${parsed.data.threadId}`);
    return { success: true, data: JSON.parse(JSON.stringify(task)) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create task' };
  }
}

export async function updateTaskAction(payload: {
  taskId: string;
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  remind_frequency?: number | null;
}): Promise<{ success: boolean; data?: ITaskDoc; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const parsed = updateTaskSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Validation error' };
    }

    await connectDB();
    const existing = await Task.findById(parsed.data.taskId);
    if (!existing) return { success: false, error: 'Task not found' };

    const updates: any = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority;
    if (parsed.data.dueDate !== undefined) {
      updates.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
    }
    if (parsed.data.remind_frequency !== undefined) {
      updates.remind_frequency = parsed.data.remind_frequency ?? null;
    }

    if (parsed.data.priority && parsed.data.priority !== existing.priority) {
      existing.history.push({
        action: 'updated',
        fromTag: existing.tagId,
        toTag: existing.tagId,
        timestamp: new Date(),
        details: `Priority updated to ${parsed.data.priority}`,
      });
      if (existing.history.length > MAX_TASK_HISTORY_RECORDS) {
        existing.history = existing.history.slice(-MAX_TASK_HISTORY_RECORDS);
      }
    }

    Object.assign(existing, updates);
    await existing.save();

    revalidatePath(`/?thread=${existing.threadId}`);
    return { success: true, data: JSON.parse(JSON.stringify(existing)) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update task' };
  }
}

export async function moveTaskAction(payload: {
  taskId: string;
  threadId: string;
  sourceTagId: string;
  targetTagId: string;
  targetOrder?: number;
  prevOrder?: number | null;
  nextOrder?: number | null;
}): Promise<{ success: boolean; data?: ITaskDoc; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const parsed = moveTaskSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Validation error' };
    }

    await connectDB();
    const task = await Task.findOne({
      _id: parsed.data.taskId,
      threadId: parsed.data.threadId,
    });

    if (!task) return { success: false, error: 'Task not found' };

    let newOrder = parsed.data.targetOrder;
    if (newOrder === undefined) {
      newOrder = calculateMidpointOrder(parsed.data.prevOrder, parsed.data.nextOrder);
    }

    const fromTag = task.tagId;
    const toTag = parsed.data.targetTagId;
    const isStatusChanged = fromTag !== toTag;
    const isOrderChanged = Math.abs((task.order || 0) - (newOrder || 0)) > 0.00001;

    // If neither status nor position changed, skip DB update & history append
    if (!isStatusChanged && !isOrderChanged) {
      return { success: true, data: JSON.parse(JSON.stringify(task)) };
    }

    task.tagId = toTag;
    task.order = newOrder;

    // Only record in Audit History when the status tag genuinely changes
    if (isStatusChanged) {
      task.history.push({
        action: 'moved',
        fromTag,
        toTag,
        timestamp: new Date(),
        details: `Moved from '${fromTag}' to '${toTag}'`,
      });
      if (task.history.length > MAX_TASK_HISTORY_RECORDS) {
        task.history = task.history.slice(-MAX_TASK_HISTORY_RECORDS);
      }
    }

    await task.save();

    if (
      parsed.data.prevOrder != null &&
      parsed.data.nextOrder != null &&
      isRebalanceNeeded(parsed.data.prevOrder, parsed.data.nextOrder)
    ) {
      const columnTasks = await Task.find({
        threadId: parsed.data.threadId,
        tagId: toTag,
        isArchived: false,
      })
        .sort({ order: 1 })
        .select('_id order');

      const rebalanced = rebalanceSequence(columnTasks);
      const bulkOps = rebalanced.map((item) => ({
        updateOne: {
          filter: { _id: item._id },
          update: { $set: { order: item.order } },
        },
      }));

      if (bulkOps.length > 0) {
        await Task.bulkWrite(bulkOps);
      }
    }

    revalidatePath(`/?thread=${parsed.data.threadId}`);
    return { success: true, data: JSON.parse(JSON.stringify(task)) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to move task' };
  }
}

export async function archiveTaskAction(payload: { taskId: string }) {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const parsed = archiveTaskSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Validation error' };
    }

    await connectDB();
    const task = await Task.findById(parsed.data.taskId);
    if (!task) return { success: false, error: 'Task not found' };

    task.isArchived = true;
    task.archivedAt = new Date();
    task.history.push({
      action: 'archived',
      fromTag: task.tagId,
      toTag: 'archived',
      timestamp: new Date(),
      details: 'Task archived',
    });
    if (task.history.length > MAX_TASK_HISTORY_RECORDS) {
      task.history = task.history.slice(-MAX_TASK_HISTORY_RECORDS);
    }

    await task.save();
    revalidatePath(`/?thread=${task.threadId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to archive task' };
  }
}

export async function getTaskTimelineAction(threadId?: string) {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    await connectDB();
    const query: any = {};
    if (threadId) {
      query.threadId = threadId;
    }

    const tasks = await Task.find(query).select('title tagId history threadId createdAt').lean();

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

    const events: TimelineEvent[] = [];

    for (const t of tasks) {
      if (t.history && Array.isArray(t.history)) {
        for (const h of t.history) {
          events.push({
            taskId: t._id.toString(),
            taskTitle: t.title,
            threadId: t.threadId.toString(),
            action: h.action,
            fromTag: h.fromTag,
            toTag: h.toTag,
            timestamp: new Date(h.timestamp).toISOString(),
            details: h.details,
          });
        }
      }
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      success: true,
      data: events,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch timeline' };
  }
}

export async function getArchivedTasksAction(threadId?: string): Promise<{ success: boolean; data?: ITaskDoc[]; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    await connectDB();
    const query: any = { isArchived: true };
    if (threadId) {
      query.threadId = threadId;
    }

    const tasks = await Task.find(query).sort({ archivedAt: -1, updatedAt: -1 }).lean();
    return {
      success: true,
      data: JSON.parse(JSON.stringify(tasks)),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch archived tasks' };
  }
}

export async function restoreTaskAction(payload: { taskId: string }) {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    await connectDB();
    const task = await Task.findById(payload.taskId);
    if (!task) return { success: false, error: 'Task not found' };

    task.isArchived = false;
    task.archivedAt = null;
    task.history.push({
      action: 'updated',
      fromTag: 'archived',
      toTag: task.tagId,
      timestamp: new Date(),
      details: 'Restored from archive',
    });
    if (task.history.length > MAX_TASK_HISTORY_RECORDS) {
      task.history = task.history.slice(-MAX_TASK_HISTORY_RECORDS);
    }

    await task.save();
    revalidatePath(`/?thread=${task.threadId}`);
    return { success: true, data: JSON.parse(JSON.stringify(task)) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to restore task' };
  }
}

/**
 * Permanently deletes task and its entire audit history from MongoDB.
 */
export async function permanentlyDeleteTaskAction(payload: { taskId: string }) {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    await connectDB();
    const deleted = await Task.findByIdAndDelete(payload.taskId);
    if (!deleted) return { success: false, error: 'Task not found or already deleted' };

    revalidatePath(`/?thread=${deleted.threadId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to permanently delete task' };
  }
}
