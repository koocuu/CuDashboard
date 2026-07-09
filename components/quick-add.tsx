"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkItem } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const WORK_ITEM_CREATED_EVENT = "console:work-item-created";

export function QuickAdd({
  categoryOptions = [],
}: {
  categoryOptions?: string[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const listId = useId();

  async function submit() {
    const name = text.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/work-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          status: "someday",
          category: category.trim(),
        }),
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
      <div className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="想到什么?扔进来"
        />
        <Input
          list={listId}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="分类"
          className="font-mono text-sm"
        />
        <datalist id={listId}>
          {categoryOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
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
