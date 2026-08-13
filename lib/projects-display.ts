import type { Project, ProjectStatus } from "@/lib/db/schema";
import {
  PROJECT_AREA_META,
  PROJECT_STATUS_META,
  PROJECT_STATUS_ORDER,
  isProjectArea,
} from "@/lib/project-meta";
import { normalizeProjectStatus } from "@/lib/queries/projects";

function areaLabel(area: string) {
  return isProjectArea(area) ? PROJECT_AREA_META[area].label : area;
}

/** MCP / 导出：作品墙 Markdown，与页面同源。 */
export function formatProjectsMarkdown(
  items: Project[],
  status?: ProjectStatus | null,
): string {
  const filtered = status
    ? items.filter((item) => normalizeProjectStatus(item.status) === status)
    : items;

  if (filtered.length === 0) {
    return status
      ? `暂无状态为「${PROJECT_STATUS_META[status].label}」的作品。`
      : "暂无作品。用户可在 dashboard「项目」页添加。";
  }

  const lines = [
    "# 作品墙",
    "",
    "正在做或已上线的 coding 项目。与画像层独立：事实性身份仍读 get_profile；作品列表读本工具。",
    "",
  ];

  for (const key of PROJECT_STATUS_ORDER) {
    const group = filtered.filter(
      (item) => normalizeProjectStatus(item.status) === key,
    );
    if (group.length === 0) continue;
    lines.push(`## ${PROJECT_STATUS_META[key].label}`);
    lines.push("");
    for (const item of group) {
      lines.push(`### ${item.name}`);
      lines.push(`- slug: ${item.slug}`);
      lines.push(`- 领域: ${areaLabel(item.area)}`);
      if (item.summary.trim()) lines.push(`- 一句话: ${item.summary.trim()}`);
      if (item.url.trim()) lines.push(`- 链接: ${item.url.trim()}`);
      if (item.repoUrl.trim()) lines.push(`- 仓库: ${item.repoUrl.trim()}`);
      if (item.skillRef.trim()) lines.push(`- skill: ${item.skillRef.trim()}`);
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}