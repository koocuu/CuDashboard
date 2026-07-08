import { db } from "@/lib/db";
import { profileProposals, type ProfileLayer } from "@/lib/db/schema";
import { getLayer } from "@/lib/queries/profile";
import { diffSummary } from "@/lib/diff";
import {
  appendCleanupNote,
  cleanDistributedProfileContent,
} from "@/lib/profile-content-cleaner";

export interface CreateProposalInput {
  layer: ProfileLayer;
  proposedContentMd: string;
  summary?: string;
  source: "api" | "paste" | "mcp";
  sourceName?: string | null;
  distributionWrapperCleaned?: boolean;
}

/** 创建一条画像修改提案(自动算 diff 摘要)。共享给 API / 粘贴导入 / MCP。 */
export async function createProposal(input: CreateProposalInput) {
  const cleaned = cleanDistributedProfileContent(input.proposedContentMd, {
    layer: input.layer,
  });
  const current = await getLayer(input.layer);
  const baseSummary =
    input.summary?.trim() || diffSummary(current, cleaned.content);
  const summary =
    cleaned.cleaned || input.distributionWrapperCleaned
      ? appendCleanupNote(baseSummary)
      : baseSummary;

  const [proposal] = await db
    .insert(profileProposals)
    .values({
      layer: input.layer,
      proposedContentMd: cleaned.content,
      diffSummary: summary,
      source: input.source,
      sourceName: input.sourceName ?? null,
      status: "pending",
    })
    .returning();

  return proposal;
}
