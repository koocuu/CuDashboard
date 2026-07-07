import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiTokens } from "@/lib/db/schema";
import { TokenManager } from "@/components/profile/token-manager";

export const dynamic = "force-dynamic";

export default async function TokensPage() {
  const tokens = await db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      scope: apiTokens.scope,
      lastUsedAt: apiTokens.lastUsedAt,
      createdAt: apiTokens.createdAt,
      revokedAt: apiTokens.revokedAt,
    })
    .from(apiTokens)
    .orderBy(desc(apiTokens.createdAt));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/profile" className="text-sm text-muted-foreground">
          ← 画像
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">API Token</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        供 AI 与脚本访问。read:只读画像/导出;write:额外可提交提案。
        把{" "}
        <code className="rounded bg-muted px-1">
          /api/context?token=xxx
        </code>{" "}
        链接发给联网 AI 即可读取画像。
      </p>
      <TokenManager
        initialTokens={tokens.map((t) => ({
          ...t,
          lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
          createdAt: t.createdAt.toISOString(),
          revokedAt: t.revokedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
