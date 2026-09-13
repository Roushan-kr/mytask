import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createMcpServer } from '@/lib/mcp/tools';

export const dynamic = 'force-dynamic';

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

  const mcpServer = createMcpServer();

  try {
    // 1. Initialize
    if (method === 'initialize') {
      return NextResponse.json({
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
    if (method === 'notifications/initialized' || method === 'initialized') {
      return new NextResponse(null, { status: 204 });
    }

    // 3. Ping
    if (method === 'ping') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {},
      });
    }

    // 4. Tools List
    if (method === 'tools/list') {
      // Access registered tools from MCP server instance
      const registeredTools = (mcpServer as any)._registeredTools || {};
      const toolList = Object.entries(registeredTools).map(([name, tool]: [string, any]) => ({
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
                        type: v._def?.typeName === 'ZodNumber' ? 'number' : v._def?.typeName === 'ZodEnum' ? 'string' : 'string',
                        description: v.description || '',
                        ...(v._def?.typeName === 'ZodEnum' ? { enum: v._def.values } : {}),
                      },
                    ])
                  )
                : {},
            }
          : { type: 'object', properties: {} },
      }));

      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: toolList,
        },
      });
    }

    // 5. Tools Call
    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      const registeredTools = (mcpServer as any)._registeredTools || {};
      const tool = registeredTools[toolName];

      if (!tool) {
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Tool '${toolName}' not found.`,
          },
        });
      }

      // Execute tool handler via MCP Server
      const result = await tool.handler(toolArgs, { signal: req.signal });

      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result,
      });
    }

    // Unknown method
    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method '${method}' not found.`,
      },
    });
  } catch (error: any) {
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
