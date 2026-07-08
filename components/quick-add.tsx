"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkItem } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const WORK_ITEM_CREATED_EVENT = "console:work-item-created";

export function QuickAdd() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    const name = text.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/work-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, status: "inbox" }),
      });
      if (res.ok) {
        const { item } = (await res.json()) as { item: WorkItem };
        window.dispatchEvent(
          new CustomEvent<WorkItem>(WORK_ITEM_CREATED_EVENT, { detail: item }),
        );
        setText("");
        setDone(true);
        setTimeout(() => setDone(false), 1500);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-normal text-muted-foreground">记一件事</div>
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="想到什么?扔进来"
        />
        <Button
          onClick={submit}
          disabled={busy || !text.trim()}
          className="min-w-16 whitespace-nowrap"
        >
          {done ? "OK" : "记下"}
        </Button>
      </div>
    </div>
  );
}
