import type { ProjectArea } from "@/lib/db/schema";
import { PROJECT_AREAS } from "@/lib/db/schema";

export const PROJECT_AREA_META: Record<ProjectArea, { label: string }> = {
  personal: { label: "个人" },
  work: { label: "工作" },
  writing: { label: "写作" },
};

export function isProjectArea(value: string): value is ProjectArea {
  return (PROJECT_AREAS as readonly string[]).includes(value);
}

export function slugifyProject(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || `p-${Date.now().toString(36)}`;
}

/** 目录编号与海报水印配色，按排序轮换，只有三种。 */
export const PROJECT_NODE_TONES = [
  "hsl(var(--primary))",
  "hsl(var(--mist))",
  "hsl(var(--positive))",
] as const;

export function projectTone(index: number): string {
  return PROJECT_NODE_TONES[index % PROJECT_NODE_TONES.length];
}