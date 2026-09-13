import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface IPushSubscription extends Document {
  endpoint: string;
  keys: IPushSubscriptionKeys;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionKeysSchema = new Schema<IPushSubscriptionKeys>(
  {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  { _id: false }
);

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    endpoint: { type: String, required: true, unique: true, index: true },
    keys: { type: PushSubscriptionKeysSchema, required: true },
    userAgent: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export const PushSubscription: Model<IPushSubscription> =
  mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);
