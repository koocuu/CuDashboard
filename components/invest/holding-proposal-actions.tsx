"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HoldingProposalActions({ id }: { id: number }) {
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject") {
    if (busy) return;
    if (
      action === "approve" &&
      !confirm(
        "批准后将同步持仓、该月审计，并把近况写入今日与网站 /now。请确认近况里没有同事真名和未公开业务。",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/holding-proposals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "操作失败");
        setBusy(false);
        return;
      }
      window.location.reload();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => act("approve")} disabled={busy}>
        <Check className="h-4 w-4" /> 批准同步
      </Button>
      <Button size="sm" variant="outline" onClick={() => act("reject")} disabled={busy}>
        <X className="h-4 w-4" /> 拒绝
      </Button>
    </div>
  );
}
