import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { PushSubscription } from '@/models/PushSubscription';
import { pushSubscriptionSchema } from '@/lib/validations';
import { getCurrentSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = pushSubscriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid subscription data' },
        { status: 400 }
      );
    }

    await connectDB();

    await PushSubscription.findOneAndUpdate(
      { endpoint: parsed.data.endpoint },
      {
        endpoint: parsed.data.endpoint,
        keys: parsed.data.keys,
        userAgent: parsed.data.userAgent || '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, message: 'Subscription registered' });
  } catch (error: any) {
    console.error('[Push/Subscribe] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint } = await request.json();
    if (!endpoint) {
      return NextResponse.json({ success: false, error: 'Endpoint required' }, { status: 400 });
    }

    await connectDB();
    await PushSubscription.deleteOne({ endpoint });

    return NextResponse.json({ success: true, message: 'Subscription removed' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
