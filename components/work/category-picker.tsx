"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 分类选择器:点击弹出菜单,点选现有分类;输入仅用于过滤,
 * 无匹配时出现「新建」行(Notion select / Linear label 同款交互)。
 */
export function CategoryPicker({
  value,
  options,
  onChange,
  variant = "input",
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  /** input:录入区高按钮;inline:行内小字 chip */
  variant?: "input" | "inline";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function pick(next: string) {
    if (next !== value) onChange(next);
    close();
  }

  const q = query.trim();
  const filtered = q
    ? options.filter((option) =>
        option.toLowerCase().includes(q.toLowerCase()),
      )
    : options;
  const exactMatch = options.some((option) => option === q);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") close();
    if (e.key === "Enter") {
      e.preventDefault();
      if (q) pick(q);
      else if (filtered.length === 1) pick(filtered[0]);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {variant === "input" ? (
        <button
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          className={cn(
            "flex h-10 w-full items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm transition-colors",
            value ? "text-foreground" : "text-muted-foreground",
            open && "border-primary",
          )}
        >
          <Tag className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <span className="truncate">{value || "分类"}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          className={cn(
            "font-mono text-[11px]",
            value
              ? "text-foreground/70 hover:text-foreground"
              : "text-muted-foreground/50 hover:text-muted-foreground",
          )}
          title="编辑分类"
        >
          {value || "+ 分类"}
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-52 rounded-xl border bg-card p-1 shadow-sm">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="筛选或新建…"
            className="mb-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <div className="max-h-56 overflow-y-auto">
            {value && !q && (
              <button
                type="button"
                onClick={() => pick("")}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
                移除分类
              </button>
            )}
            {filtered.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => pick(option)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted"
              >
                <span className="truncate">{option}</span>
                {option === value && (
                  <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-primary" />
                )}
              </button>
            ))}
            {q && !exactMatch && (
              <button
                type="button"
                onClick={() => pick(q)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-primary transition-colors hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                新建「{q}」
              </button>
            )}
            {!q && filtered.length === 0 && !value && (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">
                输入名称创建第一个分类
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
