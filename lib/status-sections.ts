/** status 层固定两节：内部状态 / 公开状态 */

export const STATUS_INTERNAL_HEADING = "内部状态";
export const STATUS_PUBLIC_HEADING = "公开状态";

const SECTION_RE = (title: string) =>
  new RegExp(
    `^##\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
    "m",
  );

const STATUS_SIBLING_RE = new RegExp(
  `^##\\s+(?:${STATUS_INTERNAL_HEADING}|${STATUS_PUBLIC_HEADING})\\s*$`,
  "m",
);

/** 提取 `## {title}` 节正文（不含标题行）；找不到返回空串。
 *  只在「内部状态 / 公开状态」这两个兄弟标题处截断，保留节内的 ## 在做 / 在写。
 */
export function extractMarkdownH2Section(content: string, title: string): string {
  const text = content.replace(/\r\n/g, "\n");
  const heading = SECTION_RE(title);
  const match = heading.exec(text);
  if (!match || match.index === undefined) return "";
  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const next = rest.search(STATUS_SIBLING_RE);
  const body = (next < 0 ? rest : rest.slice(0, next)).replace(/^\n+/, "").trimEnd();
  return body.trim();
}

/** 组装 status 层两节。 */
export function buildStatusLayerContent(internal: string, publicSection: string) {
  const parts = [
    `## ${STATUS_INTERNAL_HEADING}`,
    "",
    internal.replace(/\r\n/g, "\n").trim(),
  ];
  if (publicSection.trim()) {
    parts.push("", `## ${STATUS_PUBLIC_HEADING}`, "", publicSection.replace(/\r\n/g, "\n").trim());
  }
  return `${parts.join("\n").trim()}\n`;
}

/** 供 /now 同步：只取公开状态节；无节则空。 */
export function extractPublicStatusForWebsite(statusMd: string): string {
  return extractMarkdownH2Section(statusMd, STATUS_PUBLIC_HEADING);
}

/** 画像页 / MCP 用的内部状态；若无分节则回退全文。 */
export function extractInternalStatusForDashboard(statusMd: string): string {
  const internal = extractMarkdownH2Section(statusMd, STATUS_INTERNAL_HEADING);
  return internal || statusMd.trim();
}

/** 公开状态节里的 YAML frontmatter（season / headline）与正文分开。 */
export function parseNowFrontmatter(publicSection: string): {
  body: string;
  headline: string | null;
  season: string | null;
} {
  const text = publicSection.replace(/\r\n/g, "\n").trim();
  const match = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/);
  if (!match) return { body: text, headline: null, season: null };
  const fm = match[1];
  const body = match[2].trim();
  const headline = fm.match(/^headline\s*:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const season = fm.match(/^season\s*:\s*(.+)$/m)?.[1]?.trim() ?? null;
  return { body, headline, season };
}
