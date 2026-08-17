import { InvestBoard } from "@/components/invest/invest-board";
import { MonthlyReviewPanel } from "@/components/invest/monthly-review-panel";
import { HoldingProposalPanel } from "@/components/invest/holding-proposal-panel";
import { listHoldingProposals } from "@/lib/holding-proposals";
import { listHoldings } from "@/lib/queries/invest";
import { listInvestReviews } from "@/lib/queries/invest-reviews";
import { getLayer } from "@/lib/queries/profile";

export const dynamic = "force-dynamic";

export default async function InvestPage({
  searchParams,
}: {
  searchParams: Promise<{ proposal?: string }>;
}) {
  const [{ proposal: proposalParam }, holdings, reviews, holdingProposals, statusMd] =
    await Promise.all([
      searchParams,
      listHoldings(),
      listInvestReviews(),
      listHoldingProposals(),
      getLayer("status"),
    ]);
  const highlightId = Number(proposalParam);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">投资</h1>
      <InvestBoard initialHoldings={holdings} />
      <HoldingProposalPanel
        proposals={holdingProposals}
        currentHoldings={holdings}
        currentStatusMd={statusMd}
        highlightId={Number.isInteger(highlightId) ? highlightId : null}
      />
      <MonthlyReviewPanel initialReviews={reviews} />
    </div>
  );
}
