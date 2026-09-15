'use client';

import React, { useState, useEffect } from 'react';
import { ITaskDoc, ITag } from '@/lib/types';
import { createTaskAction, updateTaskAction } from '@/app/actions/tasks';
import { getThreadMembersAction, IThreadMemberInfo } from '@/app/actions/threads';
import { X, Check, Calendar, AlertCircle, Bell, CheckSquare, Plus, User } from 'lucide-react';
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
  const [assigneeId, setAssigneeId] = useState<string>(
    taskToEdit?.assigneeId || ''
  );
  const [dueDate, setDueDate] = useState(
    taskToEdit?.dueDate ? new Date(taskToEdit.dueDate).toISOString().split('T')[0] : ''
  );
  const [remindFrequency, setRemindFrequency] = useState<string>(
    taskToEdit?.remind_frequency ? String(taskToEdit.remind_frequency) : ''
  );
  const [members, setMembers] = useState<IThreadMemberInfo[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEscapeKey(isOpen, onClose);

  // Fetch thread members for assignment dropdown
  useEffect(() => {
    if (isOpen && threadId) {
      getThreadMembersAction(threadId).then((res) => {
        if (res.success && res.data) {
          setMembers(res.data);
        }
      });
    }
  }, [isOpen, threadId]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskInput.trim()) return;
    const updated = appendSubtaskToMarkdown(description, newSubtaskInput.trim());
    setDescription(updated);
    setNewSubtaskInput('');
  };

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
        assigneeId: assigneeId || null,
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
        assigneeId: assigneeId || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-white/10 relative overflow-hidden bg-slate-900/90 flex flex-col max-h-[90vh]">
        {/* Top Glow bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-purple-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <h2 className="text-base font-bold text-white">
            {taskToEdit ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto py-4 space-y-4 pr-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Description & Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, bullet points, or markdown checklists..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />

            {/* Quick Add Subtask Shortcut */}
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskInput}
                onChange={(e) => setNewSubtaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Add checklist subtask (Press Enter)..."
                className="flex-1 bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Interactive Checklist Preview */}
            {(() => {
              const subtasks = parseSubtasks(description);
              if (subtasks.length === 0) return null;

              return (
                <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                    <CheckSquare className="w-3 h-3 text-indigo-400" />
                    Subtasks ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
                  </span>
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

            <div className={taskToEdit ? '' : ''}>
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

            {/* Assignee Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Assignee</span>
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    👤 {m.name} ({m.role})
                  </option>
                ))}
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
                placeholder="e.g. 24 for daily"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs sm:text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
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
