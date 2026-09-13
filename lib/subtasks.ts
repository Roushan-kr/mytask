/**
 * Subtasks and Markdown Checklists Engine
 * Parses and updates standard GitHub-flavored Markdown checkboxes:
 * - [ ] Todo item
 * - [x] Completed item
 */

export interface ISubtaskItem {
  index: number;
  text: string;
  completed: boolean;
  rawLine: string;
}

export interface ISubtaskProgress {
  total: number;
  completed: number;
  percent: number;
  items: ISubtaskItem[];
}

const CHECKBOX_REGEX = /^(\s*[-*+]|\s*\d+\.)\s+\[([ xX])\]\s+(.*)$/;

/**
 * Parses all checklist items from a markdown text string.
 */
export function parseSubtasks(content?: string): ISubtaskItem[] {
  if (!content) return [];
  const lines = content.split('\n');
  const items: ISubtaskItem[] = [];

  lines.forEach((line) => {
    const match = line.match(CHECKBOX_REGEX);
    if (match) {
      const isCompleted = match[2].toLowerCase() === 'x';
      const text = match[3].trim();
      items.push({
        index: items.length,
        text,
        completed: isCompleted,
        rawLine: line,
      });
    }
  });

  return items;
}

/**
 * Calculates total, completed, and percentage for checklist items.
 */
export function calculateSubtaskProgress(content?: string): ISubtaskProgress {
  const items = parseSubtasks(content);
  const total = items.length;
  const completed = items.filter((i) => i.completed).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    percent,
    items,
  };
}

/**
 * Toggles a specific checklist item by its occurrence index.
 */
export function toggleSubtaskInMarkdown(content: string, itemIndex: number): string {
  if (!content) return '';
  const lines = content.split('\n');
  let currentCheckboxIndex = 0;

  const newLines = lines.map((line) => {
    const match = line.match(CHECKBOX_REGEX);
    if (match) {
      if (currentCheckboxIndex === itemIndex) {
        const prefix = match[1];
        const currentMark = match[2];
        const newMark = currentMark.toLowerCase() === 'x' ? ' ' : 'x';
        const taskText = match[3];
        currentCheckboxIndex++;
        return `${prefix} [${newMark}] ${taskText}`;
      }
      currentCheckboxIndex++;
    }
    return line;
  });

  return newLines.join('\n');
}

/**
 * Appends a new checklist item to markdown content.
 */
export function appendSubtaskToMarkdown(content: string, subtaskText: string): string {
  const clean = (content || '').trimEnd();
  const newLine = `- [ ] ${subtaskText.trim()}`;
  return clean ? `${clean}\n${newLine}` : newLine;
}
