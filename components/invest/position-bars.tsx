"use client";

import type { Holding } from "@/lib/db/schema";
import { buildPositionSlices, donutGradient } from "@/lib/invest-chart";

export function PositionBars({ holdings }: { holdings: Holding[] }) {
  const { slices, total, cash, totalAmountCny } = buildPositionSlices(holdings, 99);

  if (total === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 text-center text-sm text-muted-foreground">
        暂无仓位数据，给持仓填写人民币金额后会显示结构图。
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">仓位结构</span>
        <span className="text-muted-foreground">
          总资产 <span className="font-mono">¥{Math.round(totalAmountCny).toLocaleString("zh-CN")}</span>
          {cash > 0 && (
            <>
              {" "}· 现金 <span className="font-mono">{cash}%</span>
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
          style={{ background: donutGradient(slices) }}
          aria-label="仓位结构环形图"
        >
          <div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-card">
            <span className="font-mono text-sm">{total}%</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1 text-xs">
          {slices.map((slice) => (
            <div key={slice.key} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: slice.color }}
              />
              <span className="truncate">{slice.label}</span>
              <span className="shrink-0 font-mono text-muted-foreground">
                {slice.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
