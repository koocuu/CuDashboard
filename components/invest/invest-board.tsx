"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Holding } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { AddHoldingDialog } from "./add-holding-dialog";
import { HoldingList } from "./holding-list";
import { PositionBars } from "./position-bars";

type Tab = "holdings" | "watch";

export function InvestBoard({
  initialHoldings,
}: {
  initialHoldings: Holding[];
}) {
  const [holdings, setHoldings] = useState<Holding[]>(initialHoldings);
  const [tab, setTab] = useState<Tab>("holdings");
  const [addHolding, setAddHolding] = useState(false);

  const active = holdings.filter((h) => h.status === "active");
  const watching = holdings.filter((h) => h.status === "watching");

  function upsertHolding(h: Holding) {
    setHoldings((prev) => {
      const idx = prev.findIndex((x) => x.id === h.id);
      if (idx === -1) return [...prev, h];
      const next = [...prev];
      next[idx] = h;
      return next;
    });
  }

  function removeHolding(id: number) {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex rounded-xl border bg-card p-0.5 text-sm">
        {(
          [
            ["holdings", `持仓 ${active.length}`],
            ["watch", `观察 ${watching.length}`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-lg py-1.5 transition-colors ${
              tab === k
                ? "bg-muted text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "holdings" && (
        <div className="space-y-4">
          <PositionBars holdings={active} />
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAddHolding(true)}>
              <Plus className="h-4 w-4" /> 添加持仓
            </Button>
          </div>
          <HoldingList
            holdings={active}
            onUpdate={upsertHolding}
            onDelete={removeHolding}
          />
        </div>
      )}

      {tab === "watch" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            观察池记录想买的理由和当时价格，方便事后校验冲动质量。
          </p>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAddHolding(true)}>
              <Plus className="h-4 w-4" /> 添加观察
            </Button>
          </div>
          <HoldingList
            holdings={watching}
            watch
            onUpdate={upsertHolding}
            onDelete={removeHolding}
          />
        </div>
      )}

      {addHolding && (
        <AddHoldingDialog
          defaultStatus={tab === "watch" ? "watching" : "active"}
          onClose={() => setAddHolding(false)}
          onCreated={(h) => {
            upsertHolding(h);
            setAddHolding(false);
          }}
        />
      )}
    </div>
  );
}
