'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IThreadDoc, ITaskDoc } from '@/lib/types';
import { getThreadsAction, createThreadAction } from '@/app/actions/threads';
import { getTasksAction, archiveTaskAction } from '@/app/actions/tasks';
import { getAuthSessionAction } from '@/app/actions/auth';
import { ThreadSidebar } from '@/components/ThreadSidebar';
import { KanbanBoard } from '@/components/KanbanBoard';
import { TaskModal } from '@/components/TaskModal';
import { TaskHistoryModal } from '@/components/TaskHistoryModal';
import { TagManagerModal } from '@/components/TagManagerModal';
import { TimelineDrawer } from '@/components/TimelineDrawer';
import { NotificationBell } from '@/components/NotificationBell';
import { ArchivedTasksModal } from '@/components/ArchivedTasksModal';
import { DataBackupModal } from '@/components/DataBackupModal';
import {
  Plus,
  Search,
  Filter,
  Layers,
  CheckCircle2,
  ListTodo,
  Menu,
} from 'lucide-react';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadParam = searchParams.get('thread');

  const [threads, setThreads] = useState<IThreadDoc[]>([]);
  const [activeThread, setActiveThread] = useState<IThreadDoc | null>(null);
  const [tasks, setTasks] = useState<ITaskDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('admin@taskflow.local');

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Search & Filters for Tasks
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<ITaskDoc | null>(null);
  const [defaultTagForNewTask, setDefaultTagForNewTask] = useState<string | undefined>();
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historySelectedTask, setHistorySelectedTask] = useState<ITaskDoc | null>(null);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);
  const [isDataBackupOpen, setIsDataBackupOpen] = useState(false);

  // Load User Session & Initial Threads
  const loadInitialData = useCallback(async () => {
    setLoading(true);

    const sessionRes = await getAuthSessionAction();
    if (sessionRes?.email) {
      setUserEmail(sessionRes.email);
    }

    const res = await getThreadsAction();
    if (res.success && res.data) {
      if (res.data.length === 0) {
        const starter = await createThreadAction({
          name: 'Main Project Thread',
          description: 'Default thread workspace',
          color: '#6366f1',
          tags: [
            { id: 'todo', name: 'todo', color: '#3b82f6', order: 0 },
            { id: 'done', name: 'done', color: '#10b981', order: 1 },
            { id: 'schedule-later', name: 'schedule latter', color: '#8b5cf6', order: 2 },
          ],
        });
        if (starter.success && starter.data) {
          setThreads([starter.data]);
          setActiveThread(starter.data);
          router.replace(`/?thread=${starter.data._id}`, { scroll: false });
        }
      } else {
        const loadedThreads = res.data;
        setThreads(loadedThreads);

        // Check if thread query param matches any existing thread
        const matched = threadParam ? loadedThreads.find((t) => t._id === threadParam) : null;
        const initialSelected = matched || loadedThreads[0];
        setActiveThread(initialSelected);

        if (initialSelected && (!threadParam || threadParam !== initialSelected._id)) {
          router.replace(`/?thread=${initialSelected._id}`, { scroll: false });
        }
      }
    }
    setLoading(false);
  }, [threadParam, router]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load Tasks when active thread changes
  const loadTasksForThread = useCallback(async (threadId: string) => {
    const res = await getTasksAction(threadId);
    if (res.success && res.data) {
      setTasks(res.data);
    }
  }, []);

  useEffect(() => {
    if (activeThread) {
      loadTasksForThread(activeThread._id);
    }
  }, [activeThread, loadTasksForThread]);

  // Handlers
  const handleSelectThread = (thread: IThreadDoc) => {
    setActiveThread(thread);
    router.replace(`/?thread=${thread._id}`, { scroll: false });
  };

  const handleThreadCreated = (newThread: IThreadDoc) => {
    setThreads([...threads, newThread]);
    setActiveThread(newThread);
    router.replace(`/?thread=${newThread._id}`, { scroll: false });
  };

  const handleThreadArchived = (threadId: string) => {
    const remaining = threads.filter((t) => t._id !== threadId);
    setThreads(remaining);
    const nextSelected = remaining[0] || null;
    setActiveThread(nextSelected);
    if (nextSelected) {
      router.replace(`/?thread=${nextSelected._id}`, { scroll: false });
    } else {
      router.replace('/', { scroll: false });
    }
  };

  const handleOpenAddTask = (tagId?: string) => {
    setTaskToEdit(null);
    setDefaultTagForNewTask(tagId);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: ITaskDoc) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleArchiveTask = async (taskId: string) => {
    if (confirm('Archive this task? Movement history will be preserved.')) {
      const res = await archiveTaskAction({ taskId });
      if (res.success) {
        setTasks(tasks.filter((t) => t._id !== taskId));
      }
    }
  };

  const handleTaskSaved = (savedTask: ITaskDoc) => {
    const exists = tasks.some((t) => t._id === savedTask._id);

    if (exists) {
      setTasks(tasks.map((t) => (t._id === savedTask._id ? savedTask : t)));
    } else {
      setTasks([...tasks, savedTask]);
    }
  };

  const handleTaskRestored = (restoredTask: ITaskDoc) => {
    if (activeThread && restoredTask.threadId === activeThread._id) {
      const exists = tasks.some((t) => t._id === restoredTask._id);
      if (!exists) {
        setTasks((prev) => [...prev, restoredTask]);
      }
    }
  };

  const handleOpenHistory = (task: ITaskDoc) => {
    setHistorySelectedTask(task);
    setIsHistoryModalOpen(true);
  };

  const handleThreadTagsUpdated = (updatedThread: IThreadDoc) => {
    setThreads(threads.map((t) => (t._id === updatedThread._id ? updatedThread : t)));
    setActiveThread(updatedThread);
    loadTasksForThread(updatedThread._id);
  };

  // Filter Tasks based on search & priority
  const visibleTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(taskSearchQuery.toLowerCase()));

    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  const activeThreadId = activeThread ? activeThread._id : null;

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Left Sidebar: Threads Navigation (Responsive Mobile Drawer + Desktop Sidebar) */}
      <ThreadSidebar
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={handleSelectThread}
        onThreadCreated={handleThreadCreated}
        onThreadArchived={handleThreadArchived}
        onOpenTimeline={() => setIsTimelineOpen(true)}
        onOpenArchived={() => setIsArchivedModalOpen(true)}
        onOpenDataBackup={() => setIsDataBackupOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        userEmail={userEmail}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950/60 min-w-0">
        {/* Top Navbar */}
        <header className="h-14 sm:h-16 border-b border-slate-800/80 px-3 sm:px-6 flex items-center justify-between gap-2.5 bg-slate-950/80 backdrop-blur-md shrink-0">
          {/* Mobile Hamburger + Quick Search & Filters */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 max-w-xl">
            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white md:hidden shrink-0 transition-colors"
              title="Open Threads Menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={taskSearchQuery}
                onChange={(e) => setTaskSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 sm:py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Priority Filter */}
            <div className="hidden xs:flex sm:flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-transparent text-slate-300 text-xs focus:outline-none pr-2 py-0.5 cursor-pointer"
              >
                <option value="all" className="bg-slate-900">All</option>
                <option value="low" className="bg-slate-900">Low</option>
                <option value="medium" className="bg-slate-900">Med</option>
                <option value="high" className="bg-slate-900">High</option>
                <option value="urgent" className="bg-slate-900">Urgent</option>
              </select>
            </div>
          </div>

          {/* Header Stats & Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden xl:flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <ListTodo className="w-4 h-4 text-indigo-400" />
                <span className="text-white font-semibold font-mono">{tasks.length}</span> Total
              </span>
              <span className="text-slate-700">|</span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-semibold font-mono">
                  {tasks.filter((t) => t.tagId === 'done').length}
                </span> Completed
              </span>
            </div>

            {/* Web Push Notification Bell Toggle */}
            <NotificationBell />

            {activeThread && (
              <button
                onClick={() => handleOpenAddTask()}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Task</span>
                <span className="sm:hidden">Task</span>
              </button>
            )}
          </div>
        </header>

        {/* Board Area */}
        <div className="flex-1 overflow-hidden relative">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <span className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading workspace...</span>
            </div>
          ) : activeThread ? (
            <KanbanBoard
              thread={activeThread}
              tasks={visibleTasks}
              onTasksChange={setTasks}
              onOpenTagManager={() => setIsTagManagerOpen(true)}
              onAddTask={handleOpenAddTask}
              onOpenHistory={handleOpenHistory}
              onEditTask={handleEditTask}
              onArchiveTask={handleArchiveTask}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <Layers className="w-10 h-10 text-slate-600" />
              <p className="text-sm">Select or create a thread from the left sidebar to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Task Create / Edit Modal */}
      {isTaskModalOpen && activeThread && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          threadId={activeThreadId!}
          tags={activeThread.tags || []}
          taskToEdit={taskToEdit}
          defaultTagId={defaultTagForNewTask}
          onSaved={handleTaskSaved}
        />
      )}

      {/* Task Audit History Modal */}
      {isHistoryModalOpen && activeThread && (
        <TaskHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          task={historySelectedTask}
          tags={activeThread.tags || []}
        />
      )}

      {/* Custom Status Tags Manager Modal */}
      {isTagManagerOpen && activeThread && (
        <TagManagerModal
          isOpen={isTagManagerOpen}
          onClose={() => setIsTagManagerOpen(false)}
          thread={activeThread}
          onUpdated={handleThreadTagsUpdated}
        />
      )}

      {/* Activity Timeline / Calendar Drawer */}
      {isTimelineOpen && (
        <TimelineDrawer
          isOpen={isTimelineOpen}
          onClose={() => setIsTimelineOpen(false)}
          threadId={activeThreadId || undefined}
          threadName={activeThread?.name}
        />
      )}

      {/* Archived Tasks Modal */}
      {isArchivedModalOpen && (
        <ArchivedTasksModal
          isOpen={isArchivedModalOpen}
          onClose={() => setIsArchivedModalOpen(false)}
          currentThread={activeThread}
          threads={threads}
          onTaskRestored={handleTaskRestored}
        />
      )}

      {/* Data Backup & Migration Hub Modal */}
      {isDataBackupOpen && (
        <DataBackupModal
          isOpen={isDataBackupOpen}
          onClose={() => setIsDataBackupOpen(false)}
          activeThreadId={activeThreadId || undefined}
          activeThreadName={activeThread?.name}
          onImportSuccess={() => {
            if (activeThread) {
              loadTasksForThread(activeThread._id);
            }
          }}
        />
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-400">
          <span className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
