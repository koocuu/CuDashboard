import type { Holding, HoldingProposal } from "@/lib/db/schema";
import {
  holdingSnapshotDiff,
  proposalReviewData,
  proposalSnapshot,
} from "@/lib/holding-proposals";
import { formatDate } from "@/lib/utils";
import { HoldingProposalActions } from "./holding-proposal-actions";

const statusText: Record<string, string> = {
  pending: "待确认",
  approved: "已同步",
  rejected: "已拒绝",
};

export function HoldingProposalPanel({
  proposals,
  currentHoldings,
}: {
  proposals: HoldingProposal[];
  currentHoldings: Holding[];
}) {
  if (proposals.length === 0) return null;

  return (
    <section className="space-y-3 border-t pt-5">
      <div>
        <h2 className="text-sm font-normal text-muted-foreground">持仓更新</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          MCP 提交的完整快照会先在这里确认；批准后同步真实持仓，并生成 status 层投资纪律联动提案。
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
          return (
            <div key={proposal.id} className="rounded-xl border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{proposal.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {proposal.sourceName || proposal.source} · {formatDate(proposal.createdAt)}
                  </p>
                  {review && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {review.conclusion}
                    </p>
                  )}
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {statusText[proposal.status] || proposal.status}
                </span>
              </div>
              <ul className="mt-3 space-y-1 border-t pt-3 text-sm text-muted-foreground">
                {diff.map((line) => (
                  <li key={line}>· {line}</li>
                ))}
              </ul>
              {pending && (
                <div className="mt-3">
                  <HoldingProposalActions id={proposal.id} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
