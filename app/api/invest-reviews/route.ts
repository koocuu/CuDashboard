import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { snapshotHoldings } from "@/lib/invest-chart";
import { listHoldings } from "@/lib/queries/invest";
import {
  getInvestReviewByMonth,
  INVEST_REVIEW_SECTION,
  INVEST_REVIEW_TYPE,
} from "@/lib/queries/invest-reviews";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const month = typeof body.month === "string" ? body.month.trim() : "";
  const contentMd =
    typeof body.contentMd === "string" ? body.contentMd.trim() : "";

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "月份格式应为 YYYY-MM" }, { status: 400 });
  }
  if (!contentMd) {
    return NextResponse.json({ error: "复盘正文不能为空" }, { status: 400 });
  }

  const holdings = await listHoldings();
  const metadata = {
    month,
    snapshot: snapshotHoldings(holdings),
  };

  const existing = await getInvestReviewByMonth(month);
  if (existing) {
    const [entry] = await db
      .update(entries)
      .set({
        contentMd,
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(entries.id, existing.id))
      .returning();
    return NextResponse.json({ entry });
  }

  const [entry] = await db
    .insert(entries)
    .values({
      sectionKey: INVEST_REVIEW_SECTION,
      type: INVEST_REVIEW_TYPE,
      title: month,
      contentMd,
      tags: ["投资", "月度复盘"],
      status: "active",
      metadata,
    })
    .returning();

  return NextResponse.json({ entry });
}
