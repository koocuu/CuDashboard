/**
 * Claude（claude.ai / Claude Code）对 MCP SDK ≥1.26 的新字段会静默丢弃全部工具。
 * @see https://github.com/anthropics/claude-code/issues/25081
 *
 * 触发字段包括：
 * - initialize: instructions、capabilities.tools.listChanged、resources、logging
 * - tools/list: title、execution、annotations、outputSchema、inputSchema.$schema
 */

type JsonRpcMessage = {
  jsonrpc?: string;
  id?: unknown;
  method?: string;
  result?: Record<string, unknown>;
  error?: unknown;
};

function sanitizeInputSchema(schema: unknown): unknown {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return schema;
  }
  const next = { ...(schema as Record<string, unknown>) };
  delete next.$schema;
  return next;
}

function sanitizeTool(tool: unknown): unknown {
  if (!tool || typeof tool !== "object" || Array.isArray(tool)) return tool;
  const t = tool as Record<string, unknown>;
  return {
    name: t.name,
    description: t.description,
    inputSchema: sanitizeInputSchema(t.inputSchema),
  };
}

export function sanitizeMcpJsonRpcPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const msg = payload as JsonRpcMessage;
  if (!msg.result || typeof msg.result !== "object") return payload;

  const result = { ...msg.result };

  // initialize
  if ("serverInfo" in result || "protocolVersion" in result) {
    delete result.instructions;
    result.capabilities = { tools: {} };
  }

  // tools/list
  if (Array.isArray(result.tools)) {
    result.tools = result.tools.map(sanitizeTool);
  }

  return { ...msg, result };
}

function sanitizeSseBody(body: string): string {
  return body.replace(/^data:\s*(\{.*\})\s*$/gm, (_full, json: string) => {
    try {
      const parsed = JSON.parse(json);
      const sanitized = sanitizeMcpJsonRpcPayload(parsed);
      return `data: ${JSON.stringify(sanitized)}`;
    } catch {
      return _full;
    }
  });
}

async function readResponseText(res: Response): Promise<string> {
  return res.text();
}

/** 包装 MCP handler，清洗 Claude 不兼容字段。 */
export function withClaudeMcpCompat(
  handler: (req: Request) => Response | Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const res = await handler(req);
    const contentType = res.headers.get("content-type") ?? "";

    // 非 JSON / SSE 原样返回（含 401 等）
    if (
      !contentType.includes("application/json") &&
      !contentType.includes("text/event-stream")
    ) {
      return res;
    }

    const text = await readResponseText(res);
    if (!text) return res;

    let nextBody: string;
    if (contentType.includes("text/event-stream") || text.startsWith("event:")) {
      nextBody = sanitizeSseBody(text);
    } else {
      try {
        nextBody = JSON.stringify(sanitizeMcpJsonRpcPayload(JSON.parse(text)));
      } catch {
        return new Response(text, {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        });
      }
    }

    const headers = new Headers(res.headers);
    headers.delete("content-length");

    return new Response(nextBody, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  };
}
