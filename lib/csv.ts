/**
 * Native RFC-4180 compliant CSV Parser & Serializer in Pure TypeScript.
 * Zero external dependencies.
 */

export interface ICsvTaskRow {
  title: string;
  description?: string;
  status: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  remindFrequencyHours?: number | null;
  historyEventsCount?: number;
  createdAt?: string;
}

/**
 * Escapes a cell according to RFC 4180 standard.
 */
function escapeCsvValue(val: any): string {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serializes an array of task objects to a CSV string.
 */
export function tasksToCsvString(tasks: any[], tagMap?: Record<string, string>): string {
  const headers = [
    'Title',
    'Description',
    'Status',
    'Priority',
    'Due Date',
    'Reminder Frequency (Hours)',
    'History Events Count',
    'Created At',
  ];

  const rows = tasks.map((t) => {
    const statusName = (tagMap && tagMap[t.tagId]) || t.tagId || 'Todo';
    const dueDateStr = t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : '';
    const createdAtStr = t.createdAt ? new Date(t.createdAt).toISOString() : '';
    const historyCount = Array.isArray(t.history) ? t.history.length : 0;

    return [
      escapeCsvValue(t.title),
      escapeCsvValue(t.description || ''),
      escapeCsvValue(statusName),
      escapeCsvValue(t.priority || 'medium'),
      escapeCsvValue(dueDateStr),
      escapeCsvValue(t.remind_frequency || ''),
      escapeCsvValue(historyCount),
      escapeCsvValue(createdAtStr),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Parses an RFC-4180 compliant CSV string into structured task rows.
 */
export function parseCsvStringToTasks(csvText: string): ICsvTaskRow[] {
  const clean = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  // Push last remaining cell and row if present
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headerRow = rows[0].map((h) => h.toLowerCase());
  const titleIdx = headerRow.findIndex((h) => h.includes('title') || h.includes('name') || h.includes('task'));
  const descIdx = headerRow.findIndex((h) => h.includes('desc') || h.includes('note'));
  const statusIdx = headerRow.findIndex((h) => h.includes('status') || h.includes('tag') || h.includes('column'));
  const priorityIdx = headerRow.findIndex((h) => h.includes('prior'));
  const dueIdx = headerRow.findIndex((h) => h.includes('due'));
  const remindIdx = headerRow.findIndex((h) => h.includes('remind') || h.includes('freq') || h.includes('hour'));

  const parsedTasks: ICsvTaskRow[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const title = titleIdx !== -1 ? row[titleIdx] : row[0];
    if (!title || !title.trim()) continue;

    const description = descIdx !== -1 ? row[descIdx] : '';
    const status = statusIdx !== -1 ? row[statusIdx] : 'Todo';
    const rawPriority = priorityIdx !== -1 ? row[priorityIdx]?.toLowerCase() : 'medium';
    const priority: 'low' | 'medium' | 'high' | 'urgent' = ['low', 'medium', 'high', 'urgent'].includes(rawPriority)
      ? (rawPriority as any)
      : 'medium';
    const dueDate = dueIdx !== -1 ? row[dueIdx] : undefined;
    const rawFreq = remindIdx !== -1 ? parseFloat(row[remindIdx]) : null;
    const remindFrequencyHours = rawFreq && rawFreq > 0 ? rawFreq : null;

    parsedTasks.push({
      title: title.trim(),
      description: description ? description.trim() : '',
      status: status ? status.trim() : 'Todo',
      priority,
      dueDate: dueDate || undefined,
      remindFrequencyHours,
    });
  }

  return parsedTasks;
}
