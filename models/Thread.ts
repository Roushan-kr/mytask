import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { ThreadRole } from '@/lib/types';

export interface ITag {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface IThreadMemberDoc {
  userId: Types.ObjectId;
  role: ThreadRole;
  addedAt: Date;
}

export interface IThread extends Document {
  ownerId: Types.ObjectId;
  name: string;
  description: string;
  color: string;
  tags: ITag[];
  memberUserIds: Types.ObjectId[];
  members: IThreadMemberDoc[];
  order: number;
  isArchived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema = new Schema<ITag>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: String, default: '#6366f1' },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const ThreadMemberSchema = new Schema<IThreadMemberDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ThreadSchema = new Schema<IThread>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    color: { type: String, default: '#6366f1' },
    tags: {
      type: [TagSchema],
      default: [
        { id: 'todo', name: 'todo', color: '#3b82f6', order: 0 },
        { id: 'done', name: 'done', color: '#10b981', order: 1 },
        { id: 'schedule-later', name: 'schedule latter', color: '#8b5cf6', order: 2 },
      ],
    },
    memberUserIds: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    members: [ThreadMemberSchema],
    order: { type: Number, default: 1000 },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for high-speed scoped fetching
ThreadSchema.index({ ownerId: 1, isArchived: 1, order: 1 });
ThreadSchema.index({ memberUserIds: 1, isArchived: 1, order: 1 });

export const Thread: Model<IThread> =
  mongoose.models.Thread || mongoose.model<IThread>('Thread', ThreadSchema);
