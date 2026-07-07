"use client";

import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";

export function McpInfo() {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = `${origin}/api/mcp`;

  async function copy() {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3 text-sm">
      <p className="text-xs text-muted-foreground">
        在支持 MCP 的客户端(claude.ai / Claude Code / Codex)中添加此 Connector,
        携带 <code className="rounded bg-muted px-1">Authorization: Bearer &lt;token&gt;</code>。
        工具:get_profile / propose_profile_update / search_entries / create_entry。
        提案仍走用户确认流。
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded bg-muted px-2 py-1 text-xs">
          {url || "…"}
        </code>
        <button
          onClick={copy}
          className="rounded-md border p-1.5 text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
