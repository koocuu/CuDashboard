"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PROFILE_UPDATE_TEMPLATE } from "@/lib/profile-update-protocol";

export function PasteImport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{
    type: "ok" | "err";
    text: string;
    template?: string;
  } | null>(null);
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
        setMsg({
          type: "err",
          text: data.error || "解析失败",
          template: data.template || PROFILE_UPDATE_TEMPLATE,
        });
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
            粘贴完整且严格匹配的{" "}
            <code>{"<<<PROFILE_UPDATE ... PROFILE_UPDATE>>>"}</code>{" "}
            更新块,系统解析后创建提案。
          </p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={PROFILE_UPDATE_TEMPLATE}
            className="font-mono text-xs"
          />
          {msg && (
            <div className="space-y-2">
              <p
                className={
                  msg.type === "ok"
                    ? "text-xs text-positive"
                    : "text-xs text-muted-foreground"
                }
              >
                {msg.text}
              </p>
              {msg.type === "err" && msg.template && (
                <pre className="whitespace-pre-wrap rounded bg-muted p-2 font-mono text-xs text-foreground">
                  {msg.template}
                </pre>
              )}
            </div>
          )}
          <Button size="sm" onClick={submit} disabled={busy || !text.trim()}>
            {busy ? "解析中…" : "解析并创建提案"}
          </Button>
        </div>
      )}
    </section>
  );
}
