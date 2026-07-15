import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  profileProposals,
  type ProfileLayer,
  type ProfileProposal,
} from "@/lib/db/schema";
import {
  applyProfilePatch,
  type ProfilePatchOperation,
  type ProfilePatchResult,
} from "@/lib/profile-patch";
import { createProposal } from "@/lib/proposals";
import { getLayer } from "@/lib/queries/profile";

interface CreateProfilePatchProposalInput {
  layer: ProfileLayer;
  section: string;
  operation: ProfilePatchOperation;
  anchor?: string;
  newContentMd?: string;
  summary: string;
  sourceName: string;
}

export interface ProfilePatchProposalResult {
  proposal: ProfileProposal;
  patch: ProfilePatchResult;
  continued: boolean;
}

function combineSummaries(existing: string, next: string) {
  const parts = existing
    .split("；")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.includes(next)) parts.push(next);
  return parts.join("；");
}

/**
 * 同一画像层只维护一个待确认草稿。
 * 同一 MCP 调用方可以连续 patch 该草稿；其他来源存在 pending 时拒绝自动合并。
 */
export async function createProfilePatchProposal(
  input: CreateProfilePatchProposalInput,
): Promise<ProfilePatchProposalResult> {
  const pending = await db
    .select()
    .from(profileProposals)
    .where(
      and(
        eq(profileProposals.layer, input.layer),
        eq(profileProposals.status, "pending"),
      ),
    )
    .orderBy(desc(profileProposals.createdAt));

  if (pending.length > 1) {
    throw new Error(
      `${input.layer} 层已有多个待确认提案，无法安全合并；请先在 dashboard 处理`,
    );
  }

  const existing = pending[0];
  if (
    existing &&
    (existing.source !== "mcp" || existing.sourceName !== input.sourceName)
  ) {
    throw new Error(
      `${input.layer} 层已有其他来源的待确认提案 #${existing.id}；为避免覆盖，请先处理该提案`,
    );
  }

  const baseContent = existing?.proposedContentMd ?? (await getLayer(input.layer));
  const patch = applyProfilePatch({
    contentMd: baseContent,
    section: input.section,
    operation: input.operation,
    anchor: input.anchor,
    newContentMd: input.newContentMd,
  });

  if (patch.contentMd === baseContent) {
    throw new Error("本次局部修改未产生内容变化");
  }

  const summary = input.summary.trim();
  if (!existing) {
    const proposal = await createProposal({
      layer: input.layer,
      proposedContentMd: patch.contentMd,
      summary,
      source: "mcp",
      sourceName: input.sourceName,
    });
    return { proposal, patch, continued: false };
  }

  const [proposal] = await db
    .update(profileProposals)
    .set({
      proposedContentMd: patch.contentMd,
      diffSummary: combineSummaries(existing.diffSummary, summary),
    })
    .where(
      and(
        eq(profileProposals.id, existing.id),
        eq(profileProposals.status, "pending"),
      ),
    )
    .returning();

  if (!proposal) {
    throw new Error("待确认提案状态已变化，请重新读取后再试");
  }

  return { proposal, patch, continued: true };
}
