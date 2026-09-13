export interface ITag {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface ITaskHistoryItem {
  action: 'created' | 'moved' | 'updated' | 'archived';
  fromTag?: string | null;
  toTag: string;
  timestamp: string | Date;
  details?: string;
}

export interface IThreadDoc {
  _id: string;
  name: string;
  description: string;
  color: string;
  tags: ITag[];
  order: number;
  isArchived: boolean;
  archivedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ITaskDoc {
  _id: string;
  threadId: string;
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
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}
