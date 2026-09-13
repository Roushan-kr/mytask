import webpush from 'web-push';
import { PushSubscription } from '@/models/PushSubscription';

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@fossptu.dev';

let vapidConfigured = false;

export function configureVapid(): boolean {
  if (vapidConfigured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[WebPush] VAPID keys not configured in environment variables.');
    return false;
  }

  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
    return true;
  } catch (error) {
    console.error('[WebPush] Failed to set VAPID details:', error);
    return false;
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    taskId?: string;
    threadId?: string;
    [key: string]: any;
  };
}

/**
 * Sends a web push notification to a single subscription.
 * If endpoint returns 410 (Gone) or 404 (Not Found), automatically deletes the expired subscription.
 */
export async function sendWebPushNotification(
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
  payload: PushNotificationPayload
): Promise<{ success: boolean; expired?: boolean; error?: string }> {
  const isConfigured = configureVapid();
  if (!isConfigured) {
    return { success: false, error: 'VAPID is not configured' };
  }

  try {
    const stringifiedPayload = JSON.stringify(payload);
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      stringifiedPayload
    );

    return { success: true };
  } catch (err: any) {
    const statusCode = err?.statusCode;

    // 404 Not Found or 410 Gone indicates the browser unregistered or token expired
    if (statusCode === 410 || statusCode === 404) {
      try {
        await PushSubscription.deleteOne({ endpoint: subscription.endpoint });
      } catch (dbErr) {
        console.error('[WebPush] Error deleting expired subscription:', dbErr);
      }
      return { success: false, expired: true, error: 'Subscription expired and removed' };
    }

    return { success: false, error: err?.message || 'Push delivery failed' };
  }
}
