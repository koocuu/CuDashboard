"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

export function McpEndpointCopy() {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = `${origin || "https://dashboard.koocuu.com"}/api/mcp`;

  async function copy() {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"
      title={url}
      aria-label="复制 MCP 地址"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span>MCP 地址</span>
      <code className="hidden rounded bg-muted px-1 font-mono text-[11px] md:inline">
        /api/mcp
      </code>
    </button>
  );
}
