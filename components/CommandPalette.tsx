'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { IThreadDoc, ITaskDoc } from '@/lib/types';
import {
  Search,
  Plus,
  Layers,
  Activity,
  Archive,
  Database,
  FileSpreadsheet,
  FileJson,
  Sliders,
  CheckCircle2,
  Command,
  ArrowRight,
  X,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  threads: IThreadDoc[];
  activeThread: IThreadDoc | null;
  tasks: ITaskDoc[];
  onSelectThread: (thread: IThreadDoc) => void;
  onOpenAddTask: () => void;
  onOpenDataBackup: () => void;
  onOpenTimeline: () => void;
  onOpenArchived: () => void;
  onOpenTagManager: () => void;
  onEditTask: (task: ITaskDoc) => void;
}

interface PaletteItem {
  id: string;
  category: 'Actions' | 'Threads' | 'Tasks';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  action: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  threads,
  activeThread,
  tasks,
  onSelectThread,
  onOpenAddTask,
  onOpenDataBackup,
  onOpenTimeline,
  onOpenArchived,
  onOpenTagManager,
  onEditTask,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build command items
  const allItems: PaletteItem[] = useMemo(() => {
    const items: PaletteItem[] = [];

    // 1. Actions
    items.push({
      id: 'action-new-task',
      category: 'Actions',
      title: 'Create New Task',
      subtitle: activeThread ? `Add task to ${activeThread.name}` : 'Create a new task',
      icon: <Plus className="w-4 h-4 text-indigo-400" />,
      badge: 'N',
      action: () => {
        onClose();
        onOpenAddTask();
      },
    });

    items.push({
      id: 'action-backup-hub',
      category: 'Actions',
      title: 'Data & Backup Hub (JSON / CSV)',
      subtitle: 'Export spreadsheets, full backups, or import tasks',
      icon: <Database className="w-4 h-4 text-emerald-400" />,
      badge: 'B',
      action: () => {
        onClose();
        onOpenDataBackup();
      },
    });

    items.push({
      id: 'action-timeline',
      category: 'Actions',
      title: 'Activity Timeline & Calendar',
      subtitle: 'View timestamped task audit logs and history',
      icon: <Activity className="w-4 h-4 text-purple-400" />,
      badge: 'T',
      action: () => {
        onClose();
        onOpenTimeline();
      },
    });

    items.push({
      id: 'action-archived',
      category: 'Actions',
      title: 'Archived Tasks Manager',
      subtitle: 'Search, restore, or permanently delete archived items',
      icon: <Archive className="w-4 h-4 text-amber-400" />,
      badge: 'A',
      action: () => {
        onClose();
        onOpenArchived();
      },
    });

    if (activeThread) {
      items.push({
        id: 'action-tags',
        category: 'Actions',
        title: 'Manage Status Columns & Tags',
        subtitle: `Customize Kanban columns for ${activeThread.name}`,
        icon: <Sliders className="w-4 h-4 text-sky-400" />,
        action: () => {
          onClose();
          onOpenTagManager();
        },
      });
    }

    // 2. Threads Switcher
    threads.forEach((t) => {
      items.push({
        id: `thread-${t._id}`,
        category: 'Threads',
        title: t.name,
        subtitle: `${t.tags?.length || 0} statuses${activeThread?._id === t._id ? ' (Current)' : ''}`,
        icon: (
          <div
            className="w-3.5 h-3.5 rounded-full shrink-0"
            style={{ backgroundColor: t.color || '#6366f1' }}
          />
        ),
        badge: activeThread?._id === t._id ? 'Active' : undefined,
        action: () => {
          onClose();
          onSelectThread(t);
        },
      });
    });

    // 3. Current Tasks
    tasks.forEach((task) => {
      items.push({
        id: `task-${task._id}`,
        category: 'Tasks',
        title: task.title,
        subtitle: task.description || undefined,
        icon: <CheckCircle2 className="w-4 h-4 text-slate-400" />,
        badge: task.priority,
        action: () => {
          onClose();
          onEditTask(task);
        },
      });
    });

    return items;
  }, [
    activeThread,
    threads,
    tasks,
    onClose,
    onOpenAddTask,
    onOpenDataBackup,
    onOpenTimeline,
    onOpenArchived,
    onOpenTagManager,
    onSelectThread,
    onEditTask,
  ]);

  // Filter items by query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const cleanQuery = query.toLowerCase().trim();
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(cleanQuery) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(cleanQuery)) ||
        item.category.toLowerCase().includes(cleanQuery)
    );
  }, [allItems, query]);

  // Handle keyboard arrow navigation & enter selection
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev <= 0 ? Math.max(0, filteredItems.length - 1) : prev - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-950/50">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search threads, or jump to tasks..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white font-mono shrink-0 ml-2"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No matching commands or tasks found.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'bg-indigo-600/20 text-white border border-indigo-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-lg bg-slate-800/80 shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate flex items-center gap-2">
                        <span>{item.title}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-medium text-slate-400 border border-slate-700/50 capitalize">
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Keyboard Footer Helper */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span><strong className="text-slate-400 font-mono">↑ ↓</strong> Navigate</span>
            <span><strong className="text-slate-400 font-mono">↵</strong> Select</span>
            <span><strong className="text-slate-400 font-mono">ESC</strong> Close</span>
          </div>
          <div className="text-slate-400 font-mono text-[10px]">
            Shortcuts: <span className="text-indigo-400 font-bold">N</span> (New Task) &bull; <span className="text-indigo-400 font-bold">⌘K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
