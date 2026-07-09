"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface SearchHit {
  kind: string;
  id: number;
  title: string;
  snippet: string;
}

// 命中类型对应的落地页;条目暂无独立页面,仅展示内容
const KIND_HREF: Record<string, string> = {
  工作: "/dashboard",
  持仓: "/invest",
};

export function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setHits(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { hits: SearchHit[] };
          setHits(data.hits);
        }
      } catch {
        // 输入变化导致的中断,忽略
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [q]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setHits(null);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, []);

  function onPick(hit: SearchHit) {
    const href = KIND_HREF[hit.kind];
    setQ("");
    setHits(null);
    if (href) router.push(href);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && (setQ(""), setHits(null))}
        placeholder="搜索"
        aria-label="全局搜索"
        className="h-8 w-24 rounded-lg border border-input bg-card px-2.5 text-sm outline-none transition-[width,border-color] placeholder:text-muted-foreground focus:w-44 focus:border-primary sm:w-36 sm:focus:w-56"
      />
      {q.trim() && hits !== null && (
        <div className="absolute right-0 top-full z-30 mt-1.5 max-h-80 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border bg-card p-1 shadow-sm">
          {hits.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              没有找到相关内容。
            </p>
          ) : (
            hits.map((hit) => (
              <button
                key={`${hit.kind}-${hit.id}`}
                onClick={() => onPick(hit)}
                className="grid w-full grid-cols-[auto_1fr] items-baseline gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <span className="font-mono text-[10px] text-muted-foreground">
                  {hit.kind}
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{hit.title}</span>
                  {hit.snippet && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {hit.snippet}
                    </span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
