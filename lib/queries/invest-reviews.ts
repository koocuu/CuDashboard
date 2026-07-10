import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { snapshotHoldings } from "@/lib/invest-chart";
import { listHoldings } from "@/lib/queries/invest";

export const INVEST_REVIEW_SECTION = "investment_review";
export const INVEST_REVIEW_TYPE = "monthly_review";

export async function listInvestReviews() {
  return db
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.sectionKey, INVEST_REVIEW_SECTION),
        eq(entries.type, INVEST_REVIEW_TYPE),
        isNull(entries.deletedAt),
      ),
    )
    .orderBy(desc(entries.title));
}

export async function getInvestReviewByMonth(month: string) {
  const rows = await db
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.sectionKey, INVEST_REVIEW_SECTION),
        eq(entries.type, INVEST_REVIEW_TYPE),
        eq(entries.title, month),
        isNull(entries.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertInvestReview(input: {
  month: string;
  contentMd: string;
  refreshSnapshot?: boolean;
}) {
  const existing = await getInvestReviewByMonth(input.month);
  const existingMetadata = (existing?.metadata ?? {}) as {
    month?: string;
    snapshot?: unknown;
  };
  const metadata =
    existing && existingMetadata.snapshot && !input.refreshSnapshot
      ? { ...existingMetadata, month: input.month }
      : {
          month: input.month,
          snapshot: snapshotHoldings(await listHoldings()),
        };

  if (existing) {
    const [entry] = await db
      .update(entries)
      .set({ contentMd: input.contentMd, metadata, updatedAt: new Date() })
      .where(eq(entries.id, existing.id))
      .returning();
    return entry;
  }

  const [entry] = await db
    .insert(entries)
    .values({
      sectionKey: INVEST_REVIEW_SECTION,
      type: INVEST_REVIEW_TYPE,
      title: input.month,
      contentMd: input.contentMd,
      tags: ["投资", "月度复盘"],
      status: "active",
      metadata,
    })
    .returning();
  return entry;
}
