import "@/lib/env-loader";
import crypto from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiTokens } from "@/lib/db/schema";

export type TokenScope = "read" | "write";

/** 生成一个新的明文 token(仅此一次可见)。 */
export function generateToken(): string {
  return "cns_" + crypto.randomBytes(24).toString("hex");
}

/** token 的存储哈希(sha256,便于按值查找)。 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * 校验 Bearer token,返回其 scope;无效返回 null。
 * 同时更新 last_used_at。
 */
export async function verifyBearer(
  authHeader: string | null,
): Promise<{ id: number; scope: TokenScope; name: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const raw = authHeader.slice(7).trim();
  if (!raw) return null;

  const hash = hashToken(raw);
  const rows = await db
    .select()
    .from(apiTokens)
    .where(and(eq(apiTokens.tokenHash, hash), isNull(apiTokens.revokedAt)))
    .limit(1);

  const tok = rows[0];
  if (!tok) return null;

  // 更新最后使用时间(不阻塞主流程)
  db.update(apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokens.id, tok.id))
    .catch(() => {});

  return { id: tok.id, scope: tok.scope as TokenScope, name: tok.name };
}

/** 从 URL query 或 Authorization 头解析 token(/api/context 支持 ?token=)。 */
export async function verifyRequestToken(
  req: Request,
  required: TokenScope,
): Promise<{ ok: true; scope: TokenScope; name: string } | { ok: false; status: number; error: string }> {
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token");
  const auth = queryToken
    ? `Bearer ${queryToken}`
    : req.headers.get("authorization");

  const result = await verifyBearer(auth);
  if (!result) {
    return { ok: false, status: 401, error: "无效或缺失的 token" };
  }
  if (required === "write" && result.scope !== "write") {
    return { ok: false, status: 403, error: "此 token 无写权限" };
  }
  return { ok: true, scope: result.scope, name: result.name };
}
