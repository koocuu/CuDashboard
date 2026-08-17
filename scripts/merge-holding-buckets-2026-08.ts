import "dotenv/config";
import { and, desc, eq, isNull, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { holdingProposals, holdings } from "@/lib/db/schema";
import {
  allowedHoldingBuckets,
  assertSnapshotUsesAllowedBuckets,
} from "@/lib/holding-buckets";
import { planHoldingBucketMerge } from "@/lib/holding-bucket-merge";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const rows = await db.select().from(holdings);
  const plan = planHoldingBucketMerge(rows);
  const symbols = plan.buckets.map((item) => item.symbol);
  const now = new Date();

  await db
    .update(holdings)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        eq(holdings.status, "active"),
        isNull(holdings.deletedAt),
        notInArray(holdings.symbol, symbols),
      ),
    );

  for (const item of plan.buckets) {
    const existing = await db
      .select()
      .from(holdings)
      .where(eq(holdings.symbol, item.symbol))
      .orderBy(desc(holdings.id))
      .limit(1);
    const values = {
      market: item.market,
      name: item.keepUnchanged && existing[0] ? existing[0].name : item.name,
      amountCny: item.amountCny,
      positionPct: Math.round((item.amountCny / plan.total) * 10000) / 100,
      thesisMd: item.keepUnchanged
        ? existing[0]?.thesisMd || item.thesisMd
        : item.thesisMd,
      status: "active" as const,
      watchPriceNote: "",
      deletedAt: null,
      updatedAt: now,
    };
    if (existing[0]) {
      await db.update(holdings).set(values).where(eq(holdings.id, existing[0].id));
    } else {
      await db.insert(holdings).values({ symbol: item.symbol, ...values });
    }
  }

  const pending = await db
    .select()
    .from(holdingProposals)
    .where(eq(holdingProposals.status, "pending"));
  let rejectedIllegal = 0;
  for (const proposal of pending) {
    const snapshot = Array.isArray(proposal.snapshot) ? proposal.snapshot : [];
    try {
      assertSnapshotUsesAllowedBuckets(
        snapshot as Array<{ symbol: string }>,
        allowedHoldingBuckets(),
      );
    } catch {
      await db
        .update(holdingProposals)
        .set({ status: "rejected", resolvedAt: now })
        .where(eq(holdingProposals.id, proposal.id));
      rejectedIllegal += 1;
      console.log(`- rejected pending #${proposal.id} (illegal bucket symbols)`);
    }
  }

  const after = await db
    .select({
      symbol: holdings.symbol,
      name: holdings.name,
      amount: holdings.amountCny,
    })
    .from(holdings)
    .where(and(eq(holdings.status, "active"), isNull(holdings.deletedAt)));
  const afterTotal = Math.round(after.reduce((sum, row) => sum + Number(row.amount), 0) * 100) / 100;
  if (afterTotal !== plan.total) {
    throw new Error(`写库后总资产为 ${afterTotal}，期望 ${plan.total}。请人工检查 holdings。`);
  }

  console.log("✓ merged holdings:");
  for (const row of after.sort((a, b) => a.symbol.localeCompare(b.symbol))) {
    console.log(`  ${row.symbol}  ${row.name}  ¥${Math.round(Number(row.amount)).toLocaleString("zh-CN")}`);
  }
  console.log(`✓ total ¥${afterTotal.toLocaleString("zh-CN")} · rejected illegal pending ${rejectedIllegal}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
