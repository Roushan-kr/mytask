import { connectDB } from '@/lib/db';
import { Thread } from '@/models/Thread';
import { IThreadDoc, ITag } from '@/lib/types';
import { Types } from 'mongoose';

export interface ICleanThread {
  id: string;
  name: string;
  description?: string;
  color: string;
  statuses: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

/**
 * Service to manage Thread queries and status column resolution.
 */
export const threadService = {
  async listThreads(): Promise<ICleanThread[]> {
    await connectDB();
    const threads = await Thread.find({ isArchived: false }).sort({ order: 1, createdAt: 1 }).lean();

    return threads.map((t: any) => ({
      id: t._id.toString(),
      name: t.name,
      description: t.description || undefined,
      color: t.color || '#6366f1',
      statuses: (t.tags || []).map((tag: ITag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      })),
    }));
  },

  async getThreadById(threadId: string): Promise<IThreadDoc | null> {
    if (!threadId || !Types.ObjectId.isValid(threadId)) {
      return null;
    }
    await connectDB();
    const thread = await Thread.findById(threadId).lean();
    if (!thread) return null;
    return JSON.parse(JSON.stringify(thread)) as IThreadDoc;
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
    const slugMatch = thread.tags.find((t) => t.id.includes(slugInput) || t.name.toLowerCase().includes(cleanInput));
    if (slugMatch) return slugMatch.id;

    // Fallback to first available tag
    return thread.tags[0].id;
  },
};
