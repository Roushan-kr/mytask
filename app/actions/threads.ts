'use server';

import { connectDB } from '@/lib/db';
import { Thread } from '@/models/Thread';
import { Task } from '@/models/Task';
import { getCurrentSession } from '@/lib/auth';
import { ITag, IThreadDoc } from '@/lib/types';
import {
  createThreadSchema,
  updateThreadSchema,
  updateThreadTagsSchema,
  archiveThreadSchema,
} from '@/lib/validations';
import { revalidatePath } from 'next/cache';

export async function getThreadsAction(): Promise<{ success: boolean; data?: IThreadDoc[]; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    await connectDB();
    const threads = await Thread.find({ isArchived: false }).sort({ order: 1, createdAt: 1 }).lean();

    return {
      success: true,
      data: JSON.parse(JSON.stringify(threads)),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch threads' };
  }
}

export async function createThreadAction(payload: {
  name: string;
  description?: string;
  color?: string;
  tags?: ITag[];
}): Promise<{ success: boolean; data?: IThreadDoc; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const parsed = createThreadSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Validation error' };
    }

    await connectDB();

    const maxOrderThread = await Thread.findOne({ isArchived: false }).sort({ order: -1 }).select('order').lean();
    const nextOrder = (maxOrderThread?.order || 0) + 1000;

    const defaultTags: ITag[] = [
      { id: 'todo', name: 'todo', color: '#3b82f6', order: 0 },
      { id: 'done', name: 'done', color: '#10b981', order: 1 },
      { id: 'schedule-later', name: 'schedule latter', color: '#8b5cf6', order: 2 },
    ];

    const thread = await Thread.create({
      name: parsed.data.name,
      description: parsed.data.description || '',
      color: parsed.data.color || '#6366f1',
      tags: parsed.data.tags && parsed.data.tags.length > 0 ? parsed.data.tags : defaultTags,
      order: nextOrder,
    });

    revalidatePath('/');
    return { success: true, data: JSON.parse(JSON.stringify(thread)) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create thread' };
  }
}

export async function updateThreadAction(payload: {
  threadId: string;
  name: string;
  description?: string;
  color?: string;
}): Promise<{ success: boolean; data?: IThreadDoc; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const parsed = updateThreadSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Validation error' };
    }

    await connectDB();
    const updated = await Thread.findByIdAndUpdate(
      parsed.data.threadId,
      {
        name: parsed.data.name,
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.color && { color: parsed.data.color }),
      },
      { new: true }
    ).lean();

    revalidatePath('/');
    return { success: true, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update thread' };
  }
}

export async function updateThreadTagsAction(payload: {
  threadId: string;
  tags: ITag[];
  deletedTagId?: string;
  migrateTasksToTagId?: string;
}): Promise<{ success: boolean; data?: IThreadDoc; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const parsed = updateThreadTagsSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Validation error' };
    }

    await connectDB();

    // If a tag was deleted, handle its existing tasks
    if (parsed.data.deletedTagId) {
      if (parsed.data.migrateTasksToTagId) {
        const affectedTasks = await Task.find({
          threadId: parsed.data.threadId,
          tagId: parsed.data.deletedTagId,
          isArchived: false,
        });

        for (const task of affectedTasks) {
          task.history.push({
            action: 'moved',
            fromTag: parsed.data.deletedTagId,
            toTag: parsed.data.migrateTasksToTagId,
            timestamp: new Date(),
            details: 'Migrated upon tag deletion',
          });
          task.tagId = parsed.data.migrateTasksToTagId;
          await task.save();
        }
      } else {
        await Task.updateMany(
          {
            threadId: parsed.data.threadId,
            tagId: parsed.data.deletedTagId,
            isArchived: false,
          },
          {
            $set: { isArchived: true, archivedAt: new Date() },
            $push: {
              history: {
                action: 'archived',
                fromTag: parsed.data.deletedTagId,
                toTag: 'archived',
                timestamp: new Date(),
                details: 'Archived automatically because tag was deleted',
              },
            },
          }
        );
      }
    }

    const updated = await Thread.findByIdAndUpdate(
      parsed.data.threadId,
      { tags: parsed.data.tags },
      { new: true }
    ).lean();

    revalidatePath('/');
    return { success: true, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update tags' };
  }
}

export async function archiveThreadAction(payload: { threadId: string }) {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const parsed = archiveThreadSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Validation error' };
    }

    await connectDB();
    const now = new Date();

    await Thread.findByIdAndUpdate(parsed.data.threadId, {
      isArchived: true,
      archivedAt: now,
    });

    await Task.updateMany(
      { threadId: parsed.data.threadId, isArchived: false },
      {
        $set: { isArchived: true, archivedAt: now },
        $push: {
          history: {
            action: 'archived',
            toTag: 'archived',
            timestamp: now,
            details: 'Archived with parent thread',
          },
        },
      }
    );

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to archive thread' };
  }
}
