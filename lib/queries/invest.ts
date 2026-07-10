import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";

/** 活跃+观察持仓(未删除),按市场、仓位排序。 */
export async function listHoldings() {
  return db
    .select()
    .from(holdings)
    .where(isNull(holdings.deletedAt))
    .orderBy(asc(holdings.market), desc(holdings.amountCny));
}

export async function getHolding(id: number) {
  const rows = await db
    .select()
    .from(holdings)
    .where(and(eq(holdings.id, id), isNull(holdings.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

/** 投资概览统计。 */
export async function investStats() {
  const items = await listHoldings();
  const active = items.filter((h) => h.status === "active");
  const watching = items.filter((h) => h.status === "watching");

  return {
    holdingCount: active.length,
    watchingCount: watching.length,
    totalAmountCny: active.reduce((sum, h) => sum + h.amountCny, 0),
  };
}
