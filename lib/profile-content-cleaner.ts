import { LAYER_META } from "@/lib/profile-meta";
import type { ProfileLayer } from "@/lib/db/schema";

const CLEANUP_NOTE = "已自动清理分发包装";

function stripUpdateProtocol(text: string) {
  const marker = "\n## 画像更新协议";
  const idx = text.indexOf(marker);
  if (idx !== -1) return text.slice(0, idx);
  return text.startsWith("## 画像更新协议") ? "" : text;
}

function isDistributionHeader(line: string) {
  const trimmed = line.trim();
  return (
    /^画像版本 v\d+\b/.test(trimmed) ||
    (trimmed.startsWith(">") &&
      trimmed.includes("个人画像") &&
      trimmed.includes("将本画像存入记忆时请连同版本行一起保存")) ||
    trimmed.includes("将本画像存入记忆时请连同版本行一起保存")
  );
}

function isRenderedLayerTitle(line: string, layer?: ProfileLayer) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("## ")) return false;
  const title = trimmed.slice(3).trim();
  if (layer && title === LAYER_META[layer].label) return true;
  return Object.values(LAYER_META).some((meta) => title === meta.label);
}

export function cleanDistributedProfileContent(
  raw: string,
  options: { layer?: ProfileLayer } = {},
) {
  const original = raw;
  let text = stripUpdateProtocol(raw.replace(/\r\n/g, "\n").trim());
  const lines = text.split("\n").filter((line) => !isDistributionHeader(line));

  while (lines.length > 0 && lines[0].trim() === "") lines.shift();
  if (lines.length > 0 && isRenderedLayerTitle(lines[0], options.layer)) {
    lines.shift();
  }
  while (lines.length > 0 && lines[0].trim() === "") lines.shift();

  text = lines.join("\n").trim();
  return {
    content: text,
    cleaned: text !== original.replace(/\r\n/g, "\n").trim(),
    note: CLEANUP_NOTE,
  };
}

export function appendCleanupNote(summary: string) {
  return summary.includes(CLEANUP_NOTE)
    ? summary
    : `${summary} · ${CLEANUP_NOTE}`;
}

export { CLEANUP_NOTE };
