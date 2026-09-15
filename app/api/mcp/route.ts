import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { hashApiKey, timingSafeCompare } from '@/lib/auth';
import { createMcpServer } from '@/lib/mcp/tools';

export const dynamic = 'force-dynamic';

/**
 * Authenticates an incoming MCP request to a specific user ID.
 * Supports:
 * 1. User-specific personal API Key (tf_live_...) via x-mcp-api-key or Bearer token.
 * 2. System-wide fallback MCP_API_KEY or AUTH_SECRET (maps to first admin/user).
 */
async function authenticateMcpUser(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization') || '';
  const customHeader = req.headers.get('x-mcp-api-key') || '';

  let token = customHeader.trim();
  if (!token && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (!token && authHeader) {
    token = authHeader.trim();
  }

  if (!token) return null;

  await connectDB();

  // 1. Check Personal User API Key (Indexed SHA-256 lookup)
  const keyHash = hashApiKey(token);
  const userByKey = await User.findOne({ mcpApiKeyHash: keyHash }).select('_id').lean();
  if (userByKey) {
    return userByKey._id.toString();
  }

  return null;
}

// Pre-compute static tool list definition
const STATIC_TOOL_LIST = [
  {
    name: 'list_threads',
    description:
      'List all available workspace threads (e.g. "Main Workspace", "Sprint 24") along with their custom Kanban status columns (e.g. "todo", "done", "schedule latter").',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_tasks',
    description:
      'Search and filter active tasks across threads. Use this when the user asks what tasks are pending, due, or matching a specific keyword or priority level.',
    inputSchema: {
      type: 'object',
      properties: {
        threadId: { type: 'string', description: 'Optional thread ID to filter tasks by workspace.' },
        status: { type: 'string', description: 'Filter by status/column name, e.g. "todo", "done", "in-progress".' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Filter by task priority level.' },
        searchQuery: { type: 'string', description: 'Search keyword to match against task title or description.' },
        dueBefore: { type: 'string', description: 'ISO date string (YYYY-MM-DD) to find tasks due on or before this date.' },
        dueAfter: { type: 'string', description: 'ISO date string (YYYY-MM-DD) to find tasks due on or after this date.' },
        limit: { type: 'number', description: 'Maximum number of tasks to return (default 50).' },
      },
    },
  },
  {
    name: 'create_task',
    description:
      'Create a new task on the Kanban board. Supports Markdown checklists in the description (- [ ] item). Do not compute fractional ordering or DB IDs manually.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Clear, actionable title of the task.' },
        threadId: { type: 'string', description: 'Thread ID to add task into. If omitted, adds to the primary default thread.' },
        description: { type: 'string', description: 'Detailed task notes, specifications, or markdown subtasks (- [ ] task).' },
        status: { type: 'string', description: 'Initial status column, e.g. "todo", "done". Defaults to first status column.' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Priority level (default: medium).' },
        dueDate: { type: 'string', description: 'Due date in ISO format (YYYY-MM-DD).' },
        remindFrequencyHours: { type: 'number', description: 'Automated Web Push reminder interval in hours (e.g. 24, 48).' },
      },
      required: ['title'],
    },
  },
  {
    name: 'move_task_status',
    description:
      'Shift a task to a different Kanban status column (e.g. move to "done", "todo", or "schedule latter"). Do not use update_task for column shifting.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The ID of the task to move.' },
        targetStatus: { type: 'string', description: 'Target column name or ID, e.g. "done", "todo", "in-progress", "schedule latter".' },
      },
      required: ['taskId', 'targetStatus'],
    },
  },
  {
    name: 'update_task',
    description:
      'Update an existing task\'s editable properties (title, description, subtasks checklist, priority, due date, reminder). Do NOT use this to move Kanban columns; use move_task_status instead.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The ID of the task to update.' },
        title: { type: 'string', description: 'Updated task title.' },
        description: { type: 'string', description: 'Updated description notes or markdown checklist.' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Updated priority level.' },
        dueDate: { type: 'string', description: 'Updated due date (YYYY-MM-DD) or null to clear.' },
        remindFrequencyHours: { type: 'number', description: 'Updated reminder frequency in hours or null to disable.' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'archive_task',
    description:
      'Archive a task. The task is removed from active board view but its history and records are preserved.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The ID of the task to archive.' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'get_workspace_stats',
    description:
      'Get high-level productivity metrics and task counts (total, completed, pending, urgent, and overdue).',
    inputSchema: {
      type: 'object',
      properties: {
        threadId: { type: 'string', description: 'Optional thread ID to restrict metrics to a specific thread.' },
      },
    },
  },
];

/**
 * GET /api/mcp
 * Returns server health and MCP capability metadata.
 */
export async function GET(req: NextRequest) {
  const userId = await authenticateMcpUser(req);
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing Bearer token / x-mcp-api-key.' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    name: 'taskflow-mcp-server',
    version: '1.0.0',
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {
        listChanged: false,
      },
    },
    description: 'TaskFlow Model Context Protocol Server for AI agent task and Kanban management.',
  });
}

/**
 * POST /api/mcp
 * Handles MCP JSON-RPC protocol requests (initialize, tools/list, tools/call, ping).
 */
export async function POST(req: NextRequest) {
  const startTime = performance.now();
  const userId = await authenticateMcpUser(req);
  if (!userId) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Unauthorized: Invalid or missing API Key.' },
        id: null,
      },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: { code: -32700, message: 'Parse error: Invalid JSON.' },
        id: null,
      },
      { status: 400 }
    );
  }

  const { jsonrpc, id, method, params } = body;
  if (jsonrpc !== '2.0') {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0".' },
        id: id ?? null,
      },
      { status: 400 }
    );
  }

  try {
    let response: NextResponse;

    // 1. Initialize
    if (method === 'initialize') {
      response = NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {
              listChanged: false,
            },
          },
          serverInfo: {
            name: 'taskflow-mcp-server',
            version: '1.0.0',
          },
        },
      });
    }

    // 2. Notifications
    else if (method === 'notifications/initialized' || method === 'initialized') {
      response = new NextResponse(null, { status: 204 });
    }

    // 3. Ping
    else if (method === 'ping') {
      response = NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {},
      });
    }

    // 4. Tools List
    else if (method === 'tools/list') {
      response = NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: STATIC_TOOL_LIST,
        },
      });
    }

    // 5. Tools Call
    else if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      const userMcpServer = createMcpServer(userId);
      const registeredTools = (userMcpServer as any)._registeredTools || {};
      const tool = registeredTools[toolName];

      if (!tool) {
        response = NextResponse.json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Tool '${toolName}' not found.`,
          },
        });
      } else {
        const result = await tool.handler(toolArgs, { signal: req.signal });
        response = NextResponse.json({
          jsonrpc: '2.0',
          id,
          result,
        });
      }
    }

    // Unknown method
    else {
      response = NextResponse.json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method '${method}' not found.`,
        },
      });
    }

    const elapsed = (performance.now() - startTime).toFixed(1);
    const logTag = method === 'tools/call' ? `tools/call:${params?.name}` : method;
    console.log(`[MCP Server] ${logTag} for user ${userId} took ${elapsed}ms`);
    response.headers.set('Server-Timing', `total;dur=${elapsed}`);

    return response;
  } catch (error: any) {
    const elapsed = (performance.now() - startTime).toFixed(1);
    console.error(`[MCP Server Error] ${method} failed after ${elapsed}ms:`, error);
    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: `Internal error: ${error.message}`,
      },
    });
  }
}
