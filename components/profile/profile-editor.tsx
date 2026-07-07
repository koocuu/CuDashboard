"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import type { ProfileLayer } from "@/lib/db/schema";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  layer: ProfileLayer;
  meta: { label: string; desc: string; target: string };
  initialContent: string;
  version: number;
}

export function ProfileEditor({ layer, meta, initialContent, version }: Props) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [saved, setSaved] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = content !== saved;

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/profile/layers/${layer}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentMd: content }),
      });
      if (res.ok) {
        setSaved(content);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1500);
      }
    } finally {
      setSaving(false);
    }
  }

  const chars = content.length;

  return (
    <div className="rounded-lg border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{meta.label}</span>
            <span className="font-mono text-xs text-muted-foreground">v{version}</span>
            {layer === "private" && (
              <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                仅完整版
              </span>
            )}
            {dirty && (
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {meta.desc}
          </p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="space-y-2 border-t px-4 py-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder={`在此撰写「${meta.label}」的 Markdown 内容…`}
            className="font-mono text-sm leading-relaxed"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              <span className="font-mono">{chars}</span> 字 · 目标 {meta.target}
            </span>
            <Button
              size="sm"
              onClick={save}
              disabled={!dirty || saving}
              className={cn(justSaved && "border-positive text-positive")}
            >
              {justSaved ? (
                <>
                  <Check className="h-3.5 w-3.5" /> 已保存
                </>
              ) : saving ? (
                "保存中…"
              ) : (
                "保存"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
