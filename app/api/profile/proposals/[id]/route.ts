import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profileProposals } from "@/lib/db/schema";
import { saveLayer, isValidLayer } from "@/lib/queries/profile";

export const runtime = "nodejs";

function parseId(s: string): number | null {
  const n = Number(s);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * POST /api/profile/proposals/[id]  { action: "approve" | "reject", editedContent? }
 * approve:把提案内容(可编辑后)写入对应层(saveLayer 会归档旧版 + version+1)。
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = parseId(idStr);
  if (!id) return NextResponse.json({ error: "无效 id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const action = body.action;

  const rows = await db
    .select()
    .from(profileProposals)
    .where(eq(profileProposals.id, id))
    .limit(1);
  const proposal = rows[0];
  if (!proposal) return NextResponse.json({ error: "未找到" }, { status: 404 });
  if (proposal.status !== "pending") {
    return NextResponse.json({ error: "该提案已处理" }, { status: 409 });
  }

  if (action === "reject") {
    await db
      .update(profileProposals)
      .set({ status: "rejected", resolvedAt: new Date() })
      .where(eq(profileProposals.id, id));
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  if (action === "approve") {
    if (!isValidLayer(proposal.layer)) {
      return NextResponse.json({ error: "提案层非法" }, { status: 400 });
    }
    const content =
      typeof body.editedContent === "string"
        ? body.editedContent
        : proposal.proposedContentMd;

    await saveLayer(proposal.layer, content);
    await db
      .update(profileProposals)
      .set({ status: "approved", resolvedAt: new Date() })
      .where(eq(profileProposals.id, id));
    return NextResponse.json({ ok: true, status: "approved" });
  }

  return NextResponse.json({ error: "action 需为 approve/reject" }, { status: 400 });
}
