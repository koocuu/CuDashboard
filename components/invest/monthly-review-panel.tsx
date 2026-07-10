"use client";

import { useState } from "react";
import type { Entry } from "@/lib/db/schema";
import { donutGradient, type PositionSlice } from "@/lib/invest-chart";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownLite } from "@/components/ui/markdown-lite";
import { monthlyReviewTemplate } from "@/lib/invest-review-template";

type Snapshot = {
  total?: number;
  cash?: number;
  slices?: PositionSlice[];
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthlyReviewPanel({ initialReviews }: { initialReviews: Entry[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [month, setMonth] = useState(currentMonth());
  const [content, setContent] = useState(() => monthlyReviewTemplate(currentMonth()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!content.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/invest-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, contentMd: content }),
      });
      if (res.ok) {
        const { entry } = await res.json();
        setReviews((prev) => {
          const rest = prev.filter((item) => item.id !== entry.id);
          return [entry, ...rest].sort((a, b) => b.title.localeCompare(a.title));
        });
        setContent(monthlyReviewTemplate(month));
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "保存失败，请稍后重试");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 border-t pt-5">
      <div>
        <h2 className="text-sm font-normal text-muted-foreground">复盘</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          固定模板归档结论；首次保存时自动冻结当月持仓快照，后续改文字不改历史节点。
        </p>
      </div>

      <div className="rounded-xl border bg-card p-3">
        <div className="mb-2 flex gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => {
              const nextMonth = e.target.value;
              if (content === monthlyReviewTemplate(month)) {
                setContent(monthlyReviewTemplate(nextMonth));
              }
              setMonth(nextMonth);
            }}
            className="h-9 rounded-lg border bg-card px-2 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <Button onClick={save} disabled={busy || !content.trim()} size="sm">
            保存复盘
          </Button>
          <button
            type="button"
            onClick={() => setContent(monthlyReviewTemplate(month))}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            恢复模板
          </button>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          placeholder="按固定模板粘贴本月审计"
          className="text-sm"
        />
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>

      <div className="space-y-2">
        {reviews.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">还没有月度复盘。</p>
        ) : (
          reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))
        )}
      </div>
    </section>
  );
}

function ReviewItem({ review }: { review: Entry }) {
  const snapshot = ((review.metadata as { snapshot?: Snapshot })?.snapshot ??
    {}) as Snapshot;
  const slices = snapshot.slices ?? [];

  return (
    <details className="rounded-xl border bg-card p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="font-mono text-sm">{review.title}</span>
        <span className="text-xs text-muted-foreground">
          仓位 <span className="font-mono">{snapshot.total ?? 0}%</span>
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
              <div className="grid h-14 w-14 place-items-center rounded-full bg-card">
                <span className="font-mono text-xs">{snapshot.total ?? 0}%</span>
              </div>
            </div>
            <div className="min-w-32 space-y-1 text-xs">
              {slices.map((slice) => (
                <div key={slice.key} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate">{slice.label}</span>
                  <span className="ml-auto font-mono text-muted-foreground">
                    {slice.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
