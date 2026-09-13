import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const tagSchema = z.object({
  id: z.string().min(1, 'Tag ID is required'),
  name: z.string().min(1, 'Tag name is required').max(50, 'Tag name too long'),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Valid hex color required'),
  order: z.number().default(0),
});

export const createThreadSchema = z.object({
  name: z.string().min(1, 'Thread name is required').max(100, 'Thread name too long'),
  description: z.string().max(500).optional().default(''),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional().default('#6366f1'),
  tags: z.array(tagSchema).optional(),
});

export const updateThreadSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  name: z.string().min(1, 'Thread name is required').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
});

export const updateThreadTagsSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  tags: z.array(tagSchema).min(1, 'At least one tag status is required'),
  deletedTagId: z.string().optional(),
  migrateTasksToTagId: z.string().optional(),
});

export const createTaskSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  title: z.string().min(1, 'Task title is required').max(200),
  description: z.string().max(2000).optional().default(''),
  tagId: z.string().min(1, 'Tag status is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z.string().nullable().optional(),
  remind_frequency: z.number().positive().nullable().optional(),
  prevOrder: z.number().nullable().optional(),
  nextOrder: z.number().nullable().optional(),
});

export const updateTaskSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  title: z.string().min(1, 'Task title is required').max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().nullable().optional(),
  remind_frequency: z.number().positive().nullable().optional(),
});

export const moveTaskSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  threadId: z.string().min(1, 'Thread ID is required'),
  sourceTagId: z.string().min(1, 'Source tag ID is required'),
  targetTagId: z.string().min(1, 'Target tag ID is required'),
  targetOrder: z.number().optional(),
  prevOrder: z.number().nullable().optional(),
  nextOrder: z.number().nullable().optional(),
});

export const archiveTaskSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
});

export const archiveThreadSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url('Valid subscription endpoint required'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh key is required'),
    auth: z.string().min(1, 'auth key is required'),
  }),
  userAgent: z.string().optional(),
});
