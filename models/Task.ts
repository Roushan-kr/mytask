import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ITaskHistory {
  action: 'created' | 'moved' | 'updated' | 'archived';
  fromTag?: string | null;
  toTag: string;
  timestamp: Date;
  details?: string;
  userId?: Types.ObjectId;
}

export interface ITask extends Document {
  threadId: Types.ObjectId;
  creatorId: Types.ObjectId;
  assigneeId?: Types.ObjectId | null;
  title: string;
  description: string;
  tagId: string;
  order: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date | null;
  remind_frequency?: number | null; // In hours (e.g. 24, 72, 39)
  last_reminded?: Date | null; // Timestamp of when last reminder notification was triggered
  history: ITaskHistory[];
  isArchived: boolean;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TaskHistorySchema = new Schema<ITaskHistory>(
  {
    action: {
      type: String,
      enum: ['created', 'moved', 'updated', 'archived'],
      required: true,
    },
    fromTag: { type: String, default: null },
    toTag: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, required: true },
    details: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const TaskSchema = new Schema<ITask>(
  {
    threadId: {
      type: Schema.Types.ObjectId,
      ref: 'Thread',
      required: true,
      index: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    tagId: { type: String, required: true, index: true },
    order: { type: Number, required: true, default: 1000 },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    dueDate: { type: Date },
    remind_frequency: { type: Number, min: 1, default: null },
    last_reminded: { type: Date, default: null },
    history: { type: [TaskHistorySchema], default: [] },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// High-speed compound indexes for Kanban lookups, calendar timeline, and cron reminder checks
TaskSchema.index({ threadId: 1, isArchived: 1, order: 1 });
TaskSchema.index({ threadId: 1, tagId: 1, order: 1 });
TaskSchema.index({ assigneeId: 1, isArchived: 1 });
TaskSchema.index({ creatorId: 1, isArchived: 1 });
TaskSchema.index({ isArchived: 1, tagId: 1, remind_frequency: 1 });
TaskSchema.index({ 'history.timestamp': 1 });

export const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
