import { connectDB } from '@/lib/db';
import { PushSubscription } from '@/models/PushSubscription';
import { sendWebPushNotification } from '@/lib/push';
import { Types } from 'mongoose';

export type NotificationType =
  | 'task_reminder'
  | 'task_assigned'
  | 'status_changed'
  | 'ai_agent_action'
  | 'system';

export interface INotifyUserOptions {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    taskId?: string;
    threadId?: string;
    url?: string;
    [key: string]: any;
  };
}

/**
 * Universal notification dispatcher.
 * Dispatches Web Push notifications to all registered devices for the given user.
 */
export async function notifyUser(options: INotifyUserOptions): Promise<{ sent: number; expired: number }> {
  if (!options.userId || !Types.ObjectId.isValid(options.userId)) {
    return { sent: 0, expired: 0 };
  }

  await connectDB();
  const subscriptions = await PushSubscription.find({
    userId: new Types.ObjectId(options.userId),
  }).lean();

  if (subscriptions.length === 0) {
    return { sent: 0, expired: 0 };
  }

  const payload = {
    title: options.title,
    body: options.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: `${options.type}-${options.data?.taskId || 'general'}`,
    data: {
      url: options.data?.url || '/',
      type: options.type,
      timestamp: new Date().toISOString(),
      ...options.data,
    },
  };

  const results = await Promise.allSettled(
    subscriptions.map((sub: any) =>
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

  return { sent, expired };
}
