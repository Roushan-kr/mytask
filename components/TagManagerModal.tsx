'use client';

import React, { useState } from 'react';
import { ITag, IThreadDoc } from '@/lib/types';
import { updateThreadTagsAction } from '@/app/actions/threads';
import { X, Plus, Trash2, Tag, Check, AlertTriangle } from 'lucide-react';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: IThreadDoc | null;
  onUpdated: (updatedThread: IThreadDoc) => void;
}

const PRESET_COLORS = [
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#06b6d4',
  '#6366f1',
];

export function TagManagerModal({ isOpen, onClose, thread, onUpdated }: TagManagerModalProps) {
  const [tags, setTags] = useState<ITag[]>(thread?.tags || []);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deletingTag, setDeletingTag] = useState<ITag | null>(null);
  const [migrateTargetTagId, setMigrateTargetTagId] = useState<string>('');

  if (!isOpen || !thread) return null;

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    const slug = newTagName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-');

    let finalId = slug;
    let counter = 1;
    while (tags.some((t) => t.id === finalId)) {
      finalId = `${slug}-${counter++}`;
    }

    const newTag: ITag = {
      id: finalId,
      name: newTagName.trim(),
      color: newTagColor,
      order: tags.length,
    };

    setTags([...tags, newTag]);
    setNewTagName('');
    setNewTagColor(PRESET_COLORS[(tags.length + 1) % PRESET_COLORS.length]);
  };

  const handleUpdateTag = (id: string, updates: Partial<ITag>) => {
    setTags(tags.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const handleDeletePrompt = (tag: ITag) => {
    if (tags.length <= 1) {
      setError('A thread must have at least one status tag.');
      return;
    }
    const remaining = tags.filter((t) => t.id !== tag.id);
    setMigrateTargetTagId(remaining[0]?.id || '');
    setDeletingTag(tag);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTag) return;
    setSaving(true);
    setError(null);

    const updatedTagsList = tags.filter((t) => t.id !== deletingTag.id);

    const res = await updateThreadTagsAction({
      threadId: thread._id,
      tags: updatedTagsList,
      deletedTagId: deletingTag.id,
      migrateTasksToTagId: migrateTargetTagId || undefined,
    });

    setSaving(false);
    if (res.success && res.data) {
      setTags(res.data.tags);
      setDeletingTag(null);
      onUpdated(res.data);
    } else {
      setError(res.error || 'Failed to delete tag');
    }
  };

  const handleSaveAll = async () => {
    if (tags.length === 0) {
      setError('A thread must have at least one tag column.');
      return;
    }

    setSaving(true);
    setError(null);

    const res = await updateThreadTagsAction({
      threadId: thread._id,
      tags,
    });

    setSaving(false);
    if (res.success && res.data) {
      onUpdated(res.data);
      onClose();
    } else {
      setError(res.error || 'Failed to save tags');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-white/10 relative max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-none">Manage Custom Statuses</h2>
              <p className="text-xs text-slate-400 mt-1">
                Customize Kanban columns for <span className="text-indigo-300 font-medium">{thread.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Delete Tag Migration Prompt */}
        {deletingTag && (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Delete column &quot;{deletingTag.name}&quot;?</p>
                <p className="text-xs text-slate-300 mt-1">
                  Choose what should happen to existing tasks in this status:
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-slate-300 font-medium">Move existing tasks to:</label>
              <select
                value={migrateTargetTagId}
                onChange={(e) => setMigrateTargetTagId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {tags
                  .filter((t) => t.id !== deletingTag.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                <option value="">Archive remaining tasks</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTag(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
              >
                {saving ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}

        {/* Existing Tags list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Current Columns ({tags.length})
          </label>

          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="relative group/color shrink-0">
                <div
                  className="w-5 h-5 rounded-full ring-2 ring-white/20 cursor-pointer"
                  style={{ backgroundColor: tag.color }}
                />
              </div>

              <input
                type="text"
                value={tag.name}
                onChange={(e) => handleUpdateTag(tag.id, { name: e.target.value })}
                className="flex-1 bg-transparent border-0 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5"
              />

              <div className="flex items-center gap-1">
                {PRESET_COLORS.slice(0, 4).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleUpdateTag(tag.id, { color: c })}
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${
                      tag.color === c ? 'scale-125 ring-1 ring-white' : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleDeletePrompt(tag)}
                className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                title="Delete Column"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add new tag section */}
        <form onSubmit={handleAddTag} className="pt-3 border-t border-slate-800 space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Add New Column / Status
          </label>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 shrink-0 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewTagColor(c)}
                  className={`w-4 h-4 rounded-full transition-transform ${
                    newTagColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-50 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="e.g. In Review, Backlog"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <button
              type="submit"
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm flex items-center gap-1 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Footer actions */}
        <div className="pt-4 mt-2 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Columns'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
