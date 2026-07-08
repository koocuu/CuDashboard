import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profileProposals } from "@/lib/db/schema";
import { getLayer } from "@/lib/queries/profile";
import { LAYER_META } from "@/lib/profile-meta";
import { lineDiff } from "@/lib/diff";
import { CLEANUP_NOTE } from "@/lib/profile-content-cleaner";
import type { ProfileLayer } from "@/lib/db/schema";
import { ProposalActions } from "@/components/profile/proposal-actions";

export const dynamic = "force-dynamic";

export default async function ProposalDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) notFound();

  const rows = await db
    .select()
    .from(profileProposals)
    .where(eq(profileProposals.id, id))
    .limit(1);
  const proposal = rows[0];
  if (!proposal) notFound();

  const current = await getLayer(proposal.layer as ProfileLayer);
  const diff = lineDiff(current, proposal.proposedContentMd);
  const pending = proposal.status === "pending";
  const cleanedDistributionWrapper = proposal.diffSummary.includes(CLEANUP_NOTE);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/profile/proposals" className="text-sm text-muted-foreground">
          ← 提案列表
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold">
          {LAYER_META[proposal.layer as ProfileLayer]?.label ?? proposal.layer}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {proposal.diffSummary} · 来源 {proposal.source}
          {proposal.sourceName ? ` (${proposal.sourceName})` : ""}
        </p>
      </div>

      {cleanedDistributionWrapper && (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          已自动清理分发包装:版本戳、使用说明或渲染层标题未写入提案正文。
        </p>
      )}

      {/* diff 视图 */}
      <div className="overflow-hidden rounded-lg border bg-card font-mono text-xs">
        {diff.map((line, i) => (
          <div
            key={i}
            className={
              line.type === "add"
                ? "bg-positive/10 text-positive"
                : line.type === "del"
                  ? "bg-muted/40 text-muted-foreground line-through"
                  : "text-muted-foreground"
            }
          >
            <span className="inline-block w-5 select-none text-center opacity-50">
              {line.type === "add" ? "+" : line.type === "del" ? "−" : " "}
            </span>
            <span className="whitespace-pre-wrap break-words">
              {line.text || " "}
            </span>
          </div>
        ))}
      </div>

      {pending ? (
        <ProposalActions
          id={proposal.id}
          initialContent={proposal.proposedContentMd}
        />
      ) : (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          该提案已 {proposal.status === "approved" ? "合并" : "拒绝"}。
        </p>
      )}
    </div>
  );
}
