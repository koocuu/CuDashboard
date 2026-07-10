import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";
import { listHoldings } from "@/lib/queries/invest";

export const runtime = "nodejs";

function parsePct(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n * 100) / 100));
}

export async function GET() {
  return NextResponse.json({ holdings: await listHoldings() });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "名称不能为空" }, { status: 400 });

  const market = ["cn", "us", "other"].includes(b.market) ? b.market : "cn";
  const status = ["active", "watching", "exited"].includes(b.status)
    ? b.status
    : "active";

  const [item] = await db
    .insert(holdings)
    .values({
      name,
      market,
      symbol: typeof b.symbol === "string" ? b.symbol.trim() : "",
      positionPct: parsePct(b.positionPct),
      costNote: typeof b.costNote === "string" ? b.costNote : "",
      thesisMd: typeof b.thesisMd === "string" ? b.thesisMd : "",
      watchPriceNote: typeof b.watchPriceNote === "string" ? b.watchPriceNote : "",
      status,
    })
    .returning();

  return NextResponse.json({ holding: item }, { status: 201 });
}
