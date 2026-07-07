"use client";

import { useState } from "react";
import type { Holding } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AddHoldingDialog({
  defaultStatus,
  onClose,
  onCreated,
}: {
  defaultStatus: "active" | "watching";
  onClose: () => void;
  onCreated: (h: Holding) => void;
}) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [market, setMarket] = useState<"cn" | "us">("cn");
  const [positionPct, setPositionPct] = useState("");
  const [thesis, setThesis] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          symbol: symbol.trim(),
          market,
          positionPct: Number(positionPct) || 0,
          thesisMd: thesis,
          status: defaultStatus,
        }),
      });
      if (res.ok) {
        const { holding } = await res.json();
        onCreated(holding);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={defaultStatus === "watching" ? "添加观察标的" : "添加持仓"}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="名称"
            autoFocus
          />
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="代码"
            className="w-28"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5 text-sm">
            {(["cn", "us"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={`rounded-lg px-3 py-1 ${
                  market === m ? "bg-muted text-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "cn" ? "A股" : "美股"}
              </button>
            ))}
          </div>
          {defaultStatus === "active" && (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={positionPct}
                onChange={(e) => setPositionPct(e.target.value)}
                placeholder="仓位"
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          )}
        </div>
        <Textarea
          value={thesis}
          onChange={(e) => setThesis(e.target.value)}
          rows={3}
          placeholder="买入逻辑 / 想买理由"
          className="text-sm"
        />
        <Button onClick={submit} disabled={busy || !name.trim()} className="w-full">
          {busy ? "添加中..." : "添加"}
        </Button>
      </div>
    </Dialog>
  );
}
