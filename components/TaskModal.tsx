'use client';

import React, { useState, useEffect } from 'react';
import { ITaskDoc, ITag } from '@/lib/types';
import { createTaskAction, updateTaskAction } from '@/app/actions/tasks';
import { X, Check, Calendar, AlertCircle, Bell, CheckSquare, Plus } from 'lucide-react';
import { parseSubtasks, toggleSubtaskInMarkdown, appendSubtaskToMarkdown } from '@/lib/subtasks';

import { useEscapeKey } from '@/lib/hooks/useEscapeKey';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  tags: ITag[];
  taskToEdit?: ITaskDoc | null;
  defaultTagId?: string;
  onSaved: (task: ITaskDoc) => void;
}

export function TaskModal({
  isOpen,
  onClose,
  threadId,
  tags,
  taskToEdit,
  defaultTagId,
  onSaved,
}: TaskModalProps) {
  const [title, setTitle] = useState(taskToEdit?.title || '');
  const [description, setDescription] = useState(taskToEdit?.description || '');
  const [tagId, setTagId] = useState(
    taskToEdit?.tagId || defaultTagId || tags[0]?.id || 'todo'
  );
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(
    taskToEdit?.priority || 'medium'
  );
  const [dueDate, setDueDate] = useState(
    taskToEdit?.dueDate ? new Date(taskToEdit.dueDate).toISOString().split('T')[0] : ''
  );
  const [remindFrequency, setRemindFrequency] = useState<string>(
    taskToEdit?.remind_frequency ? String(taskToEdit.remind_frequency) : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    const freqNum = remindFrequency ? parseFloat(remindFrequency) : null;

    if (taskToEdit) {
      const res = await updateTaskAction({
        taskId: taskToEdit._id,
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || null,
        remind_frequency: freqNum && freqNum > 0 ? freqNum : null,
      });

      setIsSaving(false);
      if (res.success && res.data) {
        onSaved(res.data);
        onClose();
      } else {
        setError(res.error || 'Failed to update task');
      }
    } else {
      const res = await createTaskAction({
        threadId,
        title: title.trim(),
        description: description.trim(),
        tagId,
        priority,
        dueDate: dueDate || null,
        remind_frequency: freqNum && freqNum > 0 ? freqNum : null,
      });

      setIsSaving(false);
      if (res.success && res.data) {
        onSaved(res.data);
        onClose();
      } else {
        setError(res.error || 'Failed to create task');
      }
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel w-full max-w-lg rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/10 relative max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-white leading-none">
            {taskToEdit ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1 min-h-0">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Task Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design wireframes for mobile view"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Description / Notes & Checklists
              </label>
              <button
                type="button"
                onClick={() => setDescription((prev) => appendSubtaskToMarkdown(prev, 'New checklist item'))}
                className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
              >
                <Plus className="w-3 h-3" />
                <span>Add Subtask</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key requirements or markdown checklist (- [ ] task)..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-sans"
            />

            {/* Interactive Subtasks Preview in Modal */}
            {(() => {
              const subtasks = parseSubtasks(description);
              if (subtasks.length === 0) return null;
              return (
                <div className="mt-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-1">
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Interactive Checklist ({subtasks.filter((s) => s.completed).length}/{subtasks.length} completed):</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {subtasks.map((st) => (
                      <label
                        key={st.index}
                        className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none p-1 rounded hover:bg-slate-900/60"
                      >
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={() => setDescription((prev) => toggleSubtaskInMarkdown(prev, st.index))}
                          className="w-3.5 h-3.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 cursor-pointer"
                        />
                        <span className={st.completed ? 'line-through text-slate-500' : ''}>
                          {st.text}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!taskToEdit && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Initial Status
                </label>
                <select
                  value={tagId}
                  onChange={(e) => setTagId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
                >
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={taskToEdit ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🔵 Medium</option>
                <option value="high">🟠 High</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Due Date (Optional)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Reminder Frequency in Hours */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">Remind Every (Hours)</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={remindFrequency}
                onChange={(e) => setRemindFrequency(e.target.value)}
                placeholder="e.g. 24, 72, 39"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {[12, 24, 48, 72].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setRemindFrequency(String(h))}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                      remindFrequency === String(h)
                        ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
                {remindFrequency && (
                  <button
                    type="button"
                    onClick={() => setRemindFrequency('')}
                    className="text-[10px] px-1.5 py-0.5 text-slate-500 hover:text-rose-400"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : taskToEdit ? 'Save Changes' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
