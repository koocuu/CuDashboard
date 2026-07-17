import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profileProposals } from "@/lib/db/schema";
import { verifyRequestToken } from "@/lib/auth/tokens";
import { isValidLayer } from "@/lib/queries/profile";
import { createProposal } from "@/lib/proposals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/profile/proposals(需 write token)
 * Body: { layer, proposed_content_md, summary }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyRequestToken(req, "write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));
  const layer = body.layer;
  const content = body.proposed_content_md ?? body.proposedContentMd;
  const summary = body.summary;

  if (!isValidLayer(layer)) {
    return NextResponse.json(
      {
        error:
          "layer 非法(core/milestones/investing/creative/status/private/public)",
      },
      { status: 400 },
    );
  }
  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json(
      { error: "proposed_content_md 不能为空" },
      { status: 400 },
    );
  }

  const proposal = await createProposal({
    layer,
    proposedContentMd: content,
    summary,
    source: "api",
    sourceName: auth.name,
  });

  return NextResponse.json({ proposal }, { status: 201 });
}

/** GET /api/profile/proposals(需 write token):查询提案状态。 */
export async function GET(req: NextRequest) {
  const auth = await verifyRequestToken(req, "write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const rows = await db
    .select({
      id: profileProposals.id,
      layer: profileProposals.layer,
      status: profileProposals.status,
      diffSummary: profileProposals.diffSummary,
      createdAt: profileProposals.createdAt,
      resolvedAt: profileProposals.resolvedAt,
    })
    .from(profileProposals)
    .orderBy(desc(profileProposals.createdAt));

  return NextResponse.json({ proposals: rows });
}
