import { connectDB } from '@/lib/db';
import { Task } from '@/models/Task';
import { Thread } from '@/models/Thread';
import { calculateSubtaskProgress } from '@/lib/subtasks';
import { threadService } from './thread.service';
import { verifyThreadAccess, getAccessibleThreadIds } from '@/lib/auth/permissions';
import { Types } from 'mongoose';

export interface ICleanTask {
  id: string;
  threadId: string;
  creatorId: string;
  assigneeId?: string;
  title: string;
  description?: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  remindFrequencyHours?: number | null;
  subtasksSummary?: {
    total: number;
    completed: number;
    percent: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ITaskFilter {
  threadId?: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  searchQuery?: string;
  dueBefore?: string;
  dueAfter?: string;
  limit?: number;
}

const MAX_TASK_HISTORY_RECORDS = 100;

function formatCleanTask(t: any): ICleanTask {
  const subtasks = calculateSubtaskProgress(t.description);
  return {
    id: t._id.toString(),
    threadId: t.threadId.toString(),
    creatorId: t.creatorId?.toString() || '',
    assigneeId: t.assigneeId ? t.assigneeId.toString() : undefined,
    title: t.title,
    description: t.description || undefined,
    status: t.tagId || 'todo',
    priority: t.priority || 'medium',
    dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : undefined,
    remindFrequencyHours: t.remind_frequency || undefined,
    subtasksSummary:
      subtasks.total > 0
        ? {
            total: subtasks.total,
            completed: subtasks.completed,
            percent: subtasks.percent,
          }
        : undefined,
    createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export const taskService = {
  /**
   * High-signal task query scoped to user-accessible threads with optional multi-attribute filters.
   */
  async getTasks(userId: string, filter: ITaskFilter = {}): Promise<ICleanTask[]> {
    if (!userId) return [];
    await connectDB();

    let targetThreadIds: string[] = [];

    if (filter.threadId) {
      const access = await verifyThreadAccess(userId, filter.threadId, 'viewer');
      if (!access) return [];
      targetThreadIds = [filter.threadId];
    } else {
      targetThreadIds = await getAccessibleThreadIds(userId);
      if (targetThreadIds.length === 0) return [];
    }

    const query: any = {
      isArchived: false,
      threadId: { $in: targetThreadIds.map((id) => new Types.ObjectId(id)) },
    };

    if (filter.priority) {
      query.priority = filter.priority;
    }

    if (filter.status && filter.threadId) {
      const resolvedTag = await threadService.resolveTag(filter.threadId, filter.status);
      query.tagId = resolvedTag;
    } else if (filter.status) {
      query.tagId = filter.status.toLowerCase();
    }

    if (filter.searchQuery && filter.searchQuery.trim()) {
      const searchRegex = new RegExp(filter.searchQuery.trim(), 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    if (filter.dueBefore || filter.dueAfter) {
      query.dueDate = {};
      if (filter.dueBefore) query.dueDate.$lte = new Date(filter.dueBefore);
      if (filter.dueAfter) query.dueDate.$gte = new Date(filter.dueAfter);
    }

    const limit = Math.min(filter.limit || 50, 100);
    const tasks = await Task.find(query)
      .sort({ order: 1, createdAt: 1 })
      .limit(limit)
      .lean();

    return tasks.map(formatCleanTask);
  },

  /**
   * Creates a new task with automated order calculation and audit logging.
   */
  async createTask(
    userId: string,
    params: {
      threadId?: string;
      title: string;
      description?: string;
      status?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      assigneeId?: string;
      dueDate?: string;
      remindFrequencyHours?: number | null;
      source?: 'web' | 'mcp' | 'api';
    }
  ): Promise<ICleanTask> {
    await connectDB();

    // 1. Resolve Target Thread
    let targetThreadId = params.threadId;
    if (!targetThreadId) {
      const userThreads = await threadService.listThreads(userId);
      if (userThreads.length === 0) throw new Error('No accessible thread found.');
      targetThreadId = userThreads[0].id;
    }

    const access = await verifyThreadAccess(userId, targetThreadId, 'editor');
    if (!access) throw new Error('Unauthorized. You do not have edit permissions on this thread.');

    // 2. Resolve Tag / Status
    let resolvedTagId = 'todo';
    if (params.status) {
      resolvedTagId = await threadService.resolveTag(targetThreadId, params.status);
    } else {
      const thread = access.thread;
      resolvedTagId = thread?.tags?.[0]?.id || 'todo';
    }

    // 3. Fractional Order: Append to bottom of column
    const highestInTag = await Task.findOne({
      threadId: new Types.ObjectId(targetThreadId),
      tagId: resolvedTagId,
      isArchived: false,
    })
      .sort({ order: -1 })
      .select('order')
      .lean();
    const taskOrder = (highestInTag?.order || 0) + 1000;

    const now = new Date();
    const sourceActor = params.source || 'mcp';

    const task = await Task.create({
      threadId: new Types.ObjectId(targetThreadId),
      creatorId: new Types.ObjectId(userId),
      assigneeId: params.assigneeId && Types.ObjectId.isValid(params.assigneeId) ? new Types.ObjectId(params.assigneeId) : null,
      title: params.title.trim(),
      description: params.description || '',
      tagId: resolvedTagId,
      priority: params.priority || 'medium',
      dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
      remind_frequency: params.remindFrequencyHours || undefined,
      order: taskOrder,
      history: [
        {
          action: 'created',
          fromTag: null,
          toTag: resolvedTagId,
          timestamp: now,
          details: `Created via ${sourceActor.toUpperCase()}`,
          userId: new Types.ObjectId(userId),
        },
      ],
      isArchived: false,
    });

    return formatCleanTask(task);
  },

  /**
   * Updates task attributes (title, description/subtasks, priority, dueDate, reminder, assignee).
   */
  async updateTask(
    userId: string,
    taskId: string,
    updates: {
      title?: string;
      description?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      assigneeId?: string | null;
      dueDate?: string | null;
      remindFrequencyHours?: number | null;
      source?: string;
    }
  ): Promise<ICleanTask> {
    await connectDB();
    const task = await Task.findById(taskId);
    if (!task) throw new Error(`Task '${taskId}' not found.`);

    const access = await verifyThreadAccess(userId, task.threadId.toString(), 'editor');
    if (!access) throw new Error('Unauthorized. You do not have permission to edit tasks in this thread.');

    if (updates.title !== undefined) task.title = updates.title.trim();
    if (updates.description !== undefined) task.description = updates.description;
    if (updates.assigneeId !== undefined) {
      task.assigneeId = updates.assigneeId && Types.ObjectId.isValid(updates.assigneeId) ? new Types.ObjectId(updates.assigneeId) : null;
    }
    if (updates.priority !== undefined) {
      if (task.priority !== updates.priority) {
        task.history.push({
          action: 'updated',
          fromTag: task.tagId,
          toTag: task.tagId,
          timestamp: new Date(),
          details: `Priority changed from '${task.priority}' to '${updates.priority}' via ${updates.source || 'MCP'}`,
          userId: new Types.ObjectId(userId),
        });
      }
      task.priority = updates.priority;
    }
    if (updates.dueDate !== undefined) {
      task.dueDate = updates.dueDate ? new Date(updates.dueDate) : undefined;
    }
    if (updates.remindFrequencyHours !== undefined) {
      task.remind_frequency = updates.remindFrequencyHours && updates.remindFrequencyHours > 0 ? updates.remindFrequencyHours : undefined;
    }

    if (task.history.length > MAX_TASK_HISTORY_RECORDS) {
      task.history = task.history.slice(-MAX_TASK_HISTORY_RECORDS);
    }

    await task.save();
    return formatCleanTask(task);
  },

  /**
   * Moves a task to a new Kanban column with human-readable status resolution.
   */
  async moveTaskStatus(
    userId: string,
    taskId: string,
    targetStatus: string,
    source = 'mcp'
  ): Promise<ICleanTask> {
    await connectDB();
    const task = await Task.findById(taskId);
    if (!task) throw new Error(`Task '${taskId}' not found.`);

    const access = await verifyThreadAccess(userId, task.threadId.toString(), 'editor');
    if (!access) throw new Error('Unauthorized. You do not have permission to move tasks in this thread.');

    const resolvedTagId = await threadService.resolveTag(task.threadId.toString(), targetStatus);
    const fromTag = task.tagId;

    if (fromTag === resolvedTagId) {
      return formatCleanTask(task);
    }

    task.tagId = resolvedTagId;
    task.history.push({
      action: 'moved',
      fromTag,
      toTag: resolvedTagId,
      timestamp: new Date(),
      details: `Moved from '${fromTag}' to '${resolvedTagId}' via ${source.toUpperCase()}`,
      userId: new Types.ObjectId(userId),
    });

    if (task.history.length > MAX_TASK_HISTORY_RECORDS) {
      task.history = task.history.slice(-MAX_TASK_HISTORY_RECORDS);
    }

    await task.save();
    return formatCleanTask(task);
  },

  /**
   * Archives a task safely without deleting history.
   */
  async archiveTask(userId: string, taskId: string, source = 'mcp'): Promise<{ id: string; success: boolean }> {
    await connectDB();
    const task = await Task.findById(taskId);
    if (!task) throw new Error(`Task '${taskId}' not found.`);

    const access = await verifyThreadAccess(userId, task.threadId.toString(), 'editor');
    if (!access) throw new Error('Unauthorized. You do not have permission to archive tasks in this thread.');

    task.isArchived = true;
    task.archivedAt = new Date();
    task.history.push({
      action: 'archived',
      fromTag: task.tagId,
      toTag: 'archived',
      timestamp: new Date(),
      details: `Archived via ${source.toUpperCase()}`,
      userId: new Types.ObjectId(userId),
    });

    if (task.history.length > MAX_TASK_HISTORY_RECORDS) {
      task.history = task.history.slice(-MAX_TASK_HISTORY_RECORDS);
    }

    await task.save();
    return { id: task._id.toString(), success: true };
  },

  /**
   * Returns workspace stats across user accessible threads.
   */
  async getWorkspaceStats(userId: string, threadId?: string) {
    await connectDB();
    let targetThreadIds: string[] = [];

    if (threadId) {
      const access = await verifyThreadAccess(userId, threadId, 'viewer');
      if (!access) return { totalTasks: 0, completedTasks: 0, pendingTasks: 0, urgentTasks: 0, overdueTasks: 0 };
      targetThreadIds = [threadId];
    } else {
      targetThreadIds = await getAccessibleThreadIds(userId);
      if (targetThreadIds.length === 0) {
        return { totalTasks: 0, completedTasks: 0, pendingTasks: 0, urgentTasks: 0, overdueTasks: 0 };
      }
    }

    const query: any = {
      isArchived: false,
      threadId: { $in: targetThreadIds.map((id) => new Types.ObjectId(id)) },
    };

    const tasks = await Task.find(query).select('tagId priority dueDate').lean();
    const now = new Date();

    const total = tasks.length;
    const completed = tasks.filter((t) => t.tagId === 'done').length;
    const urgent = tasks.filter((t) => t.priority === 'urgent').length;
    const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.tagId !== 'done').length;

    return {
      totalTasks: total,
      completedTasks: completed,
      pendingTasks: total - completed,
      urgentTasks: urgent,
      overdueTasks: overdue,
    };
  },
};
