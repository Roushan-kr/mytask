import { connectDB } from '@/lib/db';
import { Thread } from '@/models/Thread';
import { ThreadRole } from '@/lib/types';
import { Types } from 'mongoose';

const ROLE_RANKS: Record<ThreadRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export interface IThreadAccessResult {
  authorized: boolean;
  role: ThreadRole;
  thread: any;
}

/**
 * Unified permission gate to verify a user's access level on a thread.
 */
export async function verifyThreadAccess(
  userId: string,
  threadId: string,
  minRole: ThreadRole = 'viewer'
): Promise<IThreadAccessResult | null> {
  if (!userId || !threadId || !Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(threadId)) {
    return null;
  }

  await connectDB();
  const thread = await Thread.findById(threadId).lean();
  if (!thread || thread.isArchived) {
    return null;
  }

  // 1. Direct Owner has top-level permissions
  if (thread.ownerId?.toString() === userId) {
    return { authorized: true, role: 'owner', thread };
  }

  // 2. Member list check
  const member = thread.members?.find((m: any) => m.userId?.toString() === userId);
  if (member) {
    const userRole = (member.role as ThreadRole) || 'editor';
    const hasSufficientRole = ROLE_RANKS[userRole] >= ROLE_RANKS[minRole];
    if (hasSufficientRole) {
      return { authorized: true, role: userRole, thread };
    }
  }

  // 3. Fallback: If user in memberUserIds without explicit role, treat as editor
  const isMemberId = thread.memberUserIds?.some((id: any) => id?.toString() === userId);
  if (isMemberId) {
    const hasSufficientRole = ROLE_RANKS['editor'] >= ROLE_RANKS[minRole];
    if (hasSufficientRole) {
      return { authorized: true, role: 'editor', thread };
    }
  }

  return null;
}

/**
 * High-speed single-index scan returning all thread IDs accessible to a user.
 */
export async function getAccessibleThreadIds(userId: string): Promise<string[]> {
  if (!userId || !Types.ObjectId.isValid(userId)) {
    return [];
  }

  await connectDB();
  const userObjId = new Types.ObjectId(userId);
  const threads = await Thread.find({
    isArchived: false,
    $or: [{ ownerId: userObjId }, { memberUserIds: userObjId }],
  })
    .select('_id')
    .lean();

  return threads.map((t: any) => t._id.toString());
}
