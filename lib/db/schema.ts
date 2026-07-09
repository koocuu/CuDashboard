import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

/**
 * 工作事项(Phase 1)
 * status: someday 想做未做 / scheduled 排期待做 / in_progress 进行中 / done 已完成
 * 所有时间存 UTC,展示层按 Asia/Shanghai 转换。
 * 软删除:deleted_at 非空即已删除。
 */
export const workItems = pgTable(
  "work_items",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    status: text("status").notNull().default("someday"),
    category: text("category").notNull().default(""),
    note: text("note").notNull().default(""),
    pinned: boolean("pinned").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    doneAt: timestamp("done_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    statusIdx: index("work_items_status_idx").on(t.status),
    categoryIdx: index("work_items_category_idx").on(t.category),
    sortIdx: index("work_items_sort_idx").on(t.sortOrder),
  }),
);

export type WorkItem = typeof workItems.$inferSelect;
export type NewWorkItem = typeof workItems.$inferInsert;

export const WORK_STATUSES = [
  "someday",
  "scheduled",
  "in_progress",
  "done",
] as const;

export type WorkStatus = (typeof WORK_STATUSES)[number];

export const LEGACY_WORK_STATUS_MAP = {
  inbox: "someday",
  waiting: "scheduled",
  archived: "done",
} as const satisfies Record<string, WorkStatus>;

export function normalizeWorkStatus(status: string | null | undefined): WorkStatus {
  if (
    status &&
    (WORK_STATUSES as readonly string[]).includes(status)
  ) {
    return status as WorkStatus;
  }
  if (status && status in LEGACY_WORK_STATUS_MAP) {
    return LEGACY_WORK_STATUS_MAP[
      status as keyof typeof LEGACY_WORK_STATUS_MAP
    ];
  }
  return "someday";
}

// ============================================================
// Phase 2:AI 画像层
// ============================================================

export const PROFILE_LAYERS = [
  "core",
  "investing",
  "creative",
  "status",
  "private",
] as const;
export type ProfileLayer = (typeof PROFILE_LAYERS)[number];

/** 画像文档:每层一行(核心/投资/创作/状态/私密)。 */
export const profileDoc = pgTable("profile_doc", {
  id: serial("id").primaryKey(),
  layer: text("layer").notNull().unique(),
  contentMd: text("content_md").notNull().default(""),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type ProfileDoc = typeof profileDoc.$inferSelect;

/** 画像修改提案:AI 通过 API/粘贴/MCP 提交,用户 diff 确认后合并。 */
export const profileProposals = pgTable(
  "profile_proposals",
  {
    id: serial("id").primaryKey(),
    layer: text("layer").notNull(),
    proposedContentMd: text("proposed_content_md").notNull(),
    diffSummary: text("diff_summary").notNull().default(""),
    source: text("source").notNull().default("paste"), // api / paste / mcp
    sourceName: text("source_name"), // 哪个 AI / token 名
    status: text("status").notNull().default("pending"), // pending / approved / rejected
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => ({
    statusIdx: index("proposals_status_idx").on(t.status),
  }),
);
export type ProfileProposal = typeof profileProposals.$inferSelect;

/** 画像历史版本:每次 approve 后归档旧版,可回滚。 */
export const profileVersions = pgTable("profile_versions", {
  id: serial("id").primaryKey(),
  layer: text("layer").notNull(),
  contentMd: text("content_md").notNull(),
  version: integer("version").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type ProfileVersion = typeof profileVersions.$inferSelect;

/** API Token:AI 与脚本访问,scope=read/write,可吊销。 */
export const apiTokens = pgTable("api_tokens", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull(),
  scope: text("scope").notNull().default("read"), // read / write
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
export type ApiToken = typeof apiTokens.$inferSelect;

export const oauthClients = pgTable(
  "oauth_clients",
  {
    id: serial("id").primaryKey(),
    clientId: text("client_id").notNull().unique(),
    clientName: text("client_name").notNull().default("OAuth Client"),
    redirectUris: text("redirect_uris").array().notNull().default([]),
    scope: text("scope").notNull().default("read write"),
    tokenEndpointAuthMethod: text("token_endpoint_auth_method")
      .notNull()
      .default("none"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => ({
    clientIdIdx: index("oauth_clients_client_id_idx").on(t.clientId),
  }),
);
export type OAuthClient = typeof oauthClients.$inferSelect;

export const oauthAuthorizationCodes = pgTable(
  "oauth_authorization_codes",
  {
    id: serial("id").primaryKey(),
    codeHash: text("code_hash").notNull().unique(),
    clientId: text("client_id").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    scope: text("scope").notNull().default("read write"),
    codeChallenge: text("code_challenge").notNull(),
    codeChallengeMethod: text("code_challenge_method").notNull().default("S256"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    codeHashIdx: index("oauth_authorization_codes_code_hash_idx").on(t.codeHash),
  }),
);
export type OAuthAuthorizationCode =
  typeof oauthAuthorizationCodes.$inferSelect;

export const oauthAuthorizations = pgTable(
  "oauth_authorizations",
  {
    id: serial("id").primaryKey(),
    clientId: text("client_id").notNull(),
    clientName: text("client_name").notNull().default("OAuth Client"),
    scope: text("scope").notNull().default("read write"),
    accessTokenHash: text("access_token_hash").notNull(),
    refreshTokenHash: text("refresh_token_hash").notNull(),
    accessExpiresAt: timestamp("access_expires_at", {
      withTimezone: true,
    }).notNull(),
    refreshExpiresAt: timestamp("refresh_expires_at", {
      withTimezone: true,
    }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => ({
    accessTokenHashIdx: index("oauth_auth_access_token_hash_idx").on(
      t.accessTokenHash,
    ),
    refreshTokenHashIdx: index("oauth_auth_refresh_token_hash_idx").on(
      t.refreshTokenHash,
    ),
  }),
);
export type OAuthAuthorization = typeof oauthAuthorizations.$inferSelect;

// ============================================================
// Phase 3:通用条目表(情感复盘 / 人生感悟)
// ============================================================

/** 通用条目:section_key + type 区分。承载弱结构内容。 */
export const entries = pgTable(
  "entries",
  {
    id: serial("id").primaryKey(),
    sectionKey: text("section_key").notNull(), // emotion / insight ...
    type: text("type").notNull().default("note"), // review / note / energy ...
    title: text("title").notNull().default(""),
    contentMd: text("content_md").notNull().default(""),
    tags: text("tags").array().notNull().default([]),
    status: text("status"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    sectionIdx: index("entries_section_idx").on(t.sectionKey),
  }),
);
export type Entry = typeof entries.$inferSelect;

// ============================================================
// Phase 3:投资板块
// ============================================================

export const holdings = pgTable("holdings", {
  id: serial("id").primaryKey(),
  market: text("market").notNull(), // cn / us
  symbol: text("symbol").notNull().default(""),
  name: text("name").notNull(),
  positionPct: integer("position_pct").notNull().default(0), // 仓位占比(整数百分比)
  costNote: text("cost_note").notNull().default(""),
  thesisMd: text("thesis_md").notNull().default(""), // 买入逻辑
  status: text("status").notNull().default("active"), // active / watching / exited
  watchPriceNote: text("watch_price_note").notNull().default(""), // 观察池:当时价格备注
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
export type Holding = typeof holdings.$inferSelect;

// ============================================================
// v2 预留:entries 由 MCP 写入,暂不做手动内容板块 UI
// ============================================================

// ============================================================
// 运行状态:备份结果
// ============================================================

/** 每次 GitHub 备份的运行结果,用于 Dashboard 告警。 */
export const backupRuns = pgTable(
  "backup_runs",
  {
    id: serial("id").primaryKey(),
    status: text("status").notNull(), // success / failed
    message: text("message").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("backup_runs_created_at_idx").on(t.createdAt),
  }),
);
export type BackupRun = typeof backupRuns.$inferSelect;
