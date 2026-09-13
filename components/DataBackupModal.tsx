'use client';

import { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  ArrowRight,
  FileUp,
} from 'lucide-react';
import { exportThreadBackupAction, exportAllBackupAction, importTasksIntoThreadAction } from '@/app/actions/backup';
import { tasksToCsvString, parseCsvStringToTasks, ICsvTaskRow } from '@/lib/csv';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeThreadId?: string;
  activeThreadName?: string;
  onImportSuccess?: () => void;
}

export function DataBackupModal({
  isOpen,
  onClose,
  activeThreadId,
  activeThreadName = 'Active Thread',
  onImportSuccess,
}: DataBackupModalProps) {
  const [activeTab, setActiveTab] = useState<'export-thread' | 'export-all' | 'import'>('export-thread');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedImportRows, setParsedImportRows] = useState<ICsvTaskRow[]>([]);
  const [importType, setImportType] = useState<'csv' | 'json' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportThreadCsv = async () => {
    if (!activeThreadId) return;
    setIsExporting(true);
    setStatusMessage(null);
    try {
      const res = await exportThreadBackupAction(activeThreadId);
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to export thread');
      }

      const { thread, tasks } = res.data;
      const tagMap: Record<string, string> = {};
      if (Array.isArray(thread.tags)) {
        thread.tags.forEach((t: any) => {
          tagMap[t.id] = t.name;
        });
      }

      const csvContent = tasksToCsvString(tasks, tagMap);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const safeName = (thread.name || 'thread').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const dateStr = new Date().toISOString().split('T')[0];
      triggerDownload(blob, `${safeName}-tasks-${dateStr}.csv`);

      setStatusMessage({ type: 'success', text: `Exported ${tasks.length} tasks to CSV successfully!` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error exporting CSV' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportThreadJson = async () => {
    if (!activeThreadId) return;
    setIsExporting(true);
    setStatusMessage(null);
    try {
      const res = await exportThreadBackupAction(activeThreadId);
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to export thread');
      }

      const jsonStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const safeName = (res.data.thread.name || 'thread').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const dateStr = new Date().toISOString().split('T')[0];
      triggerDownload(blob, `${safeName}-backup-${dateStr}.json`);

      setStatusMessage({ type: 'success', text: `Thread JSON backup generated successfully!` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error exporting JSON' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAllJson = async () => {
    setIsExporting(true);
    setStatusMessage(null);
    try {
      const res = await exportAllBackupAction();
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to export workspace backup');
      }

      const jsonStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const dateStr = new Date().toISOString().split('T')[0];
      triggerDownload(blob, `taskflow-full-backup-${dateStr}.json`);

      setStatusMessage({
        type: 'success',
        text: `Exported full backup (${res.data.threads.length} threads, ${res.data.tasks.length} tasks)!`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error exporting workspace backup' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setStatusMessage(null);
    setParsedImportRows([]);

    const text = await file.text();
    const isCsv = file.name.endsWith('.csv');
    const isJson = file.name.endsWith('.json');

    if (isCsv) {
      setImportType('csv');
      const rows = parseCsvStringToTasks(text);
      if (rows.length === 0) {
        setStatusMessage({ type: 'error', text: 'No valid task records found in CSV file.' });
      } else {
        setParsedImportRows(rows);
      }
    } else if (isJson) {
      setImportType('json');
      try {
        const parsed = JSON.parse(text);
        const rawTasks = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.tasks)
          ? parsed.tasks
          : [];

        if (rawTasks.length === 0) {
          setStatusMessage({ type: 'error', text: 'No task items found in JSON backup.' });
          return;
        }

        const rows: ICsvTaskRow[] = rawTasks.map((t: any) => ({
          title: t.title || 'Untitled Task',
          description: t.description || '',
          status: t.tagId || t.status || 'todo',
          priority: t.priority || 'medium',
          dueDate: t.dueDate,
          remindFrequencyHours: t.remind_frequency,
        }));
        setParsedImportRows(rows);
      } catch (e: any) {
        setStatusMessage({ type: 'error', text: 'Invalid JSON file format: ' + e.message });
      }
    } else {
      setStatusMessage({ type: 'error', text: 'Unsupported file type. Please select a .csv or .json file.' });
    }
  };

  const handleExecuteImport = async () => {
    if (!activeThreadId || parsedImportRows.length === 0) return;

    setIsImporting(true);
    setStatusMessage(null);
    try {
      const payloadTasks = parsedImportRows.map((r) => ({
        title: r.title,
        description: r.description,
        status: r.status,
        priority: r.priority,
        dueDate: r.dueDate,
        remind_frequency: r.remindFrequencyHours,
      }));

      const res = await importTasksIntoThreadAction({
        threadId: activeThreadId,
        tasks: payloadTasks,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to import tasks');
      }

      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${res.importedCount} tasks into "${activeThreadName}"!`,
      });
      setParsedImportRows([]);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Import failed' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Data Backup & Migration</h2>
              <p className="text-xs text-slate-400">Export offline backups or import spreadsheet tasks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-3 gap-2">
          <button
            onClick={() => {
              setActiveTab('export-thread');
              setStatusMessage(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'export-thread'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Active Thread</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('export-all');
              setStatusMessage(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'export-all'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Full Workspace</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('import');
              setStatusMessage(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'import'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Tasks</span>
          </button>
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl flex items-center gap-3 text-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-6 space-y-6">
          {/* TAB 1: EXPORT ACTIVE THREAD */}
          {activeTab === 'export-thread' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-medium">Currently Selected Thread:</div>
                  <div className="text-sm font-bold text-white mt-0.5">{activeThreadName}</div>
                </div>
                <div className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Ready to Export
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CSV Export Card */}
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-slate-600 transition flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                      <FileSpreadsheet className="w-5 h-5" />
                      <span>Spreadsheet (CSV)</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Compatible with Excel, Google Sheets, and Notion. Exports titles, columns, priorities, and due dates.
                    </p>
                  </div>
                  <button
                    onClick={handleExportThreadCsv}
                    disabled={isExporting || !activeThreadId}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition active:scale-[0.98]"
                  >
                    {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Download .CSV</span>
                  </button>
                </div>

                {/* JSON Export Card */}
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-slate-600 transition flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                      <FileJson className="w-5 h-5" />
                      <span>Structured Data (JSON)</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Complete lossless export including custom tag IDs, colors, timestamped audit history, and reminders.
                    </p>
                  </div>
                  <button
                    onClick={handleExportThreadJson}
                    disabled={isExporting || !activeThreadId}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition active:scale-[0.98]"
                  >
                    {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Download .JSON</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXPORT ALL WORKSPACE */}
          {activeTab === 'export-all' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/20 space-y-3">
                <div className="flex items-center gap-2.5 text-indigo-300 font-semibold text-sm">
                  <Database className="w-5 h-5 text-indigo-400" />
                  <span>Complete Workspace Archive</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Downloads all threads, task columns, custom colors, reminder intervals, and complete audit histories in a single JSON file. Never worry about vendor lock-in.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleExportAllJson}
                    disabled={isExporting}
                    className="flex items-center justify-center gap-2 py-2.5 px-5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition active:scale-[0.98]"
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>Export Full Workspace Backup (.json)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: IMPORT TASKS */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* Target Thread Banner */}
              <div className="px-4 py-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-slate-400">Importing tasks into:</span>
                <span className="font-bold text-indigo-300">{activeThreadName}</span>
              </div>

              {/* Upload Dropzone */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".csv,.json"
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 bg-slate-950/40 hover:bg-slate-900/60 transition group"
              >
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                  <FileUp className="w-6 h-6" />
                </div>
                <div className="text-xs font-semibold text-slate-200 text-center">
                  {importFile ? (
                    <span className="text-indigo-300 font-bold">{importFile.name}</span>
                  ) : (
                    <span>Click or drag a <strong>.CSV</strong> or <strong>.JSON</strong> file here</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Standard CSV columns (Title, Description, Status, Priority, Due Date) or TaskFlow JSON backups
                </p>
              </label>

              {/* Preview Table */}
              {parsedImportRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      Parsed Preview ({parsedImportRows.length} tasks ready)
                    </span>
                    <span className="text-indigo-400 font-mono text-[11px]">Format: {importType?.toUpperCase()}</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-800/60 text-xs">
                    {parsedImportRows.slice(0, 15).map((row, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-900/50">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-200 truncate">{row.title}</p>
                          {row.description && (
                            <p className="text-[11px] text-slate-400 truncate">{row.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium">
                            {row.status || 'Todo'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              row.priority === 'urgent'
                                ? 'bg-rose-500/20 text-rose-300'
                                : row.priority === 'high'
                                ? 'bg-amber-500/20 text-amber-300'
                                : row.priority === 'low'
                                ? 'bg-slate-500/20 text-slate-300'
                                : 'bg-indigo-500/20 text-indigo-300'
                            }`}
                          >
                            {row.priority || 'medium'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {parsedImportRows.length > 15 && (
                      <div className="p-2 text-center text-slate-500 text-[11px]">
                        + {parsedImportRows.length - 15} more tasks...
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleExecuteImport}
                    disabled={isImporting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition active:scale-[0.98]"
                  >
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    <span>Confirm & Import {parsedImportRows.length} Tasks</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
