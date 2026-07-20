"use client";

import { useState } from "react";
import { Copy, Check, Link2 } from "lucide-react";
import { LAYER_META, LAYER_ORDER, PRESET_VERSIONS } from "@/lib/profile-meta";
import type { ProfileLayer } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DistributionPanel() {
  const [selected, setSelected] = useState<Set<ProfileLayer>>(
    new Set(PRESET_VERSIONS.general.layers),
  );
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  function toggle(layer: ProfileLayer) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }

  function applyPreset(key: keyof typeof PRESET_VERSIONS) {
    setSelected(new Set(PRESET_VERSIONS[key].layers));
  }

  async function loadPreview(): Promise<string> {
    setLoading(true);
    try {
      const layers = LAYER_ORDER.filter((l) => selected.has(l)).join(",");
      const res = await fetch(
        `/api/profile/preview?layers=${encodeURIComponent(layers)}`,
      );
      const data = await res.json();
      return data.markdown ?? "";
    } finally {
      setLoading(false);
    }
  }

  async function copyAll() {
    const md = await loadPreview();
    setPreview(md);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // 剪贴板不可用时展示预览供手动复制
    }
  }

  const isFull =
    selected.size === PRESET_VERSIONS.full.layers.length &&
    PRESET_VERSIONS.full.layers.every((l) => selected.has(l));
  const isGeneral =
    selected.size === PRESET_VERSIONS.general.layers.length &&
    PRESET_VERSIONS.general.layers.every((l) => selected.has(l));

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="text-sm font-medium">分发画像</h2>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={isFull ? "default" : "outline"}
          onClick={() => applyPreset("full")}
        >
          完整版
        </Button>
        <Button
          size="sm"
          variant={isGeneral ? "default" : "outline"}
          onClick={() => applyPreset("general")}
        >
          通用版
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {LAYER_ORDER.map((layer) => {
          const on = selected.has(layer);
          return (
            <button
              key={layer}
              onClick={() => toggle(layer)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                on
                  ? "border-muted-foreground bg-muted text-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              {LAYER_META[layer].label}
              {layer === "relationship" && on && " ⚠"}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={copyAll} disabled={loading || selected.size === 0}>
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> 已复制
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> 复制画像文本
            </>
          )}
        </Button>
        <a
          href="/profile/tokens"
          className="inline-flex items-center gap-1.5 rounded-md border px-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <Link2 className="h-3.5 w-3.5" /> Token 链接
        </a>
      </div>

      {preview && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            预览 / 手动复制
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 font-mono">
            {preview}
          </pre>
        </details>
      )}
    </section>
  );
}
