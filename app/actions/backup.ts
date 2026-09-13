'use server';

import { connectDB } from '@/lib/db';
import { Thread } from '@/models/Thread';
import { Task } from '@/models/Task';
import { getCurrentSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function exportThreadBackupAction(threadId: string) {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    await connectDB();
    const thread = await Thread.findById(threadId).lean();
    if (!thread) return { success: false, error: 'Thread not found' };

    const tasks = await Task.find({ threadId }).sort({ order: 1, createdAt: 1 }).lean();

    return {
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
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
    if (!session) return { success: false, error: 'Unauthorized' };

    await connectDB();
    const threads = await Thread.find({ isArchived: false }).sort({ order: 1 }).lean();
    const tasks = await Task.find({ isArchived: false }).sort({ order: 1, createdAt: 1 }).lean();

    return {
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
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
    if (!session) return { success: false, error: 'Unauthorized' };

    const { threadId, tasks } = payload;
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return { success: false, error: 'No tasks found in import payload' };
    }

    await connectDB();
    const thread = await Thread.findById(threadId);
    if (!thread) return { success: false, error: 'Target thread not found' };

    const availableTags = thread.tags || [];
    const defaultTagId = availableTags[0]?.id || 'todo';

    // Find highest order in target thread to append imported tasks sequentially
    const highestTask = await Task.findOne({ threadId, isArchived: false })
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
          (tag) => tag.name.toLowerCase() === t.status?.toLowerCase() || tag.id === t.status
        );
        resolvedTagId = found ? found.id : defaultTagId;
      }
      if (!resolvedTagId) resolvedTagId = defaultTagId;

      currentOrder += 1000;

      return {
        threadId,
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
