import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { verifyBearer } from "@/lib/auth/tokens";
import { buildContextPackage, resolveLayers } from "@/lib/context-builder";
import { publicOrigin, verifyOAuthAccessToken } from "@/lib/oauth";
import { searchAll } from "@/lib/queries/search";
import { createProposal } from "@/lib/proposals";
import { getAllLayers, isValidLayer } from "@/lib/queries/profile";
import { getLatestTopicBatch } from "@/lib/queries/topics";
import { listProjects } from "@/lib/queries/projects";
import { formatProjectsMarkdown } from "@/lib/projects-display";
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
import { LAYER_META, LAYER_ORDER } from "@/lib/profile-meta";
import { PROFILE_LAYERS, type ProfileLayer } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils";
import { withClaudeMcpCompat } from "@/lib/mcp-claude-compat";

const PROFILE_LAYER_ENUM = PROFILE_LAYERS as unknown as [
  ProfileLayer,
  ...ProfileLayer[],
];

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
          "读取用户的个人画像 Markdown。参数 layers 可选,用逗号指定层名(core/status/investing/relationship);不传则返回该 token 权限内的全部四层。MCP 内部不做默认收窄,分级只发生在是否连接此 MCP。status 含「内部状态」与「公开状态」两节。当前 coding 作品列表不在画像层，请另调 get_projects。",
        inputSchema: {
          layers: z
            .string()
            .optional()
            .describe(
              "可选。逗号分隔的画像层名,如 core,status 或 core,status,investing,relationship。",
            ),
        },
      },
      async ({ layers }) => {
        const resolvedLayers = layers
          ? resolveLayers(null, layers)
          : [...LAYER_ORDER];
        const markdown = await buildContextPackage(resolvedLayers);
        return textResult(markdown);
      },
    );

    server.registerTool(
      "list_profile_layers",
      {
        title: "List Profile Layers",
        description:
          "列出当前画像的四层结构：core、status、investing、relationship。返回每层展示名、简介、最后更新时间与字数，便于先选型再 get_profile / propose。",
        inputSchema: {},
      },
      async () => {
        const docs = await getAllLayers();
        const byLayer = new Map(docs.map((doc) => [doc.layer, doc]));
        const lines = LAYER_ORDER.map((layer) => {
          const meta = LAYER_META[layer];
          const doc = byLayer.get(layer);
          const updated =
            doc && doc.id > 0 ? formatDate(doc.updatedAt) : "从未写入";
          const chars = doc?.contentMd?.length ?? 0;
          const version = doc && doc.id > 0 ? doc.version : 0;
          return `- ${layer}（${meta.label}）v${version} · ${chars} 字 · 更新 ${updated}\n  ${meta.desc}`;
        });
        return textResult(`画像层（共 ${LAYER_ORDER.length} 层）:\n${lines.join("\n")}`);
      },
    );

    server.registerTool(
      "search_entries",
      {
        title: "Search Entries",
        description:
          "搜索用户数据库中的工作事项、作品、持仓和通用条目。参数 q 是搜索关键词。底层复用 dashboard 的 pg_trgm/ILIKE 全文检索,适合回答'最近排期事项是什么'、'某个标的买入逻辑是什么'、'捋捋是什么项目'这类问题。",
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
      "get_projects",
      {
        title: "Get Projects",
        description:
          "读取用户的 coding 作品墙（与 dashboard「项目」页同源，与画像层独立）。返回名称、领域、一句话、链接、可选 skill 名。了解当前作品上下文时用本工具，不要把项目事实写进画像。不分在做/上线/暂停。",
        inputSchema: {},
      },
      async () => {
        const items = await listProjects();
        return textResult(formatProjectsMarkdown(items));
      },
    );

    server.registerTool(
      "get_topic_batch",
      {
        title: "Get Topic Batch",
        description:
          "读取 topic-radar 写入的最新选题候选批次（/topics 备查页同源数据，已不在导航与首页主场）。返回 Markdown：中文标题、分数、切入点、原文链接。可选 account 过滤棱角计划(lengjiao)或碳基灵感收容所(carbon)。这不是画像层，也不经提案确认；写稿前仍须人工挑选。用户写欲来自亲身经历，不要把本列表当成必须完成的作业。",
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
          "对画像某一层做局部提案：可改 section 内单条(add/update/delete)，或整节替换(replace_section)。不需要重发整层 Markdown。用 section 精确定位 ## 二级标题；条目操作用 anchor 匹配 ### / **标题** / **标题**: 正文。replace_section 的 new_content_md 须含完整 section（以目标 ## 标题开头）；若 section 不存在则追加到层末。第一次调用创建 pending proposal；同一调用方继续修改同一层时累积到同一提案。不会直接写入画像。需要 write 权限。主动识别提示:当对话中出现值得长期记住的稳定事实、原则性判断、或明确的偏好/状态变化时(而非临时性话题或一次性信息),应主动调用本工具提议记录,不必等待用户明确要求'更新画像'。判断标准:这条信息如果三个月后被问起,用户是否会希望 AI 已经知道——如果是,值得提议;如果只是当下这句话的临时上下文,不必提议。提议后仍需用户在 dashboard 批准才生效,不必因'可能不重要'而犹豫是否提议,人工审核会做最终把关。",
        inputSchema: {
          layer: z
            .enum(PROFILE_LAYER_ENUM)
            .describe("目标画像层:core/status/investing/relationship。"),
          section: z
            .string()
            .min(1)
            .describe('二级标题的纯文本，如 "情感复盘记录" 或 "内部状态"，按完整文本精确匹配。'),
          operation: z
            .enum(["add", "update", "delete", "replace_section"])
            .describe(
              "add/update/delete=section 内单条；replace_section=整节替换（section 不存在则追加）。",
            ),
          anchor: z
            .string()
            .default("")
            .describe(
              "条目标题的纯文本。update/delete 时必填；add 时表示插入到该条目之后，留空则插入 section 末尾；replace_section 忽略。",
            ),
          new_content_md: z
            .string()
            .default("")
            .describe(
              "add/update：单条完整 Markdown（###/** 标题开头）。replace_section：完整 section Markdown（必须以目标 ## 标题开头）。delete 时留空。",
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
          const detail =
            operation === "replace_section"
              ? `整节替换「${result.patch.section}」`
              : `在「${result.patch.section}」中${operation === "add" ? "新增" : operation === "update" ? "修改" : "删除"}「${result.patch.entryTitle}」`;
          return textResult(
            `${action}待确认画像提案 #${result.proposal.id}：${detail}。请用户在 dashboard 查看累计 diff 并批准后生效。`,
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
          "提交画像修改的待确认提案。此工具不会直接覆盖画像,只会在 dashboard 创建 pending proposal,用户需要查看 diff 并批准后才会生效。参数 layer 是目标画像层,content_md 是该层新的完整 Markdown 正文,summary 是这次修改摘要。需要 write token。同样适用主动识别原则(见 propose_profile_patch 说明):大改一整层时,若对话中发现该层内容已过期或有稳定变化,应主动提议重写,不必等待用户要求。",
        inputSchema: {
          layer: z
            .enum(PROFILE_LAYER_ENUM)
            .describe(
              "目标画像层:core/status/investing/relationship。网站 /now 内容写在 status 层的「公开状态」节，批准 status 后同步。",
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
  {
    required: true,
    // RFC 9728：指向 path-based PRM，避免新客户端只探测 /api/mcp 后缀时拿到 404
    resourceMetadataPath: "/.well-known/oauth-protected-resource/api/mcp",
  },
);

// Claude 会因 SDK 1.26+ 的 title/execution/listChanged 等字段静默丢掉全部工具
const handler = withClaudeMcpCompat(authenticatedHandler);

/**
 * Claude OAuth 成功后会 HEAD 探测 /api/mcp。
 * mcp-handler 只处理 GET/POST/DELETE，HEAD 会落入空分支导致响应永不结束。
 */
export async function HEAD(req: Request) {
  const authHeader = req.headers.get("authorization");
  const api = await verifyBearer(authHeader);
  if (api) return new Response(null, { status: 200 });

  const bearer = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (bearer) {
    const oauth = await verifyOAuthAccessToken(bearer);
    if (oauth) return new Response(null, { status: 200 });
  }

  const origin = publicOrigin(req);
  return new Response(null, {
    status: 401,
    headers: {
      "WWW-Authenticate": `Bearer error="invalid_token", error_description="No authorization provided", resource_metadata="${origin}/.well-known/oauth-protected-resource/api/mcp"`,
    },
  });
}

export {
  handler as DELETE,
  handler as GET,
  handler as POST,
};
