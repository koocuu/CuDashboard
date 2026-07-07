import { InvestBoard } from "@/components/invest/invest-board";
import { MonthlyReviewPanel } from "@/components/invest/monthly-review-panel";
import { listHoldings } from "@/lib/queries/invest";
import { listInvestReviews } from "@/lib/queries/invest-reviews";

export const dynamic = "force-dynamic";

export default async function InvestPage() {
  const [holdings, reviews] = await Promise.all([
    listHoldings(),
    listInvestReviews(),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">投资</h1>
      <InvestBoard initialHoldings={holdings} />
      <MonthlyReviewPanel initialReviews={reviews} />
    </div>
  );
}
