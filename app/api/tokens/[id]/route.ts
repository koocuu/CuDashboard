import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiTokens } from "@/lib/db/schema";

export const runtime = "nodejs";

/** DELETE /api/tokens/[id]:吊销 token(软吊销,置 revoked_at)。 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "无效 id" }, { status: 400 });
  }
  const [tok] = await db
    .update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(eq(apiTokens.id, id))
    .returning();
  if (!tok) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
