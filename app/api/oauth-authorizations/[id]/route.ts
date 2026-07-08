import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { oauthAuthorizations } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "无效 id" }, { status: 400 });
  }

  const [authorization] = await db
    .update(oauthAuthorizations)
    .set({ revokedAt: new Date() })
    .where(eq(oauthAuthorizations.id, id))
    .returning();

  if (!authorization) {
    return NextResponse.json({ error: "未找到授权" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
