export type ThreadRole = 'owner' | 'editor' | 'viewer';

export interface ITag {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface IThreadMember {
  userId: string;
  role: ThreadRole;
  addedAt: string | Date;
}

export interface ITaskHistoryItem {
  action: 'created' | 'moved' | 'updated' | 'archived';
  fromTag?: string | null;
  toTag: string;
  timestamp: string | Date;
  details?: string;
  userId?: string;
}

export interface IUserDoc {
  _id: string;
  email: string;
  name?: string;
  mcpApiKeyPreview?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IThreadDoc {
  _id: string;
  ownerId: string;
  name: string;
  description: string;
  color: string;
  tags: ITag[];
  memberUserIds?: string[];
  members?: IThreadMember[];
  order: number;
  isArchived: boolean;
  archivedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ITaskDoc {
  _id: string;
  threadId: string;
  creatorId: string;
  assigneeId?: string | null;
  title: string;
  description: string;
  tagId: string;
  order: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | Date | null;
  remind_frequency?: number | null; // Frequency in hours
  last_reminded?: string | Date | null; // Last reminded date
  history: ITaskHistoryItem[];
  isArchived: boolean;
  archivedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IPushSubscriptionDoc {
  _id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}
