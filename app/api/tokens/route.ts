import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiTokens } from "@/lib/db/schema";
import { generateToken, hashToken } from "@/lib/auth/tokens";

export const runtime = "nodejs";

/** GET /api/tokens:列出所有 token(不含明文)。 */
export async function GET() {
  const rows = await db
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
  return NextResponse.json({ tokens: rows });
}

/** POST /api/tokens { name, scope }:生成新 token,返回明文(仅此一次)。 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const scope = body.scope === "write" ? "write" : "read";
  if (!name) {
    return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
  }

  const plain = generateToken();
  const [tok] = await db
    .insert(apiTokens)
    .values({ name, scope, tokenHash: hashToken(plain) })
    .returning();

  return NextResponse.json(
    { token: { id: tok.id, name: tok.name, scope: tok.scope }, plain },
    { status: 201 },
  );
}
