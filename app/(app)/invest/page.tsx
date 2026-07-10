import { InvestBoard } from "@/components/invest/invest-board";
import { MonthlyReviewPanel } from "@/components/invest/monthly-review-panel";
import { HoldingProposalPanel } from "@/components/invest/holding-proposal-panel";
import { listHoldingProposals } from "@/lib/holding-proposals";
import { listHoldings } from "@/lib/queries/invest";
import { listInvestReviews } from "@/lib/queries/invest-reviews";

export const dynamic = "force-dynamic";

export default async function InvestPage() {
  const [holdings, reviews, holdingProposals] = await Promise.all([
    listHoldings(),
    listInvestReviews(),
    listHoldingProposals(),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">投资</h1>
      <InvestBoard initialHoldings={holdings} />
      <HoldingProposalPanel
        proposals={holdingProposals}
        currentHoldings={holdings}
      />
      <MonthlyReviewPanel initialReviews={reviews} />
    </div>
  );
}
