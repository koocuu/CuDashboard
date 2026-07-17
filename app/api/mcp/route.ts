import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { verifyBearer } from "@/lib/auth/tokens";
import { buildContextPackage, resolveLayers } from "@/lib/context-builder";
import { verifyOAuthAccessToken } from "@/lib/oauth";
import { searchAll } from "@/lib/queries/search";
import { createProposal } from "@/lib/proposals";
import { isValidLayer } from "@/lib/queries/profile";
import { getLatestTopicBatch } from "@/lib/queries/topics";
import { formatTopicBatchMarkdown } from "@/lib/topics-display";
import {
  createMonthlyInvestmentProposal,
  holdingSnapshotDiff,
  holdingSnapshotItemSchema,
  normalizeHoldingSnapshot,
} from "@/lib/holding-proposals";
import { listHoldings } from "@/lib/queries/invest";
import { monthlyReviewDataSchema } from "@/lib/invest-review-template";
import { createProfilePatchProposal } from "@/lib/profile-patch-proposals";
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
          "读取用户的个人画像 Markdown。参数 layers 可选,用逗号指定层名(core/investing/creative/status/private/public);不传则返回该 token 权限内的全部层,包括 private 层(默认不含 public)。用于让 AI 在新对话中理解用户背景、偏好、当前状态与附录信息。",
        inputSchema: {
          layers: z
            .string()
            .optional()
            .describe(
              "可选。逗号分隔的画像层名,如 core,status 或 core,investing,creative,status。需要网站公开近况时显式加入 public。",
            ),
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
      "get_topic_batch",
      {
        title: "Get Topic Batch",
        description:
          "读取 topic-radar 写入的最新选题候选批次（首页「今日选题」/topics 同源数据）。返回 Markdown：中文标题、分数、切入点、原文链接。可选 account 过滤棱角计划(lengjiao)或碳基灵感收容所(carbon)。这不是画像层，也不经提案确认；写稿前仍须人工挑选。",
        inputSchema: {
          account: z
            .string()
            .optional()
            .describe(
              "可选。账号过滤：lengjiao / 棱角计划 / carbon / 碳基灵感收容所。不传则返回全部账号。",
            ),
        },
      },
      async ({ account }) => {
        const batch = await getLatestTopicBatch();
        if (!batch) {
          return textResult("暂无选题批次。等 topic-radar 跑完后再试。");
        }
        const markdown = formatTopicBatchMarkdown({
          id: batch.id,
          day: batch.day,
          summary: batch.summary,
          contentMd: batch.contentMd,
          candidates: batch.candidates,
          createdAt: batch.createdAt,
          account,
        });
        return textResult(markdown);
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
      "propose_profile_patch",
      {
        title: "Propose Profile Patch",
        description:
          "对画像某一层内的单个条目提交局部增删改提案，适合连续修改一个小点，不需要重发整层 Markdown。用 section 精确定位 ## 二级标题，用 anchor 精确匹配 ### 条目标题、独立 **条目标题** 或 **条目标题**: 正文。第一次调用创建 pending proposal；同一调用方继续修改同一层时，会基于该 pending 候选正文累积修改并更新原提案，始终只保留一个提案 ID。不会直接写入画像，仍需用户在 dashboard 查看 diff 并批准。若该层已有其他来源提案或定位存在歧义，会明确报错而不会猜测。需要 write 权限。",
        inputSchema: {
          layer: z
            .enum(["core", "investing", "creative", "status", "private", "public"])
            .describe("目标画像层:core/investing/creative/status/private/public。"),
          section: z
            .string()
            .min(1)
            .describe('二级标题的纯文本，如 "情感复盘记录"，按完整文本精确匹配。'),
          operation: z
            .enum(["add", "update", "delete"])
            .describe("局部操作:add 新增、update 修改、delete 删除。"),
          anchor: z
            .string()
            .default("")
            .describe(
              "条目标题的纯文本。update/delete 时必填；add 时表示插入到该条目之后，留空则插入 section 末尾。",
            ),
          new_content_md: z
            .string()
            .default("")
            .describe(
              "add/update 时必填的单条完整 Markdown，必须以 ### 条目标题、独立 **条目标题** 或 **条目标题**: 正文开头；delete 时留空。",
            ),
          summary: z.string().min(1).describe("本次局部修改摘要，用于提案列表。"),
        },
      },
      async (
        { layer, section, operation, anchor, new_content_md, summary },
        extra,
      ) => {
        const scopes = extra.authInfo?.scopes ?? [];
        if (!scopes.includes("write")) {
          return textResult(
            "错误：此 token 无写权限，无法提交画像局部修改提案。",
            true,
          );
        }
        if (!isValidLayer(layer)) {
          return textResult("错误：layer 非法。", true);
        }

        try {
          const sourceName =
            typeof extra.authInfo?.extra?.tokenName === "string"
              ? extra.authInfo.extra.tokenName
              : "mcp";
          const result = await createProfilePatchProposal({
            layer: layer as ProfileLayer,
            section,
            operation,
            anchor,
            newContentMd: new_content_md,
            summary,
            sourceName,
          });
          const action = result.continued ? "已合并到" : "已创建";
          return textResult(
            `${action}待确认画像提案 #${result.proposal.id}：在「${result.patch.section}」中${operation === "add" ? "新增" : operation === "update" ? "修改" : "删除"}「${result.patch.entryTitle}」。请用户在 dashboard 查看累计 diff 并批准后生效。`,
          );
        } catch (error) {
          return textResult(
            `错误：${error instanceof Error ? error.message : "局部画像提案创建失败"}`,
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
            .enum(["core", "investing", "creative", "status", "private", "public"])
            .describe(
              "目标画像层:core/investing/creative/status/private/public。public 层写给网站 /now,批准后会同步到 koocuu.com。",
            ),
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
