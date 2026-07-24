"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

/** 可见时轮询间隔；提案提交后最多等这么久就会刷。 */
const POLL_MS = 4_000;

/**
 * 可见标签页轮询 /api/live-revision；版本变化时 router.refresh()。
 * 挂在 (app) layout，覆盖导航角标与当前页 RSC。
 */
export function LiveRefresh() {
  const router = useRouter();
  const lastRevision = useRef<string | null>(null);
  const inFlight = useRef(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const poll = async () => {
      if (cancelled || document.hidden || inFlight.current) return;
      inFlight.current = true;
      try {
        // 时间戳防中间层把 GET 当可缓存
        const res = await fetch(`/api/live-revision?t=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          headers: { Pragma: "no-cache" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { revision?: string };
        if (!data.revision || cancelled) return;

        if (lastRevision.current === null) {
          lastRevision.current = data.revision;
          return;
        }
        if (data.revision !== lastRevision.current) {
          lastRevision.current = data.revision;
          startTransition(() => {
            router.refresh();
          });
        }
      } catch {
        // 静默忽略，不打断使用
      } finally {
        inFlight.current = false;
      }
    };

    const start = () => {
      if (timer) return;
      void poll();
      timer = setInterval(() => {
        void poll();
      }, POLL_MS);
    };

    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
        return;
      }
      void poll();
      start();
    };

    const onFocus = () => {
      if (!document.hidden) void poll();
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [router, startTransition]);

  return null;
}
