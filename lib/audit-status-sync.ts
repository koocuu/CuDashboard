import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profileProposals } from "@/lib/db/schema";
import { createProposal } from "@/lib/proposals";
import { getLayer } from "@/lib/queries/profile";

const AUDIT_SYNC_SOURCE = "audit-sync" as const;

/** 压缩审计段落为一行摘要，供 status 投资段使用。 */
export function summarizeAuditText(text: string, max = 120): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

/** 用审计结论拼装 status 层「投资」段落正文（不含 **投资**: 前缀）。 */
export function buildAuditInvestBody(
  month: string,
  conclusion: string,
  triggersAndRules: string,
) {
  return `${month}审计:${summarizeAuditText(conclusion)};当前纪律:${summarizeAuditText(triggersAndRules)}`;
}

/**
 * 以当前 status 为基底，仅替换「投资」段。
 * 若无该段，插在「基调」前；再没有则追加到文末。
 */
export function replaceStatusInvestSection(content: string, investBody: string) {
  const line = `**投资**: ${investBody}`;
  const pattern =
    /\*\*投资\*\*\s*[:：][^\n]*(?:\n(?!\s*\*\*[^*\n]+\*\*\s*[:：]|\s*## )[^\n]+)*/;
  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }
  if (/\*\*基调\*\*/.test(content)) {
    return content.replace(/\*\*基调\*\*/, `${line}\n\n**基调**`);
  }
  const trimmed = content.trim();
  return trimmed ? `${trimmed}\n\n${line}\n` : `${line}\n`;
}

/**
 * 批准月度审计后联动：创建/更新一条 source=audit-sync 的 status 提案。
 * 同源同月的 pending 提案会被更新，不重复创建。
 */
export async function upsertAuditSyncStatusProposal(input: {
  month: string;
  conclusion: string;
  triggersAndRules: string;
}) {
  if (!/^\d{4}-\d{2}$/.test(input.month)) {
    throw new Error("月份格式必须为 YYYY-MM");
  }

  const summary = `${input.month}审计联动:同步 status 层投资纪律状态`;
  const investBody = buildAuditInvestBody(
    input.month,
    input.conclusion,
    input.triggersAndRules,
  );
  const current = await getLayer("status");
  const proposedContentMd = replaceStatusInvestSection(current, investBody);

  const existing = await db
    .select()
    .from(profileProposals)
    .where(
      and(
        eq(profileProposals.layer, "status"),
        eq(profileProposals.source, AUDIT_SYNC_SOURCE),
        eq(profileProposals.sourceName, input.month),
        eq(profileProposals.status, "pending"),
      ),
    )
    .limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(profileProposals)
      .set({
        proposedContentMd,
        diffSummary: summary,
      })
      .where(eq(profileProposals.id, existing[0].id))
      .returning();
    return updated;
  }

  return createProposal({
    layer: "status",
    proposedContentMd,
    summary,
    source: AUDIT_SYNC_SOURCE,
    sourceName: input.month,
  });
}
