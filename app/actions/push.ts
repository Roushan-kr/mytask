'use server';

import { connectDB } from '@/lib/db';
import { PushSubscription } from '@/models/PushSubscription';
import { getCurrentSession } from '@/lib/auth';
import { pushSubscriptionSchema } from '@/lib/validations';

export async function savePushSubscriptionAction(payload: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}) {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const parsed = pushSubscriptionSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid subscription data' };
    }

    await connectDB();

    // Upsert subscription based on unique endpoint
    await PushSubscription.findOneAndUpdate(
      { endpoint: parsed.data.endpoint },
      {
        endpoint: parsed.data.endpoint,
        keys: parsed.data.keys,
        userAgent: parsed.data.userAgent || '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save subscription' };
  }
}

export async function removePushSubscriptionAction(endpoint: string) {
  try {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    await connectDB();
    await PushSubscription.deleteOne({ endpoint });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to remove subscription' };
  }
}

export async function getVapidPublicKeyAction() {
  const key =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  return { publicKey: key };
}
