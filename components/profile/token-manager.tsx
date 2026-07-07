"use client";

import { useState } from "react";
import { Copy, Check, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TokenRow {
  id: number;
  name: string;
  scope: string;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export function TokenManager({
  initialTokens,
}: {
  initialTokens: TokenRow[];
}) {
  const [tokens, setTokens] = useState<TokenRow[]>(initialTokens);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"read" | "write">("read");
  const [newPlain, setNewPlain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scope }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewPlain(data.plain);
        setTokens((prev) => [
          {
            id: data.token.id,
            name: data.token.name,
            scope: data.token.scope,
            lastUsedAt: null,
            createdAt: new Date().toISOString(),
            revokedAt: null,
          },
          ...prev,
        ]);
        setName("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: number) {
    if (!confirm("确认吊销此 token?")) return;
    const res = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTokens((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, revokedAt: new Date().toISOString() } : t,
        ),
      );
    }
  }

  async function copyPlain() {
    if (!newPlain) return;
    await navigator.clipboard.writeText(newPlain).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-4">
      {/* 新建 */}
      <div className="space-y-2 rounded-lg border bg-card p-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Token 名称(如 Claude主力)"
        />
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-0.5 text-sm">
            {(["read", "write"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  "rounded px-3 py-1",
                  scope === s
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={create} disabled={busy || !name.trim()}>
            生成
          </Button>
        </div>
      </div>

      {/* 新 token 明文(仅此一次) */}
      {newPlain && (
        <div className="space-y-2 rounded-md border border-border bg-card p-3">
          <p className="text-xs font-medium text-positive">
            请立即复制,页面刷新后不再显示:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-muted px-2 py-1 text-xs">
              {newPlain}
            </code>
            <Button size="icon" variant="outline" onClick={copyPlain}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 列表 */}
      <div className="space-y-2">
        {tokens.map((t) => {
          const revoked = !!t.revokedAt;
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-center justify-between rounded-lg border bg-card p-3",
                revoked && "opacity-50",
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.name}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {t.scope}
                  </span>
                  {revoked && (
                    <span className="text-xs text-muted-foreground">已吊销</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  最后使用:{t.lastUsedAt ? formatDate(t.lastUsedAt) : "从未"}
                </p>
              </div>
              {!revoked && (
                <button
                  onClick={() => revoke(t.id)}
                  className="text-muted-foreground/50 hover:text-foreground"
                  aria-label="吊销"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
        {tokens.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            还没有 token。
          </p>
        )}
      </div>
    </div>
  );
}
