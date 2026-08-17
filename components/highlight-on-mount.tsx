"use client";

import { useEffect } from "react";

export function HighlightOnMount({ targetId }: { targetId: string }) {
  useEffect(() => {
    document.getElementById(targetId)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [targetId]);
  return null;
}
