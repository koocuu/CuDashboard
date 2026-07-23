"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const POLL_MS = 12_000;

/**
 * 可见标签页轮询 /api/live-revision；版本变化时 router.refresh()。
 * 挂在 (app) layout，覆盖导航角标与当前页 RSC。
 */
export function LiveRefresh() {
  const router = useRouter();
  const lastRevision = useRef<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const poll = async () => {
      if (cancelled || document.hidden || inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await fetch("/api/live-revision", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
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
          router.refresh();
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

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  return null;
}
