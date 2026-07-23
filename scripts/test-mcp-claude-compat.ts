import assert from "node:assert/strict";
import {
  sanitizeMcpJsonRpcPayload,
  withClaudeMcpCompat,
} from "@/lib/mcp-claude-compat";

async function main() {
  const initRaw = {
    jsonrpc: "2.0",
    id: 1,
    result: {
      protocolVersion: "2024-11-05",
      capabilities: { tools: { listChanged: true }, logging: {} },
      instructions: "do not show",
      serverInfo: { name: "console-mcp", version: "1.0.0" },
    },
  };

  const initClean = sanitizeMcpJsonRpcPayload(initRaw) as typeof initRaw;
  assert.deepEqual(initClean.result.capabilities, { tools: {} });
  assert.equal("instructions" in initClean.result, false);

  const toolsRaw = {
    jsonrpc: "2.0",
    id: 2,
    result: {
      tools: [
        {
          name: "get_profile",
          title: "Get Profile",
          description: "read profile",
          execution: { taskSupport: "forbidden" },
          annotations: { readOnlyHint: true },
          inputSchema: {
            type: "object",
            properties: { layers: { type: "string" } },
            $schema: "http://json-schema.org/draft-07/schema#",
          },
        },
      ],
    },
  };

  const toolsClean = sanitizeMcpJsonRpcPayload(toolsRaw) as typeof toolsRaw;
  assert.deepEqual(toolsClean.result.tools[0], {
    name: "get_profile",
    description: "read profile",
    inputSchema: {
      type: "object",
      properties: { layers: { type: "string" } },
    },
  });

  const sseInput = `event: message\ndata: ${JSON.stringify(toolsRaw)}\n\n`;
  const wrapped = withClaudeMcpCompat(async () => {
    return new Response(sseInput, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        // 上游流式响应的逐跳头，重发定长 body 时必须剔除
        "Transfer-Encoding": "chunked",
      },
    });
  });

  const res = await wrapped(
    new Request("https://example.com/api/mcp", { method: "POST" }),
  );
  const body = await res.text();
  assert.match(body, /"name":"get_profile"/);
  assert.doesNotMatch(body, /"title"/);
  assert.doesNotMatch(body, /"execution"/);
  assert.doesNotMatch(body, /\$schema/);
  // 关键：重发时不得保留 chunked 头，否则严格客户端按分帧解析定长 body 失败
  assert.equal(res.headers.get("transfer-encoding"), null);
  assert.equal(res.headers.get("content-type"), "text/event-stream");
  // 关键：SSE 事件终止符（结尾空行）必须保留，否则 Claude 解析不到完整事件
  assert.ok(body.startsWith("event: message\n"), "event 行须保留");
  assert.ok(body.endsWith("\n\n"), `SSE 结尾 \\n\\n 终止符须保留，实际结尾: ${JSON.stringify(body.slice(-4))}`);

  // 多事件场景：两个事件之间的空行不能被吞
  const twoEvents =
    `event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"ok":true}}\n\n` +
    `event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"ok":false}}\n\n`;
  const wrapped2 = withClaudeMcpCompat(
    async () =>
      new Response(twoEvents, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
  );
  const res2 = await wrapped2(
    new Request("https://example.com/api/mcp", { method: "POST" }),
  );
  const body2 = await res2.text();
  assert.equal(
    (body2.match(/\n\n/g) ?? []).length,
    2,
    "两个事件的终止空行都须保留",
  );

  const accepted = withClaudeMcpCompat(
    async () => new Response(null, { status: 202 }),
  );
  const ack = await accepted(
    new Request("https://example.com/api/mcp", { method: "POST" }),
  );
  assert.equal(ack.status, 202);
  assert.equal(await ack.text(), "");

  console.log("mcp-claude-compat ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
