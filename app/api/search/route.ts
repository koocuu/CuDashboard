import { NextRequest, NextResponse } from "next/server";
import { verifyRequestToken } from "@/lib/auth/tokens";
import { searchAll } from "@/lib/queries/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/search?q=（需 read token）：pg_trgm 全文检索。 */
export async function GET(req: NextRequest) {
  const auth = await verifyRequestToken(req, "read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "缺少查询参数 q" }, { status: 400 });
  }

  const hits = await searchAll(q);
  return NextResponse.json({ q, count: hits.length, hits });
}
