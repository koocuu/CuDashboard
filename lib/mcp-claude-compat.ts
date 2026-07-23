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

/**
 * 逐跳头（hop-by-hop）与由平台重算的头必须剔除。
 * 因为我们把上游 SSE 流 buffer 成定长字符串后重发，若保留 transfer-encoding:
 * chunked，严格 HTTP 客户端（如 Claude）会按 chunk 分帧解析定长 body 而失败。
 */
const STRIP_HEADERS = [
  "content-length",
  "content-encoding",
  "transfer-encoding",
  "connection",
  "keep-alive",
];

function cleanHeaders(source: Headers): Headers {
  const headers = new Headers(source);
  for (const name of STRIP_HEADERS) headers.delete(name);
  return headers;
}

/** 包装 MCP handler，清洗 Claude 不兼容字段。 */
export function withClaudeMcpCompat(
  handler: (req: Request) => Response | Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    // HEAD 必须由路由层单独处理；此处兜底避免误入后挂起
    if (req.method === "HEAD") {
      return new Response(null, { status: 405 });
    }

    const res = await handler(req);
    const contentType = res.headers.get("content-type") ?? "";

    // 无 body 的 202/204（如 notifications/initialized）：重建空响应
    if (res.status === 204 || res.status === 202) {
      return new Response(null, {
        status: res.status,
        statusText: res.statusText,
        headers: cleanHeaders(res.headers),
      });
    }

    // 非 JSON / SSE 原样透传（重建 body，避免流被消费后无法再读）
    if (
      !contentType.includes("application/json") &&
      !contentType.includes("text/event-stream")
    ) {
      const raw = await res.arrayBuffer();
      return new Response(raw, {
        status: res.status,
        statusText: res.statusText,
        headers: cleanHeaders(res.headers),
      });
    }

    const text = await res.text();
    const headers = cleanHeaders(res.headers);

    if (!text) {
      return new Response(null, {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
    }

    let nextBody: string;
    if (contentType.includes("text/event-stream") || text.startsWith("event:")) {
      nextBody = sanitizeSseBody(text);
    } else {
      try {
        nextBody = JSON.stringify(sanitizeMcpJsonRpcPayload(JSON.parse(text)));
      } catch {
        nextBody = text;
      }
    }

    return new Response(nextBody, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  };
}
