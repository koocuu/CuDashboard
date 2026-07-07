"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QuickAdd() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/work-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: text.trim(), status: "inbox" }),
      });
      if (res.ok) {
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
