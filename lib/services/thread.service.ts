import { connectDB } from '@/lib/db';
import { Thread } from '@/models/Thread';
import { IThreadDoc, ITag } from '@/lib/types';
import { verifyThreadAccess } from '@/lib/auth/permissions';
import { Types } from 'mongoose';

export interface ICleanThread {
  id: string;
  name: string;
  description?: string;
  color: string;
  role: 'owner' | 'editor' | 'viewer';
  statuses: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

const DEFAULT_TAGS: ITag[] = [
  { id: 'todo', name: 'todo', color: '#3b82f6', order: 0 },
  { id: 'done', name: 'done', color: '#10b981', order: 1 },
  { id: 'schedule-later', name: 'schedule latter', color: '#8b5cf6', order: 2 },
];

/**
 * Service to manage Thread queries and status column resolution.
 */
export const threadService = {
  /**
   * List all threads accessible to the user.
   * Auto-provisions a default workspace thread if the user has none.
   */
  async listThreads(userId: string): Promise<ICleanThread[]> {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return [];
    }

    await connectDB();
    const userObjId = new Types.ObjectId(userId);

    let threads = await Thread.find({
      isArchived: false,
      $or: [{ ownerId: userObjId }, { memberUserIds: userObjId }],
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    // Auto-provision default Main Thread for new users
    if (threads.length === 0) {
      const defaultThread = await Thread.create({
        ownerId: userObjId,
        name: 'Main Workspace',
        description: 'Primary project Kanban board',
        color: '#6366f1',
        tags: DEFAULT_TAGS,
        order: 1000,
        memberUserIds: [],
        members: [{ userId: userObjId, role: 'owner', addedAt: new Date() }],
      });
      threads = [defaultThread.toObject()];
    }

    return threads.map((t: any) => {
      const isOwner = t.ownerId?.toString() === userId;
      const member = t.members?.find((m: any) => m.userId?.toString() === userId);
      const role = isOwner ? 'owner' : (member?.role as any) || 'editor';

      return {
        id: t._id.toString(),
        name: t.name,
        description: t.description || undefined,
        color: t.color || '#6366f1',
        role,
        statuses: (t.tags || []).map((tag: ITag) => ({
          id: tag.id,
          name: tag.name,
          color: tag.color,
        })),
      };
    });
  },

  async getThreadById(userId: string, threadId: string): Promise<IThreadDoc | null> {
    const access = await verifyThreadAccess(userId, threadId, 'viewer');
    if (!access) return null;
    return JSON.parse(JSON.stringify(access.thread)) as IThreadDoc;
  },

  /**
   * Resolves a human-provided status name (e.g. "Done", "to-do", "schedule")
   * or direct tag ID to the matching tag ID in the thread.
   */
  async resolveTag(threadId: string, statusOrTagId: string): Promise<string> {
    if (!threadId || !Types.ObjectId.isValid(threadId)) {
      return statusOrTagId || 'todo';
    }
    await connectDB();
    const thread = await Thread.findById(threadId).lean();
    if (!thread || !thread.tags || thread.tags.length === 0) {
      return statusOrTagId || 'todo';
    }

    const cleanInput = statusOrTagId.trim().toLowerCase();

    // 1. Direct ID match
    const directMatch = thread.tags.find((t) => t.id.toLowerCase() === cleanInput);
    if (directMatch) return directMatch.id;

    // 2. Name match (case-insensitive)
    const nameMatch = thread.tags.find((t) => t.name.toLowerCase() === cleanInput);
    if (nameMatch) return nameMatch.id;

    // 3. Partial or slug match
    const slugInput = cleanInput.replace(/[^a-z0-9]+/g, '-');
    const slugMatch = thread.tags.find(
      (t) => t.id.includes(slugInput) || t.name.toLowerCase().includes(cleanInput)
    );
    if (slugMatch) return slugMatch.id;

    // Fallback to first available tag
    return thread.tags[0].id;
  },
};
