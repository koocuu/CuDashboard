import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { verifyBearer } from "@/lib/auth/tokens";
import { buildContextPackage, resolveLayers } from "@/lib/context-builder";
import { verifyOAuthAccessToken } from "@/lib/oauth";
import { searchAll } from "@/lib/queries/search";
import { createProposal } from "@/lib/proposals";
import { isValidLayer } from "@/lib/queries/profile";
import {
  createMonthlyInvestmentProposal,
  holdingSnapshotDiff,
  holdingSnapshotItemSchema,
  normalizeHoldingSnapshot,
} from "@/lib/holding-proposals";
import { listHoldings } from "@/lib/queries/invest";
import { monthlyReviewDataSchema } from "@/lib/invest-review-template";
import type { ProfileLayer } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function textResult(text: string, isError = false) {
  return {
    content: [{ type: "text" as const, text }],
    isError,
  };
}

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_profile",
      {
        title: "Get Profile",
        description:
          "读取用户的个人画像 Markdown。参数 layers 可选,用逗号指定层名(core/investing/creative/status/private);不传则返回该 token 权限内的全部层,包括 private 层。用于让 AI 在新对话中理解用户背景、偏好、当前状态与附录信息。",
        inputSchema: {
          layers: z
            .string()
            .optional()
            .describe("可选。逗号分隔的画像层名,如 core,status 或 core,investing,creative,status。"),
        },
      },
      async ({ layers }) => {
        const resolvedLayers = layers
          ? resolveLayers(null, layers)
          : resolveLayers("full", null);
        const markdown = await buildContextPackage(resolvedLayers);
        return textResult(markdown);
      },
    );

    server.registerTool(
      "search_entries",
      {
        title: "Search Entries",
        description:
          "搜索用户数据库中的工作事项、持仓和通用条目。参数 q 是搜索关键词。底层复用 dashboard 的 pg_trgm/ILIKE 全文检索,适合回答'最近排期事项是什么'、'某个标的买入逻辑是什么'这类问题。",
        inputSchema: {
          q: z.string().min(1).describe("搜索关键词,例如 排期、北方华创、Console。"),
        },
      },
      async ({ q }) => {
        const hits = await searchAll(q.trim());
        if (hits.length === 0) {
          return textResult(`未找到与「${q}」相关的条目。`);
        }

        const text = hits
          .map((hit) => `[${hit.kind}] #${hit.id} ${hit.title} - ${hit.snippet}`)
          .join("\n");
        return textResult(text);
      },
    );

    server.registerTool(
      "propose_monthly_investment_update",
      {
        title: "Propose Monthly Investment Update",
        description:
          "提交一份固定格式的月度投资更新提案：全量人民币金额持仓 + 四段月度审计。工具只创建待确认提案；用户在 dashboard 投资页批准后，系统才同步持仓、按金额计算占比并固化同一节点的月度快照。holdings 必须包含全部资产并显式包含 symbol=CASH 的现金/余额；未列出的旧活跃仓位会被移出。需要 write 权限。提交本提案后,应立即基于审计结论(conclusion、triggers_and_rules)调用 propose_profile_update 更新 status 层画像,同步本月纪律状态;这是月度审计流程的固定第二步,无需用户提醒。",
        inputSchema: {
          month: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .describe("审计月份，严格为 YYYY-MM"),
          holdings: z
            .array(holdingSnapshotItemSchema)
            .min(1)
            .describe("当前全部资产的完整快照。填写 amount_cny，不填写比例；必须包含现金/余额。"),
          review: monthlyReviewDataSchema.describe(
            "固定四段审计：conclusion、triggers_and_rules、actions、next_month_checks。actions 必须区分建议与已执行。",
          ),
        },
      },
      async ({ month, holdings, review }, extra) => {
        const scopes = extra.authInfo?.scopes ?? [];
        if (!scopes.includes("write")) {
          return textResult("错误：此 token 无写权限，无法提交持仓更新提案。", true);
        }

        try {
          const snapshot = normalizeHoldingSnapshot(holdings);
          const current = await listHoldings();
          const diff = holdingSnapshotDiff(current, snapshot);
          const proposal = await createMonthlyInvestmentProposal({
            month,
            snapshot,
            reviewData: review,
            sourceName:
              typeof extra.authInfo?.extra?.tokenName === "string"
                ? extra.authInfo.extra.tokenName
                : "mcp",
          });
          return textResult(
            `已创建 ${month} 月度投资提案 #${proposal.id}：${diff.join("；")}。请用户在 dashboard 投资页确认；批准后持仓和月度审计会在同一节点生效，并自动生成 status 层投资纪律联动提案。下一步请立即调用 propose_profile_update 更新 status 层。`,
          );
        } catch (error) {
          return textResult(
            `错误：${error instanceof Error ? error.message : "持仓快照无效"}`,
            true,
          );
        }
      },
    );

    server.registerTool(
      "propose_profile_update",
      {
        title: "Propose Profile Update",
        description:
          "提交画像修改的待确认提案。此工具不会直接覆盖画像,只会在 dashboard 创建 pending proposal,用户需要查看 diff 并批准后才会生效。参数 layer 是目标画像层,content_md 是该层新的完整 Markdown 正文,summary 是这次修改摘要。需要 write token。",
        inputSchema: {
          layer: z
            .enum(["core", "investing", "creative", "status", "private"])
            .describe("目标画像层:core/investing/creative/status/private。"),
          content_md: z
            .string()
            .min(1)
            .describe("该层新的完整 Markdown 正文,不是局部 patch。"),
          summary: z.string().min(1).describe("这次画像修改的简短摘要。"),
        },
      },
      async ({ layer, content_md, summary }, extra) => {
        const scopes = extra.authInfo?.scopes ?? [];
        if (!scopes.includes("write")) {
          return textResult("错误:此 token 无写权限,无法提交画像修改提案。", true);
        }
        if (!isValidLayer(layer)) {
          return textResult("错误:layer 非法。", true);
        }

        const proposal = await createProposal({
          layer: layer as ProfileLayer,
          proposedContentMd: content_md,
          summary,
          source: "mcp",
          sourceName:
            typeof extra.authInfo?.extra?.tokenName === "string"
              ? extra.authInfo.extra.tokenName
              : "mcp",
        });

        return textResult(
          `已创建待确认画像提案 #${proposal.id}: ${proposal.diffSummary}。请用户在 dashboard 中查看 diff 并批准后生效。`,
        );
      },
    );
  },
  {
    serverInfo: {
      name: "console-mcp",
      version: "1.0.0",
    },
  },
  {
    basePath: "/api",
    maxDuration: 60,
    disableSse: true,
  },
);

const authenticatedHandler = withMcpAuth(
  mcpHandler,
  async (req, bearerToken) => {
    const authHeader = bearerToken
      ? `Bearer ${bearerToken}`
      : req.headers.get("authorization");
    const auth = await verifyBearer(authHeader);
    if (auth) {
      const token = bearerToken ?? authHeader?.replace(/^Bearer\s+/i, "") ?? "";
      return {
        token,
        clientId: auth.name,
        scopes: auth.scope === "write" ? ["read", "write"] : ["read"],
        extra: {
          tokenId: auth.id,
          tokenName: auth.name,
          tokenType: "api",
        },
      };
    }

    if (!bearerToken) return undefined;
    const oauth = await verifyOAuthAccessToken(bearerToken);
    if (!oauth) return undefined;

    return {
      token: bearerToken,
      clientId: oauth.clientId,
      scopes: oauth.scopes,
      extra: {
        tokenId: oauth.id,
        tokenName: oauth.name,
        tokenType: "oauth",
      },
    };
  },
  { required: true },
);

export {
  authenticatedHandler as DELETE,
  authenticatedHandler as GET,
  authenticatedHandler as POST,
};
