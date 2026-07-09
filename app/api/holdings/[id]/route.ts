import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";

export const runtime = "nodejs";

function pid(s: string) {
  const n = Number(s);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = pid(idStr);
  if (!id) return NextResponse.json({ error: "无效 id" }, { status: 400 });

  const b = await req.json().catch(() => ({}));
  const patch: Partial<typeof holdings.$inferInsert> = { updatedAt: new Date() };

  if (typeof b.name === "string" && b.name.trim()) patch.name = b.name.trim();
  if (typeof b.symbol === "string") patch.symbol = b.symbol.trim();
  if (b.market === "cn" || b.market === "us") patch.market = b.market;
  if (Number.isFinite(b.positionPct))
    patch.positionPct = Math.min(100, Math.max(0, Math.round(b.positionPct)));
  if (typeof b.costNote === "string") patch.costNote = b.costNote;
  if (typeof b.thesisMd === "string") patch.thesisMd = b.thesisMd;
  if (typeof b.watchPriceNote === "string") patch.watchPriceNote = b.watchPriceNote;
  if (["active", "watching", "exited"].includes(b.status)) patch.status = b.status;

  const [item] = await db
    .update(holdings)
    .set(patch)
    .where(and(eq(holdings.id, id), isNull(holdings.deletedAt)))
    .returning();
  if (!item) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ holding: item });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = pid(idStr);
  if (!id) return NextResponse.json({ error: "无效 id" }, { status: 400 });
  const [item] = await db
    .update(holdings)
    .set({ deletedAt: new Date() })
    .where(and(eq(holdings.id, id), isNull(holdings.deletedAt)))
    .returning();
  if (!item) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
