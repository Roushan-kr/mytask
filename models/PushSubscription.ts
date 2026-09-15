import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IPushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface IPushSubscription extends Document {
  userId: Types.ObjectId;
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
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true, index: true },
    keys: { type: PushSubscriptionKeysSchema, required: true },
    userAgent: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

PushSubscriptionSchema.index({ userId: 1, createdAt: -1 });

export const PushSubscription: Model<IPushSubscription> =
  mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);
