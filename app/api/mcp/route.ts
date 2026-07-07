import { NextRequest, NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth/tokens";
import { buildContextPackage, resolveLayers } from "@/lib/context-builder";
import { searchAll } from "@/lib/queries/search";
import { createProposal } from "@/lib/proposals";
import { isValidLayer } from "@/lib/queries/profile";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import type { ProfileLayer } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 远程 MCP Server(v2 Phase 3)。
 * Streamable HTTP transport,JSON-RPC 2.0。
 * 工具:get_profile / propose_profile_update / search_entries / create_entry。
 * 底层复用画像 proposal / 检索 / 条目机制。鉴权:Bearer token。
 */

const SERVER_INFO = { name: "console-mcp", version: "1.0.0" };

const TOOLS = [
  {
    name: "get_profile",
    description:
      "读取用户的个人画像(Markdown)。参数 profile: full|general,或 layers 逗号分隔层名。",
    inputSchema: {
      type: "object",
      properties: {
        profile: { type: "string", enum: ["full", "general"] },
        layers: { type: "string", description: "如 core,status" },
      },
    },
  },
  {
    name: "propose_profile_update",
    description:
      "提交一条画像修改提案(不直接生效,需用户在 Dashboard 确认)。",
    inputSchema: {
      type: "object",
      properties: {
        layer: {
          type: "string",
          enum: ["core", "investing", "creative", "status", "private"],
        },
        content: { type: "string", description: "该层的完整新版本 Markdown" },
        summary: { type: "string" },
      },
      required: ["layer", "content"],
    },
  },
  {
    name: "search_entries",
    description: "全文检索用户的条目(画像预留 entries、工作、持仓)。",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "create_entry",
    description:
      "创建一条通用条目。entries 暂不做手动 UI,用于 AI 写入后的数据沉淀。",
    inputSchema: {
      type: "object",
      properties: {
        section: { type: "string" },
        content: { type: "string" },
        title: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["section", "content"],
    },
  },
];

function rpcResult(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}
function rpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });
}
function toolText(text: string) {
  return { content: [{ type: "text", text }] };
}

export async function POST(req: NextRequest) {
  // 鉴权
  const authRes = await verifyBearer(req.headers.get("authorization"));
  if (!authRes) {
    return rpcError(null, -32001, "无效或缺失的 Bearer token");
  }
  const canWrite = authRes.scope === "write";

  const body = await req.json().catch(() => null);
  if (!body || body.jsonrpc !== "2.0") {
    return rpcError(body?.id ?? null, -32600, "Invalid Request");
  }

  const { id, method, params } = body;

  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });

    case "notifications/initialized":
      return new NextResponse(null, { status: 202 });

    case "tools/list":
      return rpcResult(id, { tools: TOOLS });

    case "tools/call": {
      const name = params?.name;
      const args = params?.arguments ?? {};
      try {
        if (name === "get_profile") {
          const layers = resolveLayers(
            args.profile ?? null,
            args.layers ?? null,
          );
          const md = await buildContextPackage(layers);
          return rpcResult(id, toolText(md));
        }

        if (name === "propose_profile_update") {
          if (!canWrite) {
            return rpcResult(
              id,
              toolText("错误:此 token 无写权限,无法提交提案。"),
            );
          }
          if (!isValidLayer(args.layer)) {
            return rpcResult(id, toolText("错误:layer 非法。"));
          }
          if (typeof args.content !== "string" || !args.content.trim()) {
            return rpcResult(id, toolText("错误:content 不能为空。"));
          }
          const proposal = await createProposal({
            layer: args.layer as ProfileLayer,
            proposedContentMd: args.content,
            summary: args.summary,
            source: "mcp",
            sourceName: authRes.name,
          });
          return rpcResult(
            id,
            toolText(
              `已创建提案 #${proposal.id}(${proposal.diffSummary})。用户需在 Dashboard 确认后才会生效。`,
            ),
          );
        }

        if (name === "search_entries") {
          if (typeof args.query !== "string" || !args.query.trim()) {
            return rpcResult(id, toolText("错误:query 不能为空。"));
          }
          const hits = await searchAll(args.query);
          if (hits.length === 0) {
            return rpcResult(id, toolText(`未找到与「${args.query}」相关的条目。`));
          }
          const text = hits
            .map((h) => `[${h.kind}] ${h.title} — ${h.snippet}`)
            .join("\n");
          return rpcResult(id, toolText(text));
        }

        if (name === "create_entry") {
          if (!canWrite) {
            return rpcResult(id, toolText("错误:此 token 无写权限。"));
          }
          const section = args.section;
          const content =
            typeof args.content === "string" ? args.content.trim() : "";
          if (!section || !content) {
            return rpcResult(id, toolText("错误:section 与 content 必填。"));
          }
          const [entry] = await db
            .insert(entries)
            .values({
              sectionKey: section,
              type: "note",
              title: typeof args.title === "string" ? args.title : "",
              contentMd: content,
              tags: Array.isArray(args.tags) ? args.tags : [],
            })
            .returning();
          return rpcResult(id, toolText(`已创建条目 #${entry.id}。`));
        }

        return rpcError(id, -32602, `未知工具:${name}`);
      } catch (e) {
        return rpcError(
          id,
          -32603,
          e instanceof Error ? e.message : "内部错误",
        );
      }
    }

    default:
      return rpcError(id, -32601, `未知方法:${method}`);
  }
}

/** GET:健康检查 / 说明。 */
export async function GET() {
  return NextResponse.json({
    server: SERVER_INFO,
    transport: "streamable-http (JSON-RPC 2.0 over POST)",
    tools: TOOLS.map((t) => t.name),
    note: "在 MCP 客户端配置此 URL,Authorization: Bearer <token>。",
  });
}
