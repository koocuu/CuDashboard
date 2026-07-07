"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const EXAMPLE = `<<<PROFILE_UPDATE
layer: status
summary: 更新近期状态
---
(该层的完整新版本 Markdown 内容)
PROFILE_UPDATE>>>`;

export function PasteImport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile/import-paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ type: "ok", text: "已创建提案,去「待确认」查看 diff" });
        setText("");
        router.refresh();
      } else {
        setMsg({ type: "err", text: data.error || "解析失败" });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 text-left text-sm font-medium"
      >
        导入更新块（粘贴 AI 输出）
      </button>
      {open && (
        <div className="space-y-2 border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            粘贴任意 AI 输出的 <code>{"<<<PROFILE_UPDATE ... PROFILE_UPDATE>>>"}</code> 块,系统解析后创建提案。
          </p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={EXAMPLE}
            className="font-mono text-xs"
          />
          {msg && (
            <p
              className={
                msg.type === "ok"
                  ? "text-xs text-positive"
                  : "text-xs text-muted-foreground"
              }
            >
              {msg.text}
            </p>
          )}
          <Button size="sm" onClick={submit} disabled={busy || !text.trim()}>
            {busy ? "解析中…" : "解析并创建提案"}
          </Button>
        </div>
      )}
    </section>
  );
}
