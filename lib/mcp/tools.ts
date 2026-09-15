import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { taskService } from '@/lib/services/task.service';
import { threadService } from '@/lib/services/thread.service';

/**
 * Registers all TaskFlow tools with the official MCP Server instance scoped to a specific user.
 * Provides high-signal descriptions so models can reliably select and parameterize tools.
 */
export function registerTaskFlowTools(server: McpServer, userId: string) {
  // 1. List Threads & Statuses
  server.registerTool(
    'list_threads',
    {
      description:
        'List all available workspace threads (e.g. "Main Workspace", "Sprint 24") along with their custom Kanban status columns (e.g. "todo", "done", "schedule latter").',
    },
    async () => {
      try {
        const threads = await threadService.listThreads(userId);
        return {
          content: [{ type: 'text', text: JSON.stringify({ count: threads.length, threads }, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list threads: ${error.message}` }],
        };
      }
    }
  );

  // 2. Get & Search Tasks
  server.registerTool(
    'get_tasks',
    {
      description:
        'Search and filter active tasks across threads. Use this when the user asks what tasks are pending, due, or matching a specific keyword or priority level.',
      inputSchema: {
        threadId: z.string().optional().describe('Optional thread ID to filter tasks by workspace.'),
        status: z.string().optional().describe('Filter by status/column name, e.g. "todo", "done", "in-progress".'),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('Filter by task priority level.'),
        searchQuery: z.string().optional().describe('Search keyword to match against task title or description.'),
        dueBefore: z.string().optional().describe('ISO date string (YYYY-MM-DD) to find tasks due on or before this date.'),
        dueAfter: z.string().optional().describe('ISO date string (YYYY-MM-DD) to find tasks due on or after this date.'),
        limit: z.number().optional().describe('Maximum number of tasks to return (default 50).'),
      },
    },
    async (params) => {
      try {
        const tasks = await taskService.getTasks(userId, params);
        return {
          content: [{ type: 'text', text: JSON.stringify({ count: tasks.length, tasks }, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to get tasks: ${error.message}` }],
        };
      }
    }
  );

  // 3. Create Task
  server.registerTool(
    'create_task',
    {
      description:
        'Create a new task on the Kanban board. Supports Markdown checklists in the description (- [ ] item). Do not compute fractional ordering or DB IDs manually.',
      inputSchema: {
        title: z.string().describe('Clear, actionable title of the task.'),
        threadId: z.string().optional().describe('Thread ID to add task into. If omitted, adds to the primary default thread.'),
        description: z.string().optional().describe('Detailed task notes, specifications, or markdown subtasks (- [ ] task).'),
        status: z.string().optional().describe('Initial status column, e.g. "todo", "done". Defaults to first status column.'),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('Priority level (default: medium).'),
        dueDate: z.string().optional().describe('Due date in ISO format (YYYY-MM-DD).'),
        remindFrequencyHours: z.number().optional().describe('Automated Web Push reminder interval in hours (e.g. 24, 48).'),
      },
    },
    async (params) => {
      try {
        const created = await taskService.createTask(userId, {
          ...params,
          source: 'mcp',
        });
        return {
          content: [
            {
              type: 'text',
              text: `✅ Task created successfully!\n\n${JSON.stringify(created, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create task: ${error.message}` }],
        };
      }
    }
  );

  // 4. Move Task Status (Shift Columns)
  server.registerTool(
    'move_task_status',
    {
      description:
        'Shift a task to a different Kanban status column (e.g. move to "done", "todo", or "schedule latter"). Do not use update_task for column shifting.',
      inputSchema: {
        taskId: z.string().describe('The ID of the task to move.'),
        targetStatus: z.string().describe('Target column name or ID, e.g. "done", "todo", "in-progress", "schedule latter".'),
      },
    },
    async ({ taskId, targetStatus }) => {
      try {
        const moved = await taskService.moveTaskStatus(userId, taskId, targetStatus, 'mcp');
        return {
          content: [
            {
              type: 'text',
              text: `✅ Task "${moved.title}" moved to status "${moved.status}".`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to move task: ${error.message}` }],
        };
      }
    }
  );

  // 5. Update Task
  server.registerTool(
    'update_task',
    {
      description:
        'Update an existing task\'s editable properties (title, description, subtasks checklist, priority, due date, reminder). Do NOT use this to move Kanban columns; use move_task_status instead.',
      inputSchema: {
        taskId: z.string().describe('The ID of the task to update.'),
        title: z.string().optional().describe('Updated task title.'),
        description: z.string().optional().describe('Updated description notes or markdown checklist.'),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('Updated priority level.'),
        dueDate: z.string().nullable().optional().describe('Updated due date (YYYY-MM-DD) or null to clear.'),
        remindFrequencyHours: z.number().nullable().optional().describe('Updated reminder frequency in hours or null to disable.'),
      },
    },
    async ({ taskId, ...updates }) => {
      try {
        const updated = await taskService.updateTask(userId, taskId, {
          ...updates,
          source: 'mcp',
        });
        return {
          content: [
            {
              type: 'text',
              text: `✅ Task updated successfully:\n\n${JSON.stringify(updated, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to update task: ${error.message}` }],
        };
      }
    }
  );

  // 6. Archive Task
  server.registerTool(
    'archive_task',
    {
      description:
        'Archive a task. The task is removed from active board view but its history and records are preserved.',
      inputSchema: {
        taskId: z.string().describe('The ID of the task to archive.'),
      },
    },
    async ({ taskId }) => {
      try {
        const res = await taskService.archiveTask(userId, taskId, 'mcp');
        return {
          content: [{ type: 'text', text: `📦 Task ${res.id} has been archived.` }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to archive task: ${error.message}` }],
        };
      }
    }
  );

  // 7. Workspace Stats
  server.registerTool(
    'get_workspace_stats',
    {
      description:
        'Get high-level productivity metrics and task counts (total, completed, pending, urgent, and overdue).',
      inputSchema: {
        threadId: z.string().optional().describe('Optional thread ID to restrict metrics to a specific thread.'),
      },
    },
    async ({ threadId }) => {
      try {
        const stats = await taskService.getWorkspaceStats(userId, threadId);
        return {
          content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to retrieve stats: ${error.message}` }],
        };
      }
    }
  );
}

/**
 * Creates and initializes a TaskFlow MCP Server instance scoped to a specific user.
 */
export function createMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: 'taskflow-mcp-server',
    version: '1.0.0',
  });

  registerTaskFlowTools(server, userId);
  return server;
}
