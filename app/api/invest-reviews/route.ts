import { NextRequest, NextResponse } from "next/server";
import { validateMonthlyReview } from "@/lib/invest-review-template";
import {
  upsertInvestReview,
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
  const validation = validateMonthlyReview(month, contentMd);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const entry = await upsertInvestReview({ month, contentMd });
  return NextResponse.json({ entry });
}
