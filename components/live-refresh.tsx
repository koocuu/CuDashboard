"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

const POLL_MS = 4_000;

/**
 * 可见标签页轮询 /api/live-revision；版本变化时 router.refresh()。
 * 用服务端首屏 revision 做对照，避免首次探测把已发生的变更吞掉。
 */
export function LiveRefresh({
  initialRevision,
}: {
  initialRevision?: string | null;
}) {
  const router = useRouter();
  const lastRevision = useRef<string | null>(initialRevision ?? null);
  const inFlight = useRef(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, startTransition] = useTransition();
  const noticeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const showNotice = () => {
      const el = noticeRef.current;
      if (!el) return;
      el.dataset.show = "1";
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => {
        el.dataset.show = "0";
      }, 2200);
    };

    const poll = async () => {
      if (cancelled || document.hidden || inFlight.current) return;
      inFlight.current = true;
      try {
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
          showNotice();
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
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [router, startTransition]);

  return (
    <p
      ref={noticeRef}
      data-show="0"
      className="pointer-events-none fixed right-4 top-3 z-50 rounded-md border bg-card px-3 py-1.5 font-mono text-[11px] text-primary opacity-0 transition-opacity data-[show=1]:opacity-100"
    >
      内容已更新
    </p>
  );
}