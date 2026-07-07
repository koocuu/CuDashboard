import { NextRequest, NextResponse } from "next/server";
import { sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { workItems } from "@/lib/db/schema";

export const runtime = "nodejs";

/**
 * 批量重排:body { ids: number[] } —— 按数组顺序写入 sort_order。
 * 一次 SQL(CASE)完成,避免多次往返。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ids: unknown = body.ids;
  if (!Array.isArray(ids) || ids.some((n) => !Number.isInteger(n))) {
    return NextResponse.json({ error: "ids 无效" }, { status: 400 });
  }
  if (ids.length === 0) return NextResponse.json({ ok: true });

  const idList = ids as number[];
  const cases = sql.join(
    idList.map((id, i) => sql`when ${workItems.id} = ${id} then ${i}`),
    sql` `,
  );

  await db
    .update(workItems)
    .set({ sortOrder: sql`case ${cases} else ${workItems.sortOrder} end` })
    .where(inArray(workItems.id, idList));

  return NextResponse.json({ ok: true });
}
