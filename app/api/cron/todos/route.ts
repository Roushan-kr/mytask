import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Task } from '@/models/Task';
import { notifyUser } from '@/lib/push/notify';
import { timingSafeCompare } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 15; // Vercel function execution timeout

export async function POST(request: NextRequest) {
  return handleCronExecution(request);
}

// Allow GET for easy browser testing and webhook monitoring
export async function GET(request: NextRequest) {
  return handleCronExecution(request);
}

async function handleCronExecution(request: NextRequest) {
  try {
    // 1. Constant-time Cron Authorization check
    const authHeader = request.headers.get('authorization') || '';
    const cronSecret = process.env.CRON_SECRET || 'default_cron_secret_taskflow_2026';
    const querySecret = request.nextUrl.searchParams.get('secret');

    let token = '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (querySecret) {
      token = querySecret.trim();
    }

    if (!timingSafeCompare(token, cronSecret)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Invalid CRON_SECRET.' },
        { status: 401 }
      );
    }

    await connectDB();
    const now = new Date();

    // 2. High-speed query: MongoDB engine calculates reminder intervals directly
    const dueTasks = await Task.find({
      isArchived: false,
      tagId: { $regex: /todo/i }, // Matches 'todo', 'Todo', 'todo-friday', etc.
      remind_frequency: { $gt: 0 },
      $or: [
        { last_reminded: null },
        {
          $expr: {
            $gte: [
              { $subtract: [now, '$last_reminded'] },
              { $multiply: ['$remind_frequency', 3600000] }, // Hours to milliseconds
            ],
          },
        },
      ],
    })
      .select('_id title tagId remind_frequency creatorId assigneeId')
      .limit(100)
      .lean();

    if (dueTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No todo tasks currently due for reminder.',
        dueTasksCount: 0,
      });
    }

    // 3. Mark tasks as reminded immediately in 1 bulk query
    const dueTaskIds = dueTasks.map((t) => t._id);
    await Task.updateMany(
      { _id: { $in: dueTaskIds } },
      { $set: { last_reminded: now } }
    );

    // 4. Group due tasks by recipient user (assigneeId || creatorId)
    const userTaskMap = new Map<string, any[]>();
    for (const task of dueTasks) {
      const recipientId = (task.assigneeId || task.creatorId)?.toString();
      if (!recipientId) continue;
      if (!userTaskMap.has(recipientId)) {
        userTaskMap.set(recipientId, []);
      }
      userTaskMap.get(recipientId)!.push(task);
    }

    // 5. Dispatch per-user notifications in parallel
    let totalSent = 0;
    let totalExpired = 0;

    const dispatchPromises = Array.from(userTaskMap.entries()).map(async ([userId, tasks]) => {
      const preview = tasks.slice(0, 3).map((t) => t.title).join(', ');
      const moreCount = tasks.length > 3 ? ` (+${tasks.length - 3} more)` : '';

      const { sent, expired } = await notifyUser({
        userId,
        type: 'task_reminder',
        title: `🔔 TaskFlow: ${tasks.length} Todo ${tasks.length === 1 ? 'Task' : 'Tasks'} Due`,
        body: `Pending: ${preview}${moreCount}`,
        data: {
          dueTasksCount: tasks.length,
          timestamp: now.toISOString(),
        },
      });

      totalSent += sent;
      totalExpired += expired;
    });

    await Promise.allSettled(dispatchPromises);

    return NextResponse.json({
      success: true,
      dueTasksCount: dueTasks.length,
      usersNotified: userTaskMap.size,
      notifiedSubscriptions: totalSent,
      expiredRemoved: totalExpired,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron/Todos] Error processing notifications:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
