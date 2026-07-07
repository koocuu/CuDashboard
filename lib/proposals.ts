import { db } from "@/lib/db";
import { profileProposals, type ProfileLayer } from "@/lib/db/schema";
import { getLayer } from "@/lib/queries/profile";
import { diffSummary } from "@/lib/diff";

export interface CreateProposalInput {
  layer: ProfileLayer;
  proposedContentMd: string;
  summary?: string;
  source: "api" | "paste" | "mcp";
  sourceName?: string | null;
}

/** 创建一条画像修改提案(自动算 diff 摘要)。共享给 API / 粘贴导入 / MCP。 */
export async function createProposal(input: CreateProposalInput) {
  const current = await getLayer(input.layer);
  const summary =
    input.summary?.trim() || diffSummary(current, input.proposedContentMd);

  const [proposal] = await db
    .insert(profileProposals)
    .values({
      layer: input.layer,
      proposedContentMd: input.proposedContentMd,
      diffSummary: summary,
      source: input.source,
      sourceName: input.sourceName ?? null,
      status: "pending",
    })
    .returning();

  return proposal;
}
