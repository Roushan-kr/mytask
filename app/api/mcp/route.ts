import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createMcpServer } from '@/lib/mcp/tools';

export const dynamic = 'force-dynamic';

// Module-level singleton MCP server instance (created once per container/worker lifecycle)
const mcpServer = createMcpServer();

// Pre-compute tool list metadata once at startup to eliminate schema parsing overhead on every request
function computeToolList() {
  const registeredTools = (mcpServer as any)._registeredTools || {};
  return Object.entries(registeredTools).map(([name, tool]: [string, any]) => ({
    name,
    description: tool.description || '',
    inputSchema: tool.inputSchema
      ? {
          type: 'object',
          properties: tool.inputSchema.shape
            ? Object.fromEntries(
                Object.entries(tool.inputSchema.shape).map(([k, v]: [string, any]) => [
                  k,
                  {
                    type:
                      v._def?.typeName === 'ZodNumber'
                        ? 'number'
                        : v._def?.typeName === 'ZodEnum'
                        ? 'string'
                        : 'string',
                    description: v.description || '',
                    ...(v._def?.typeName === 'ZodEnum' ? { enum: v._def.values } : {}),
                  },
                ])
              )
            : {},
        }
      : { type: 'object', properties: {} },
  }));
}

const CACHED_TOOL_LIST = computeToolList();

/**
 * Constant-time API Key verification with length check.
 */
function verifyApiKey(authHeader: string | null): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const expectedKey = process.env.MCP_API_KEY || process.env.AUTH_SECRET;

  if (!expectedKey || !token) return false;

  const tokenBuf = Buffer.from(token);
  const expectedBuf = Buffer.from(expectedKey);

  if (tokenBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(tokenBuf, expectedBuf);
}

/**
 * GET /api/mcp
 * Returns server health and MCP capability metadata.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!verifyApiKey(authHeader)) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing Bearer token.' },
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
  const authHeader = req.headers.get('authorization');
  if (!verifyApiKey(authHeader)) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Unauthorized: Invalid or missing Bearer token.' },
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

    // 2. Notifications (e.g. notifications/initialized)
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

    // 4. Tools List (served from pre-computed cache)
    else if (method === 'tools/list') {
      response = NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: CACHED_TOOL_LIST,
        },
      });
    }

    // 5. Tools Call
    else if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      const registeredTools = (mcpServer as any)._registeredTools || {};
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
        // Execute tool handler via MCP Server
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
    console.log(`[MCP Server] ${logTag} took ${elapsed}ms`);
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
