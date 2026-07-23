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

  const wrapped = withClaudeMcpCompat(async () => {
    return new Response(
      `event: message\ndata: ${JSON.stringify(toolsRaw)}\n\n`,
      { status: 200, headers: { "Content-Type": "text/event-stream" } },
    );
  });

  const res = await wrapped(
    new Request("https://example.com/api/mcp", { method: "POST" }),
  );
  const body = await res.text();
  assert.match(body, /"name":"get_profile"/);
  assert.doesNotMatch(body, /"title"/);
  assert.doesNotMatch(body, /"execution"/);
  assert.doesNotMatch(body, /\$schema/);

  console.log("mcp-claude-compat ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
