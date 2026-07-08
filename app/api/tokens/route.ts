import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiTokens } from "@/lib/db/schema";
import { generateShareSlug, generateToken, hashToken } from "@/lib/auth/tokens";

export const runtime = "nodejs";

export async function GET() {
  const rows = await db
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
    .orderBy(desc(apiTokens.createdAt));
  return NextResponse.json({ tokens: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const kind = body.kind === "share" ? "share" : "api";
  const scope = kind === "share" ? "read" : body.scope === "write" ? "write" : "read";

  if (!name) {
    return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
  }

  const plain = kind === "share" ? generateShareSlug() : generateToken();
  const [tok] = await db
    .insert(apiTokens)
    .values({ name, scope, tokenHash: hashToken(plain) })
    .returning();

  const origin = new URL(req.url).origin;
  return NextResponse.json(
    {
      token: { id: tok.id, name: tok.name, scope: tok.scope },
      plain,
      kind,
      shareUrl: kind === "share" ? `${origin}/c/${plain}` : null,
      fullShareUrl: kind === "share" ? `${origin}/c/${plain}/full` : null,
      contextUrl:
        kind === "api" ? `${origin}/api/context?token=${plain}&profile=general` : null,
    },
    { status: 201 },
  );
}
