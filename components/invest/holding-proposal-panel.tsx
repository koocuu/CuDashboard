import type { Holding, HoldingProposal } from "@/lib/db/schema";
import {
  holdingSnapshotDiff,
  proposalReviewData,
  proposalSnapshot,
} from "@/lib/holding-proposals";
import { isProposalStale } from "@/lib/proposal-freshness";
import { formatDate } from "@/lib/utils";
import { HighlightOnMount } from "@/components/highlight-on-mount";
import { HoldingProposalActions } from "./holding-proposal-actions";
import { describeNowMerge, mergeNowRevision } from "@/lib/now-revision";

const statusText: Record<string, string> = {
  pending: "待确认",
  approved: "已同步",
  rejected: "已拒绝",
};

export function HoldingProposalPanel({
  proposals,
  currentHoldings,
  currentStatusMd = "",
  highlightId = null,
}: {
  proposals: HoldingProposal[];
  currentHoldings: Holding[];
  currentStatusMd?: string;
  highlightId?: number | null;
}) {
  if (proposals.length === 0) return null;

  return (
    <section className="space-y-3 border-t pt-5">
      {highlightId ? (
        <HighlightOnMount targetId={`holding-proposal-${highlightId}`} />
      ) : null}
      <div>
        <h2 className="text-sm font-normal text-muted-foreground">持仓更新</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          MCP 月度提案会先在这里确认；批准后同步持仓、该月审计，以及可公开的近期状态（今日 + /now）。近况在现稿上合并：写了的章节覆盖，没写到的章节保留。
        </p>
      </div>
      <div className="space-y-3">
        {proposals.map((proposal) => {
          const snapshot = proposalSnapshot(proposal.snapshot);
          const diff = holdingSnapshotDiff(currentHoldings, snapshot);
          const review = proposal.reviewData
            ? proposalReviewData(proposal.reviewData)
            : null;
          const pending = proposal.status === "pending";
          const stale = pending && isProposalStale(proposal.createdAt);
          const active = highlightId === proposal.id;
          return (
            <div
              key={proposal.id}
              id={`holding-proposal-${proposal.id}`}
              className={
                active
                  ? "rounded-xl border border-primary bg-card p-3"
                  : "rounded-xl border bg-card p-3"
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{proposal.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {proposal.sourceName || proposal.source} · {formatDate(proposal.createdAt)}
                    {stale ? " · 数据可能已过期" : ""}
                  </p>
                  {review ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {review.conclusion}
                    </p>
                  ) : null}
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {stale ? "已过期" : statusText[proposal.status] || proposal.status}
                </span>
              </div>
              <ul className="mt-3 space-y-1 border-t pt-3 text-sm text-muted-foreground">
                {diff.map((line) => (
                  <li key={line}>· {line}</li>
                ))}
              </ul>
              {review?.now_md ? (
                <NowRevisionPreview currentStatusMd={currentStatusMd} proposedMd={review.now_md} />
              ) : null}
              {pending && !stale && (
                <div className="mt-3">
                  <HoldingProposalActions id={proposal.id} />
                </div>
              )}
              {stale ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  超过 7 天，不能直接批准。请让 AI 按当前桶名重新提交。
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatMergeNote(note: ReturnType<typeof describeNowMerge>) {
  const parts: string[] = [];
  if (note.replaced.length) parts.push(`改写「${note.replaced.join("」「")}」`);
  if (note.kept.length) parts.push(`保留「${note.kept.join("」「")}」`);
  if (note.cleared.length) parts.push(`去掉「${note.cleared.join("」「")}」`);
  if (note.added.length) parts.push(`新增「${note.added.join("」「")}」`);
  return parts.join("；") || "与现稿相同";
}

function NowRevisionPreview({
  currentStatusMd,
  proposedMd,
}: {
  currentStatusMd: string;
  proposedMd: string;
}) {
  const merged = mergeNowRevision(currentStatusMd, proposedMd);
  const note = describeNowMerge(currentStatusMd, proposedMd);
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
        本月近况（批准后写入今日与 /now）
      </summary>
      <p className="mt-2 text-xs text-muted-foreground">{formatMergeNote(note)}</p>
      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
        {merged}
      </pre>
    </details>
  );
}
