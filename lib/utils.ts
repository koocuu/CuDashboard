import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 按 Asia/Shanghai 展示时间(数据库存 UTC)。 */
export function formatDate(
  date: Date | string | null | undefined,
  opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  },
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("zh-CN", {
    ...opts,
    timeZone: "Asia/Shanghai",
  }).format(d);
}
