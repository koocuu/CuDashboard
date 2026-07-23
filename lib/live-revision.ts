import { createHash } from "crypto";
import { eq, isNull, max, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  holdingProposals,
  holdings,
  profileDoc,
  profileProposals,
  topicBatches,
  workItems,
} from "@/lib/db/schema";

function fingerprint(parts: Array<string | number | null | undefined>) {
  return createHash("md5")
    .update(parts.map((p) => String(p ?? "")).join("|"))
    .digest("hex")
    .slice(0, 12);
}

/**
 * 轻量数据版本号：MCP / 多标签页写入后变化，供 LiveRefresh 决定是否 router.refresh。
 * pending 提案内容指纹用于捕获 patch 累积（同 id 内容变、计数不变）。
 */
export async function getLiveRevision(): Promise<string> {
  const [
    profileAgg,
    pendingProfiles,
    holdingAgg,
    layerAgg,
    holdingUpdated,
    topicAgg,
    workAgg,
  ] = await Promise.all([
    db
      .select({
        maxId: max(profileProposals.id),
        pending: sql<number>`count(*) filter (where ${profileProposals.status} = 'pending')`,
      })
      .from(profileProposals)
      .then((rows) => rows[0]),
    db
      .select({
        id: profileProposals.id,
        proposedContentMd: profileProposals.proposedContentMd,
        diffSummary: profileProposals.diffSummary,
      })
      .from(profileProposals)
      .where(eq(profileProposals.status, "pending")),
    db
      .select({
        maxId: max(holdingProposals.id),
        pending: sql<number>`count(*) filter (where ${holdingProposals.status} = 'pending')`,
      })
      .from(holdingProposals)
      .then((rows) => rows[0]),
    db
      .select({ updatedAt: max(profileDoc.updatedAt) })
      .from(profileDoc)
      .then((rows) => rows[0]),
    db
      .select({ updatedAt: max(holdings.updatedAt) })
      .from(holdings)
      .then((rows) => rows[0]),
    db
      .select({ maxId: max(topicBatches.id) })
      .from(topicBatches)
      .then((rows) => rows[0]),
    db
      .select({ updatedAt: max(workItems.updatedAt) })
      .from(workItems)
      .where(isNull(workItems.deletedAt))
      .then((rows) => rows[0]),
  ]);

  const pendingFp = fingerprint(
    pendingProfiles
      .slice()
      .sort((a, b) => a.id - b.id)
      .flatMap((row) => [row.id, row.diffSummary, row.proposedContentMd]),
  );

  return [
    `pp:${profileAgg?.maxId ?? 0}:${Number(profileAgg?.pending ?? 0)}:${pendingFp}`,
    `hp:${holdingAgg?.maxId ?? 0}:${Number(holdingAgg?.pending ?? 0)}`,
    `pd:${layerAgg?.updatedAt?.getTime() ?? 0}`,
    `h:${holdingUpdated?.updatedAt?.getTime() ?? 0}`,
    `tb:${topicAgg?.maxId ?? 0}`,
    `w:${workAgg?.updatedAt?.getTime() ?? 0}`,
  ].join("|");
}
