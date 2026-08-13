import type { ProjectArea, ProjectStatus } from "@/lib/db/schema";
import { PROJECT_AREAS, PROJECT_STATUSES } from "@/lib/db/schema";

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; order: number; bar: string; chip: string }
> = {
  building: {
    label: "在做",
    order: 0,
    bar: "border-l-[#6F89AD]",
    chip: "bg-[#EEF3FA] text-[#6F89AD]",
  },
  live: {
    label: "已上线",
    order: 1,
    bar: "border-l-positive",
    chip: "bg-[#EAF1EB] text-positive",
  },
  paused: {
    label: "暂停",
    order: 2,
    bar: "border-l-border",
    chip: "bg-muted text-muted-foreground",
  },
};

export const PROJECT_AREA_META: Record<ProjectArea, { label: string }> = {
  personal: { label: "个人" },
  work: { label: "工作" },
  writing: { label: "写作" },
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "building",
  "live",
  "paused",
];

export function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(value);
}

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