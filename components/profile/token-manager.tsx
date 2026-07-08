"use client";

import { useState } from "react";
import { Check, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";

interface TokenRow {
  id: number;
  name: string;
  scope: string;
  lastUsedAt: string | null;
  lastFetchedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

interface OAuthAuthorizationRow {
  id: number;
  clientName: string;
  scope: string;
  lastUsedAt: string | null;
  accessExpiresAt: string;
  createdAt: string;
  revokedAt: string | null;
}

interface GeneratedSecret {
  plain: string;
  kind: "api" | "share";
  contextUrl: string | null;
  shareUrl: string | null;
  fullShareUrl: string | null;
}

export function TokenManager({
  initialTokens,
  initialOAuthAuthorizations,
}: {
  initialTokens: TokenRow[];
  initialOAuthAuthorizations: OAuthAuthorizationRow[];
}) {
  const [tokens, setTokens] = useState<TokenRow[]>(initialTokens);
  const [oauthAuthorizations, setOAuthAuthorizations] = useState<
    OAuthAuthorizationRow[]
  >(initialOAuthAuthorizations);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"read" | "write">("read");
  const [kind, setKind] = useState<"api" | "share">("share");
  const [generated, setGenerated] = useState<GeneratedSecret | null>(null);
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          scope,
          kind,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenerated({
          plain: data.plain,
          kind: data.kind,
          contextUrl: data.contextUrl,
          shareUrl: data.shareUrl,
          fullShareUrl: data.fullShareUrl,
        });
        setTokens((prev) => [
          {
            id: data.token.id,
            name: data.token.name,
            scope: data.token.scope,
            lastUsedAt: null,
            lastFetchedAt: null,
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
    if (!confirm("确认吊销这个 token / 分享页?")) return;
    const res = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTokens((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, revokedAt: new Date().toISOString() } : t,
        ),
      );
    }
  }

  async function revokeOAuth(id: number) {
    if (!confirm("确认吊销这个 OAuth 授权? Claude 将需要重新连接。")) return;
    const res = await fetch(`/api/oauth-authorizations/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setOAuthAuthorizations((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, revokedAt: new Date().toISOString() }
            : item,
        ),
      );
    }
  }

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(""), 1800);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="space-y-3 rounded-lg border bg-card p-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              kind === "share"
                ? "分享页名称(如 Gemini 通用)"
                : "Token 名称(如 Claude Code)"
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border p-0.5 text-sm">
              {(["share", "api"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setKind(item)}
                  className={cn(
                    "rounded px-3 py-1",
                    kind === item
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {item === "share" ? "分享页" : "API token"}
                </button>
              ))}
            </div>
            {kind === "api" && (
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
            )}
            <Button size="sm" onClick={create} disabled={busy || !name.trim()}>
              生成
            </Button>
          </div>
        </div>

        {generated && (
          <div className="space-y-3 rounded-md border border-border bg-card p-3">
            <p className="text-xs font-medium text-positive">
              请立刻复制。页面刷新后不再显示明文。
            </p>
            {generated.kind === "share" ? (
              <>
                <CopyRow
                  label="通用分享页"
                  value={generated.shareUrl ?? ""}
                  copied={copied === "share"}
                  onCopy={() => copy(generated.shareUrl ?? "", "share")}
                />
                <CopyRow
                  label="完整分享页"
                  value={generated.fullShareUrl ?? ""}
                  copied={copied === "full"}
                  onCopy={() => copy(generated.fullShareUrl ?? "", "full")}
                />
                <p className="text-xs text-muted-foreground">
                  通用版不含 private 层;完整版包含 private 层,只发给高度信任的 AI。
                </p>
              </>
            ) : (
              <>
                <CopyRow
                  label="API token"
                  value={generated.plain}
                  copied={copied === "plain"}
                  onCopy={() => copy(generated.plain, "plain")}
                />
                {generated.contextUrl && (
                  <CopyRow
                    label="Context API"
                    value={generated.contextUrl}
                    copied={copied === "context"}
                    onCopy={() => copy(generated.contextUrl ?? "", "context")}
                  />
                )}
              </>
            )}
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-sm text-muted-foreground">API token / 分享页</h2>
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
                      <span className="text-xs text-muted-foreground">
                        已吊销
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    最后使用 {t.lastUsedAt ? formatDate(t.lastUsedAt) : "从未"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    最后抓取{" "}
                    {t.lastFetchedAt ? formatDate(t.lastFetchedAt) : "从未"}
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
      </section>

      <section className="space-y-2">
        <h2 className="text-sm text-muted-foreground">OAuth 授权</h2>
        {oauthAuthorizations.map((item) => {
          const revoked = !!item.revokedAt;
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center justify-between rounded-lg border bg-card p-3",
                revoked && "opacity-50",
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.clientName}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    OAuth · {item.scope}
                  </span>
                  {revoked && (
                    <span className="text-xs text-muted-foreground">
                      已吊销
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  最后使用{" "}
                  {item.lastUsedAt ? formatDate(item.lastUsedAt) : "从未"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  access token 到期 {formatDate(item.accessExpiresAt)}
                </p>
              </div>
              {!revoked && (
                <button
                  onClick={() => revokeOAuth(item.id)}
                  className="text-muted-foreground/50 hover:text-foreground"
                  aria-label="吊销 OAuth 授权"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
        {oauthAuthorizations.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            还没有 OAuth 授权。
          </p>
        )}
      </section>
    </div>
  );
}

function CopyRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded bg-muted px-2 py-1 text-xs">
          {value}
        </code>
        <Button size="icon" variant="outline" onClick={onCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
