"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import type { Holding } from "@/lib/db/schema";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MARKET_LABEL: Record<string, string> = {
  cn: "A股",
  us: "美股",
  other: "防守/现金",
};

export function HoldingList({
  holdings,
  watch = false,
  onUpdate,
  onDelete,
}: {
  holdings: Holding[];
  watch?: boolean;
  onUpdate: (h: Holding) => void;
  onDelete: (id: number) => void;
}) {
  const markets = ["cn", "us", "other"] as const;

  async function patch(id: number, body: Partial<Holding>) {
    const res = await fetch(`/api/holdings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const { holding } = await res.json();
      onUpdate(holding);
    }
  }

  async function del(holding: Holding) {
    const first = confirm(`准备删除资产数据: ${holding.name}。确认继续?`);
    if (!first) return;
    const second = confirm("二次确认: 删除后只会软删除隐藏，仍建议谨慎。确定删除?");
    if (!second) return;
    const res = await fetch(`/api/holdings/${holding.id}`, { method: "DELETE" });
    if (res.ok) onDelete(holding.id);
  }

  if (holdings.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        暂无{watch ? "观察标的" : "持仓"}。
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {markets.map((mk) => {
        const group = holdings.filter((h) => h.market === mk);
        if (group.length === 0) return null;
        return (
          <div key={mk} className="space-y-2">
            <h3 className="px-1 text-sm font-normal text-muted-foreground">
              {MARKET_LABEL[mk]}
            </h3>
            {group.map((h) => (
              <HoldingRow
                key={h.id}
                holding={h}
                watch={watch}
                onPatch={patch}
                onDelete={del}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function HoldingRow({
  holding: h,
  watch,
  onPatch,
  onDelete,
}: {
  holding: Holding;
  watch: boolean;
  onPatch: (id: number, body: Partial<Holding>) => void;
  onDelete: (holding: Holding) => void;
}) {
  const [open, setOpen] = useState(false);
  const [thesis, setThesis] = useState(h.thesisMd);
  const [watchNote, setWatchNote] = useState(h.watchPriceNote);

  return (
    <div className="group rounded-xl border bg-card">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-muted-foreground"
          aria-label={open ? "收起" : "展开"}
        >
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{h.name}</span>
            {h.symbol && (
              <span className="font-mono text-xs text-muted-foreground">
                {h.symbol}
              </span>
            )}
          </div>
        </div>
        {!watch && (
          <div className="flex items-center gap-1 text-sm">
            <input
              type="number"
              step="0.01"
              defaultValue={h.positionPct}
              className="w-16 rounded-lg border bg-transparent px-1 py-0.5 text-right font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              onBlur={(e) => {
                const raw = Number(e.target.value);
                const v = Number.isFinite(raw)
                  ? Math.round(raw * 100) / 100
                  : h.positionPct;
                if (v !== h.positionPct) onPatch(h.id, { positionPct: v });
              }}
            />
            <span className="font-mono text-muted-foreground">%</span>
          </div>
        )}
        <button
          onClick={() => onDelete(h)}
          className={cn(
            "text-muted-foreground/40 transition-opacity hover:text-foreground",
            open ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
          aria-label="删除持仓"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="space-y-2 border-t px-3 py-2.5">
          {watch && (
            <div>
              <label className="text-xs text-muted-foreground">
                想买理由 + 当时价格备注
              </label>
              <Textarea
                value={watchNote}
                onChange={(e) => setWatchNote(e.target.value)}
                onBlur={() =>
                  watchNote !== h.watchPriceNote &&
                  onPatch(h.id, { watchPriceNote: watchNote })
                }
                rows={3}
                className="mt-1 text-sm"
                placeholder="例:突破年线想追。当前价 ¥xx"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">买入逻辑</label>
            <Textarea
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              onBlur={() =>
                thesis !== h.thesisMd && onPatch(h.id, { thesisMd: thesis })
              }
              rows={3}
              className="mt-1 text-sm"
              placeholder="为什么持有?核心逻辑..."
            />
          </div>
          {!watch && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onPatch(h.id, { status: "watching" })}
                className="rounded-lg border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
              >
                移入观察池
              </button>
              <button
                onClick={() => onPatch(h.id, { status: "exited" })}
                className="rounded-lg border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
              >
                标记已清仓
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
