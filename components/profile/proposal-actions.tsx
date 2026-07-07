"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ProposalActions({
  id,
  initialContent,
}: {
  id: number;
  initialContent: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject") {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/profile/proposals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          editedContent: action === "approve" ? content : undefined,
        }),
      });
      if (res.ok) {
        router.push("/profile/proposals");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "操作失败");
        setBusy(false);
      }
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setEditing((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
        {editing ? "收起编辑" : "批准前编辑提案内容"}
      </button>

      {editing && (
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          className="font-mono text-sm"
        />
      )}

      <div className="flex gap-2">
        <Button onClick={() => act("approve")} disabled={busy}>
          <Check className="h-4 w-4" /> 批准合并
        </Button>
        <Button variant="outline" onClick={() => act("reject")} disabled={busy}>
          <X className="h-4 w-4" /> 拒绝
        </Button>
      </div>
    </div>
  );
}
