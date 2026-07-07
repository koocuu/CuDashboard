import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";

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
