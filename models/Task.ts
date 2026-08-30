import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ITaskHistory {
  action: 'created' | 'moved' | 'updated' | 'archived';
  fromTag?: string | null;
  toTag: string;
  timestamp: Date;
  details?: string;
}

export interface ITask extends Document {
  threadId: Types.ObjectId;
  title: string;
  description: string;
  tagId: string;
  order: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  history: ITaskHistory[];
  isArchived: boolean;
  archivedAt?: Date;
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
    history: { type: [TaskHistorySchema], default: [] },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound and specialized indexes for high-speed queries & calendar grouping
TaskSchema.index({ threadId: 1, tagId: 1, order: 1 });
TaskSchema.index({ threadId: 1, isArchived: 1 });
TaskSchema.index({ 'history.timestamp': 1 });

export const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
