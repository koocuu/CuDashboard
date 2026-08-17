import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { holdingProposals } from "@/lib/db/schema";
import { saveLayer } from "@/lib/queries/profile";
import { statusContentForNow } from "@/lib/status-sections";
import { syncPublicLayerToWebsite } from "@/lib/website-sync";
import {
  applyHoldingSnapshot,
  getHoldingProposal,
  proposalReviewData,
  proposalSnapshot,
} from "@/lib/holding-proposals";
import { allowedHoldingBuckets, assertSnapshotUsesAllowedBuckets } from "@/lib/holding-buckets";
import { isProposalStale, staleApproveError } from "@/lib/proposal-freshness";
import { renderMonthlyReview } from "@/lib/invest-review-template";
import { upsertInvestReview } from "@/lib/queries/invest-reviews";

export const runtime = "nodejs";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idString } = await params;
  const id = parseId(idString);
  if (!id) return NextResponse.json({ error: "无效 id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const proposal = await getHoldingProposal(id);
  if (!proposal) return NextResponse.json({ error: "未找到提案" }, { status: 404 });
  if (proposal.status !== "pending") {
    return NextResponse.json({ error: "该提案已处理" }, { status: 409 });
  }

  if (body.action === "reject") {
    await db
      .update(holdingProposals)
      .set({ status: "rejected", resolvedAt: new Date() })
      .where(eq(holdingProposals.id, id));
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  if (body.action === "approve") {
    if (isProposalStale(proposal.createdAt)) {
      return NextResponse.json({ error: staleApproveError() }, { status: 409 });
    }
    let websiteSync: { ok: boolean; warning?: string; path?: string } | undefined;
    try {
      const snapshot = proposalSnapshot(proposal.snapshot);
      assertSnapshotUsesAllowedBuckets(snapshot, allowedHoldingBuckets());
      await applyHoldingSnapshot(snapshot);
      if (proposal.month && proposal.reviewData) {
        const reviewData = proposalReviewData(proposal.reviewData);
        await upsertInvestReview({
          month: proposal.month,
          contentMd: renderMonthlyReview(proposal.month, reviewData),
          refreshSnapshot: true,
        });
        const nowMd = reviewData.now_md?.trim();
        if (nowMd) {
          await saveLayer("status", nowMd);
          const payload = statusContentForNow(nowMd);
          if (payload) {
            const sync = await syncPublicLayerToWebsite(payload);
            websiteSync = sync.ok
              ? { ok: true, path: sync.path }
              : { ok: false, warning: sync.error };
          }
        }
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "持仓快照无效" },
        { status: 400 },
      );
    }
    await db
      .update(holdingProposals)
      .set({ status: "approved", resolvedAt: new Date() })
      .where(eq(holdingProposals.id, id));
    return NextResponse.json({
      ok: true,
      status: "approved",
      websiteSync,
    });
  }

  return NextResponse.json({ error: "action 需为 approve/reject" }, { status: 400 });
}
