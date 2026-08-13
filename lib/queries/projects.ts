import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  projects,
  type NewProject,
  type Project,
  type ProjectStatus,
} from "@/lib/db/schema";
import { isProjectStatus } from "@/lib/project-meta";

export function normalizeProjectStatus(
  status: string | null | undefined,
): ProjectStatus {
  const value = status ?? "";
  return isProjectStatus(value) ? value : "building";
}

export async function listProjects(): Promise<Project[]> {
  const rows = await db
    .select()
    .from(projects)
    .where(isNull(projects.deletedAt))
    .orderBy(asc(projects.sortOrder), asc(projects.id));

  return rows.map((row) => ({
    ...row,
    status: normalizeProjectStatus(row.status),
  }));
}

export async function projectStats() {
  const items = await listProjects();
  const counts: Record<ProjectStatus, number> = {
    building: 0,
    live: 0,
    paused: 0,
  };
  for (const item of items) {
    counts[normalizeProjectStatus(item.status)] += 1;
  }
  return counts;
}

export async function nextProjectSortOrder(): Promise<number> {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${projects.sortOrder}), 0)` })
    .from(projects)
    .where(isNull(projects.deletedAt));
  return Number(max) + 1;
}

export async function insertProject(
  values: Omit<NewProject, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): Promise<Project> {
  const [row] = await db.insert(projects).values(values).returning();
  return { ...row, status: normalizeProjectStatus(row.status) };
}

export async function updateProject(
  id: number,
  patch: Partial<
    Pick<
      NewProject,
      | "name"
      | "slug"
      | "status"
      | "area"
      | "summary"
      | "url"
      | "repoUrl"
      | "skillRef"
      | "sortOrder"
    >
  >,
): Promise<Project | null> {
  const [row] = await db
    .update(projects)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .returning();
  return row ? { ...row, status: normalizeProjectStatus(row.status) } : null;
}

export async function softDeleteProject(id: number): Promise<boolean> {
  const [row] = await db
    .update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .returning();
  return Boolean(row);
}