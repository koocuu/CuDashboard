import { PROFILE_LAYERS, type ProfileLayer } from "@/lib/db/schema";
import { cleanDistributedProfileContent } from "@/lib/profile-content-cleaner";
import { PROFILE_UPDATE_TEMPLATE } from "@/lib/profile-update-protocol";

export interface ParsedUpdate {
  layer: ProfileLayer;
  summary: string;
  content: string;
  distributionWrapperCleaned: boolean;
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
 * 规则:只接受完整更新块本身;字段名必须严格为 layer: 和 summary:。
 */
export function parseUpdateBlock(raw: string): ParseResult {
  const text = raw.trim().replace(/\r\n/g, "\n");
  const startMarker = "<<<PROFILE_UPDATE";
  const endMarker = "PROFILE_UPDATE>>>";

  if (!text.startsWith(`${startMarker}\n`)) {
    return {
      ok: false,
      error: "更新块必须以单独一行 <<<PROFILE_UPDATE 开头",
    };
  }
  if (!text.endsWith(`\n${endMarker}`)) {
    return {
      ok: false,
      error: "更新块必须以单独一行 PROFILE_UPDATE>>> 结尾",
    };
  }

  const inner = text.slice(
    `${startMarker}\n`.length,
    text.length - `\n${endMarker}`.length,
  );

  const sep = "\n---\n";
  const sepIdx = inner.indexOf(sep);
  if (sepIdx === -1) {
    return {
      ok: false,
      error: "缺少单独一行 ---(元信息与正文之间必须是一行 ---)",
    };
  }

  const metaPart = inner.slice(0, sepIdx);
  const contentPart = inner.slice(sepIdx + sep.length);
  const metaLines = metaPart.split("\n");

  if (metaLines.length !== 2) {
    return {
      ok: false,
      error: "元信息必须且只能包含 layer: 和 summary: 两行",
    };
  }

  const layerMatch = metaLines[0].match(/^layer: ([a-z_]+)$/);
  if (!layerMatch) {
    return { ok: false, error: "第一行元信息必须严格形如 layer: status" };
  }
  const summaryMatch = metaLines[1].match(/^summary: (.+)$/);
  if (!summaryMatch) {
    return { ok: false, error: "第二行元信息必须严格形如 summary: 更新摘要" };
  }

  const layer = layerMatch[1];
  const summary = summaryMatch[1].trim();

  if (!(PROFILE_LAYERS as readonly string[]).includes(layer)) {
    return {
      ok: false,
      error: `layer 非法:"${layer}",允许值:core / investing / creative / status / private / public`,
    };
  }

  const cleaned = cleanDistributedProfileContent(contentPart, {
    layer: layer as ProfileLayer,
  });
  const content = cleaned.content;
  if (!content) {
    return { ok: false, error: "正文内容为空" };
  }

  return {
    ok: true,
    update: {
      layer: layer as ProfileLayer,
      summary,
      content,
      distributionWrapperCleaned: cleaned.cleaned,
    },
  };
}

export { PROFILE_UPDATE_TEMPLATE };
