import type { Entry } from "@/lib/db/schema";
import { donutGradient, type PositionSlice } from "@/lib/invest-chart";
import { MarkdownLite } from "@/components/ui/markdown-lite";

type Snapshot = {
  total?: number;
  investedPct?: number;
  cash?: number;
  totalAmountCny?: number;
  slices?: PositionSlice[];
};

export function MonthlyReviewPanel({ initialReviews }: { initialReviews: Entry[] }) {
  return (
    <section className="space-y-3 border-t pt-5">
      <div>
        <h2 className="text-sm font-normal text-muted-foreground">复盘</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          月度审计由 MCP 按固定模板提交；批准投资提案时同步固化总结和金额快照。
        </p>
      </div>

      <div className="space-y-2">
        {initialReviews.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">还没有月度复盘。</p>
        ) : (
          initialReviews.map((review) => <ReviewItem key={review.id} review={review} />)
        )}
      </div>
    </section>
  );
}

function ReviewItem({ review }: { review: Entry }) {
  const snapshot = ((review.metadata as { snapshot?: Snapshot })?.snapshot ?? {}) as Snapshot;
  const slices = snapshot.slices ?? [];

  return (
    <details className="rounded-xl border bg-card p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="font-mono text-sm">{review.title}</span>
        <span className="text-xs text-muted-foreground">
          ¥<span className="font-mono">{Math.round(snapshot.totalAmountCny ?? 0).toLocaleString("zh-CN")}</span>
          {(snapshot.investedPct ?? snapshot.total) !== undefined
            ? ` · 已投 ${snapshot.investedPct ?? snapshot.total}%`
            : ""}
        </span>
      </summary>
      <div className="mt-3 grid gap-4 border-t pt-3 md:grid-cols-[1fr_auto]">
        <div className="text-sm leading-7">
          <MarkdownLite content={review.contentMd} />
        </div>
        {slices.length > 0 && (
          <div className="flex items-center gap-4">
            <div
              className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
              style={{ background: donutGradient(slices) }}
            >
              <div className="grid h-14 w-14 place-items-center content-center rounded-full bg-card">
                <span className="text-[9px] text-muted-foreground">已投</span>
                <span className="font-mono text-xs">
                  {snapshot.investedPct ?? snapshot.total ?? 0}%
                </span>
              </div>
            </div>
            <div className="min-w-32 space-y-1 text-xs">
              {slices.map((slice) => (
                <div key={slice.key} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: slice.color }} />
                  <span className="truncate">{slice.label}</span>
                  <span className="ml-auto font-mono text-muted-foreground">{slice.value}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
