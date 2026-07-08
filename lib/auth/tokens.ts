import "@/lib/env-loader";
import crypto from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiTokens } from "@/lib/db/schema";

export type TokenScope = "read" | "write";

export function generateToken(): string {
  return "cns_" + crypto.randomBytes(24).toString("hex");
}

export function generateShareSlug(): string {
  return crypto.randomBytes(9).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function touchToken(id: number, fetched = false) {
  const now = new Date();
  db.update(apiTokens)
    .set(fetched ? { lastUsedAt: now, lastFetchedAt: now } : { lastUsedAt: now })
    .where(eq(apiTokens.id, id))
    .catch(() => {});
}

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

  touchToken(tok.id);
  return { id: tok.id, scope: tok.scope as TokenScope, name: tok.name };
}

export async function verifyShareSlug(
  slug: string,
): Promise<{ id: number; scope: TokenScope; name: string } | null> {
  if (!/^[A-Za-z0-9_-]{12,16}$/.test(slug)) return null;

  const hash = hashToken(slug);
  const rows = await db
    .select()
    .from(apiTokens)
    .where(and(eq(apiTokens.tokenHash, hash), isNull(apiTokens.revokedAt)))
    .limit(1);

  const tok = rows[0];
  if (!tok || tok.scope !== "read") return null;

  touchToken(tok.id, true);
  return { id: tok.id, scope: tok.scope as TokenScope, name: tok.name };
}

export async function verifyRequestToken(
  req: Request,
  required: TokenScope,
): Promise<
  | { ok: true; scope: TokenScope; name: string }
  | { ok: false; status: number; error: string }
> {
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
