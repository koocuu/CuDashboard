import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";
import { formatBucketSymbols, isCanonicalHoldingSymbol } from "@/lib/holding-buckets";

export const runtime = "nodejs";

function parseAmount(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n * 100) / 100);
}

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
  if (typeof b.symbol === "string") patch.symbol = b.symbol.trim().toUpperCase();
  if (b.market === "cn" || b.market === "us" || b.market === "other")
    patch.market = b.market;
  const amountCny = parseAmount(b.amountCny);
  if (amountCny !== null) patch.amountCny = amountCny;
  if (typeof b.costNote === "string") patch.costNote = b.costNote;
  if (typeof b.thesisMd === "string") patch.thesisMd = b.thesisMd;
  if (typeof b.watchPriceNote === "string") patch.watchPriceNote = b.watchPriceNote;
  if (["active", "watching", "exited"].includes(b.status)) patch.status = b.status;

  const existing = await db
    .select({ symbol: holdings.symbol, status: holdings.status })
    .from(holdings)
    .where(and(eq(holdings.id, id), isNull(holdings.deletedAt)))
    .limit(1);
  if (!existing[0]) return NextResponse.json({ error: "未找到" }, { status: 404 });
  const nextStatus = patch.status ?? existing[0].status;
  const nextSymbol = patch.symbol ?? existing[0].symbol;
  if (nextStatus === "active" && !isCanonicalHoldingSymbol(nextSymbol)) {
    return NextResponse.json(
      {
        error: `活跃持仓必须使用大类桶 symbol。合法桶名：[${formatBucketSymbols()}]。`,
      },
      { status: 400 },
    );
  }

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
