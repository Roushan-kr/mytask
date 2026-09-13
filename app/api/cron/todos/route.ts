import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Task } from '@/models/Task';
import { PushSubscription } from '@/models/PushSubscription';
import { sendWebPushNotification } from '@/lib/push';
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

    // 2. High-speed single query: MongoDB engine calculates reminder intervals directly
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
      .select('_id title tagId remind_frequency')
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

    // 4. Fetch registered web push subscribers
    const subscriptions = await PushSubscription.find({}).lean();
    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tasks due, but no push subscriptions found.',
        dueTasksCount: dueTasks.length,
        notifiedSubscriptions: 0,
      });
    }

    // 5. Construct 1 consolidated notification digest
    const preview = dueTasks.slice(0, 3).map((t) => t.title).join(', ');
    const moreCount = dueTasks.length > 3 ? ` (+${dueTasks.length - 3} more)` : '';

    const payload = {
      title: `🔔 TaskFlow Reminder: ${dueTasks.length} Todo ${dueTasks.length === 1 ? 'Task' : 'Tasks'}`,
      body: `Pending: ${preview}${moreCount}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'todo-reminder',
      data: {
        url: '/',
        dueTasksCount: dueTasks.length,
        timestamp: now.toISOString(),
      },
    };

    // 6. Broadcast push in parallel with Promise.allSettled
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        sendWebPushNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
      )
    );

    let sent = 0;
    let expired = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.success) sent++;
        if (r.value.expired) expired++;
      }
    }

    return NextResponse.json({
      success: true,
      dueTasksCount: dueTasks.length,
      notifiedSubscriptions: sent,
      expiredRemoved: expired,
      timestamp: now.toISOString()
    });
  } catch (error: any) {
    console.error('[Cron/Todos] Error processing notifications:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
