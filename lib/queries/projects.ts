import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, type NewProject, type Project } from "@/lib/db/schema";

export async function listProjects(): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(isNull(projects.deletedAt))
    .orderBy(asc(projects.sortOrder), asc(projects.id));
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
  return row;
}

export async function updateProject(
  id: number,
  patch: Partial<
    Pick<
      NewProject,
      | "name"
      | "slug"
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
  return row ?? null;
}

export async function softDeleteProject(id: number): Promise<boolean> {
  const [row] = await db
    .update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .returning();
  return Boolean(row);
}