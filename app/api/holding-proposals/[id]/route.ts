import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { holdingProposals } from "@/lib/db/schema";
import { applyHoldingSnapshot, getHoldingProposal } from "@/lib/holding-proposals";

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
    try {
      await applyHoldingSnapshot(proposal.snapshot);
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
    return NextResponse.json({ ok: true, status: "approved" });
  }

  return NextResponse.json({ error: "action 需为 approve/reject" }, { status: 400 });
}
