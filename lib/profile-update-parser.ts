import { PROFILE_LAYERS, type ProfileLayer } from "@/lib/db/schema";

export interface ParsedUpdate {
  layer: ProfileLayer;
  summary: string;
  content: string;
}

export type ParseResult =
  | { ok: true; update: ParsedUpdate }
  | { ok: false; error: string };

/**
 * 解析画像更新块(PRD 6.5):
 *
 * <<<PROFILE_UPDATE
 * layer: status
 * summary: 更新近期状态
 * ---
 * (该层完整新版本 Markdown)
 * PROFILE_UPDATE>>>
 *
 * 规则:提取标记之间内容;`---` 前为元信息(layer 必填,summary 选填),之后为正文。
 */
export function parseUpdateBlock(raw: string): ParseResult {
  const text = raw.trim();

  const startMarker = "<<<PROFILE_UPDATE";
  const endMarker = "PROFILE_UPDATE>>>";

  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) {
    return { ok: false, error: "未找到起始标记 <<<PROFILE_UPDATE" };
  }
  const endIdx = text.indexOf(endMarker, startIdx + startMarker.length);
  if (endIdx === -1) {
    return { ok: false, error: "未找到结束标记 PROFILE_UPDATE>>>" };
  }

  const inner = text.slice(startIdx + startMarker.length, endIdx);

  // 用第一个单独成行的 --- 分隔元信息与正文
  const sepMatch = inner.match(/\n[ \t]*---[ \t]*\n/);
  if (!sepMatch || sepMatch.index === undefined) {
    return {
      ok: false,
      error: "缺少分隔线 ---(元信息与正文之间需要一行 ---)",
    };
  }

  const metaPart = inner.slice(0, sepMatch.index);
  const contentPart = inner.slice(sepMatch.index + sepMatch[0].length);

  // 解析元信息
  let layer: string | null = null;
  let summary = "";
  for (const line of metaPart.split("\n")) {
    const m = line.match(/^\s*(\w+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "layer") layer = val;
    else if (key === "summary") summary = val;
  }

  if (!layer) {
    return { ok: false, error: "元信息缺少 layer 字段" };
  }
  if (!(PROFILE_LAYERS as readonly string[]).includes(layer)) {
    return {
      ok: false,
      error: `layer 非法:"${layer}",允许值:${PROFILE_LAYERS.join(" / ")}`,
    };
  }

  const content = contentPart.trim();
  if (!content) {
    return { ok: false, error: "正文内容为空" };
  }

  return {
    ok: true,
    update: { layer: layer as ProfileLayer, summary, content },
  };
}
