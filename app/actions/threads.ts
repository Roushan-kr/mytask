'use server';

import { connectDB } from '@/lib/db';
import { Thread } from '@/models/Thread';
import { Task } from '@/models/Task';
import { getCurrentSession } from '@/lib/auth';
import { verifyThreadAccess } from '@/lib/auth/permissions';
import { ITag, IThreadDoc } from '@/lib/types';
import {
  createThreadSchema,
  updateThreadSchema,
  updateThreadTagsSchema,
  archiveThreadSchema,
} from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import { Types } from 'mongoose';

const MAX_TASK_HISTORY_RECORDS = 100;

export async function getThreadsAction(): Promise<{ success: boolean; data?: IThreadDoc[]; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    await connectDB();
    const userObjId = new Types.ObjectId(session.userId);

    let threads = await Thread.find({
      isArchived: false,
      $or: [{ ownerId: userObjId }, { memberUserIds: userObjId }],
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    // Auto-provision default Main Workspace for new user
    if (threads.length === 0) {
      const defaultThread = await Thread.create({
        ownerId: userObjId,
        name: 'Main Workspace',
        description: 'Primary project Kanban board',
        color: '#6366f1',
        tags: [
          { id: 'todo', name: 'todo', color: '#3b82f6', order: 0 },
          { id: 'done', name: 'done', color: '#10b981', order: 1 },
          { id: 'schedule-later', name: 'schedule latter', color: '#8b5cf6', order: 2 },
        ],
        order: 1000,
        memberUserIds: [],
        members: [{ userId: userObjId, role: 'owner', addedAt: new Date() }],
      });
      threads = [defaultThread.toObject()];
    }

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
    const userObjId = new Types.ObjectId(session.userId);

    const maxOrderThread = await Thread.findOne({
      isArchived: false,
      $or: [{ ownerId: userObjId }, { memberUserIds: userObjId }],
    })
      .sort({ order: -1 })
      .select('order')
      .lean();
    const nextOrder = (maxOrderThread?.order || 0) + 1000;

    const defaultTags: ITag[] = [
      { id: 'todo', name: 'todo', color: '#3b82f6', order: 0 },
      { id: 'done', name: 'done', color: '#10b981', order: 1 },
      { id: 'schedule-later', name: 'schedule latter', color: '#8b5cf6', order: 2 },
    ];

    const thread = await Thread.create({
      ownerId: userObjId,
      name: parsed.data.name,
      description: parsed.data.description || '',
      color: parsed.data.color || '#6366f1',
      tags: parsed.data.tags && parsed.data.tags.length > 0 ? parsed.data.tags : defaultTags,
      order: nextOrder,
      memberUserIds: [],
      members: [{ userId: userObjId, role: 'owner', addedAt: new Date() }],
    });

    revalidatePath(`/?thread=${thread._id}`);
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

    const access = await verifyThreadAccess(session.userId, parsed.data.threadId, 'editor');
    if (!access) return { success: false, error: 'Unauthorized to edit this thread' };

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

    revalidatePath(`/?thread=${parsed.data.threadId}`);
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

    const access = await verifyThreadAccess(session.userId, parsed.data.threadId, 'editor');
    if (!access) return { success: false, error: 'Unauthorized to edit thread tags' };

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
            userId: new Types.ObjectId(session.userId),
          });
          if (task.history.length > MAX_TASK_HISTORY_RECORDS) {
            task.history = task.history.slice(-MAX_TASK_HISTORY_RECORDS);
          }
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
                $each: [
                  {
                    action: 'archived',
                    fromTag: parsed.data.deletedTagId,
                    toTag: 'archived',
                    timestamp: new Date(),
                    details: 'Archived automatically because tag was deleted',
                    userId: new Types.ObjectId(session.userId),
                  },
                ],
                $slice: -MAX_TASK_HISTORY_RECORDS,
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

    revalidatePath(`/?thread=${parsed.data.threadId}`);
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

    const access = await verifyThreadAccess(session.userId, parsed.data.threadId, 'owner');
    if (!access) return { success: false, error: 'Only thread owners can archive this thread' };

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
            $each: [
              {
                action: 'archived',
                toTag: 'archived',
                timestamp: now,
                details: 'Archived with parent thread',
                userId: new Types.ObjectId(session.userId),
              },
            ],
            $slice: -MAX_TASK_HISTORY_RECORDS,
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
