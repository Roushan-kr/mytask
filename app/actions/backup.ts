'use server';

import { connectDB } from '@/lib/db';
import { Thread } from '@/models/Thread';
import { Task } from '@/models/Task';
import { getCurrentSession } from '@/lib/auth';
import { verifyThreadAccess } from '@/lib/auth/permissions';
import { revalidatePath } from 'next/cache';
import { Types } from 'mongoose';

export async function exportThreadBackupAction(threadId: string) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) return { success: false, error: 'Unauthorized' };

    const access = await verifyThreadAccess(session.userId, threadId, 'viewer');
    if (!access) return { success: false, error: 'Unauthorized to export this thread' };

    await connectDB();
    const thread = access.thread;
    const tasks = await Task.find({
      threadId: new Types.ObjectId(threadId),
      isArchived: false,
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return {
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        version: '1.2',
        thread: JSON.parse(JSON.stringify(thread)),
        tasks: JSON.parse(JSON.stringify(tasks)),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to export thread backup' };
  }
}

export async function exportAllBackupAction() {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) return { success: false, error: 'Unauthorized' };

    await connectDB();
    const userObjId = new Types.ObjectId(session.userId);

    const threads = await Thread.find({
      isArchived: false,
      $or: [{ ownerId: userObjId }, { memberUserIds: userObjId }],
    })
      .sort({ order: 1 })
      .lean();

    const accessibleThreadIds = threads.map((t) => t._id);
    const tasks = await Task.find({
      threadId: { $in: accessibleThreadIds },
      isArchived: false,
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return {
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        version: '1.2',
        threads: JSON.parse(JSON.stringify(threads)),
        tasks: JSON.parse(JSON.stringify(tasks)),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to export full backup' };
  }
}

export async function importTasksIntoThreadAction(payload: {
  threadId: string;
  tasks: Array<{
    title: string;
    description?: string;
    status?: string;
    tagId?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: string;
    remind_frequency?: number | null;
  }>;
}) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) return { success: false, error: 'Unauthorized' };

    const { threadId, tasks } = payload;
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return { success: false, error: 'No tasks found in import payload' };
    }

    const access = await verifyThreadAccess(session.userId, threadId, 'editor');
    if (!access) return { success: false, error: 'Unauthorized to import tasks into this thread' };

    await connectDB();
    const thread = access.thread;
    const availableTags = thread.tags || [];
    const defaultTagId = availableTags[0]?.id || 'todo';

    // Find highest order in target thread to append imported tasks sequentially
    const highestTask = await Task.findOne({
      threadId: new Types.ObjectId(threadId),
      isArchived: false,
    })
      .sort({ order: -1 })
      .select('order')
      .lean();
    let currentOrder = (highestTask?.order || 0) + 1000;

    const now = new Date();
    const docsToCreate = tasks.map((t) => {
      // Map status name to matching tagId if available
      let resolvedTagId = t.tagId;
      if (!resolvedTagId && t.status) {
        const found = availableTags.find(
          (tag: any) => tag.name.toLowerCase() === t.status?.toLowerCase() || tag.id === t.status
        );
        resolvedTagId = found ? found.id : defaultTagId;
      }
      if (!resolvedTagId) resolvedTagId = defaultTagId;

      currentOrder += 1000;

      return {
        threadId: new Types.ObjectId(threadId),
        creatorId: new Types.ObjectId(session.userId),
        title: t.title.trim(),
        description: t.description || '',
        tagId: resolvedTagId,
        priority: t.priority || 'medium',
        dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
        remind_frequency: t.remind_frequency && t.remind_frequency > 0 ? t.remind_frequency : null,
        order: currentOrder,
        history: [
          {
            action: 'created',
            fromTag: null,
            toTag: resolvedTagId,
            timestamp: now,
            details: 'Imported from backup',
            userId: new Types.ObjectId(session.userId),
          },
        ],
        isArchived: false,
      };
    });

    const created = await Task.insertMany(docsToCreate);

    revalidatePath(`/?thread=${threadId}`);
    return {
      success: true,
      importedCount: created.length,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to import tasks' };
  }
}
