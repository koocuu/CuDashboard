import Link from "next/link";
import { desc, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiTokens, oauthAuthorizations } from "@/lib/db/schema";
import { TokenManager } from "@/components/profile/token-manager";

export const dynamic = "force-dynamic";

export default async function TokensPage() {
  const [tokens, oauthRows] = await Promise.all([
    db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        scope: apiTokens.scope,
        lastUsedAt: apiTokens.lastUsedAt,
        lastFetchedAt: apiTokens.lastFetchedAt,
        createdAt: apiTokens.createdAt,
        revokedAt: apiTokens.revokedAt,
      })
      .from(apiTokens)
      .where(isNull(apiTokens.revokedAt))
      .orderBy(desc(apiTokens.createdAt)),
    db
      .select({
        id: oauthAuthorizations.id,
        clientName: oauthAuthorizations.clientName,
        scope: oauthAuthorizations.scope,
        lastUsedAt: oauthAuthorizations.lastUsedAt,
        accessExpiresAt: oauthAuthorizations.accessExpiresAt,
        refreshExpiresAt: oauthAuthorizations.refreshExpiresAt,
        createdAt: oauthAuthorizations.createdAt,
        revokedAt: oauthAuthorizations.revokedAt,
      })
      .from(oauthAuthorizations)
      .where(isNull(oauthAuthorizations.revokedAt))
      .orderBy(desc(oauthAuthorizations.createdAt)),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/profile" className="text-sm text-muted-foreground">
          ← 画像
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Token 与分享页</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        发给联网 AI 时优先用{" "}
        <code className="rounded bg-muted px-1">/c/&lt;slug&gt;</code>{" "}
        分享页;脚本、MCP 和自动化使用 Bearer token。分享页和 API token
        都可命名、吊销。
      </p>
      <TokenManager
        initialTokens={tokens.map((t) => ({
          ...t,
          lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
          lastFetchedAt: t.lastFetchedAt?.toISOString() ?? null,
          createdAt: t.createdAt.toISOString(),
          revokedAt: t.revokedAt?.toISOString() ?? null,
        }))}
        initialOAuthAuthorizations={oauthRows.map((row) => ({
          ...row,
          lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
          accessExpiresAt: row.accessExpiresAt.toISOString(),
          refreshExpiresAt: row.refreshExpiresAt.toISOString(),
          createdAt: row.createdAt.toISOString(),
          revokedAt: row.revokedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
