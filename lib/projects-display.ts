import type { Project } from "@/lib/db/schema";
import { PROJECT_AREA_META, isProjectArea } from "@/lib/project-meta";

function areaLabel(area: string) {
  return isProjectArea(area) ? PROJECT_AREA_META[area].label : area;
}

/** MCP / 导出：作品墙 Markdown，与页面同源。不分在做/上线/暂停。 */
export function formatProjectsMarkdown(items: Project[]): string {
  if (items.length === 0) {
    return "暂无作品。用户可在 dashboard「项目」页添加。";
  }

  const lines = [
    "# 作品墙",
    "",
    "当前 coding 作品。与画像层独立：身份与近况仍读 get_profile；作品列表读本工具。",
    "",
  ];

  for (const item of items) {
    lines.push(`## ${item.name}`);
    lines.push(`- slug: ${item.slug}`);
    lines.push(`- 领域: ${areaLabel(item.area)}`);
    if (item.summary.trim()) lines.push(`- 一句话: ${item.summary.trim()}`);
    if (item.url.trim()) lines.push(`- 链接: ${item.url.trim()}`);
    if (item.repoUrl.trim()) lines.push(`- 仓库: ${item.repoUrl.trim()}`);
    if (item.skillRef.trim()) lines.push(`- skill: ${item.skillRef.trim()}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}