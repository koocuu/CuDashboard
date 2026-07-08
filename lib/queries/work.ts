import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  normalizeWorkStatus,
  workItems,
  type WorkStatus,
} from "@/lib/db/schema";

export async function listWorkItems() {
  const items = await db
    .select()
    .from(workItems)
    .where(isNull(workItems.deletedAt))
    .orderBy(asc(workItems.sortOrder), asc(workItems.id));

  return items.map((item) => ({
    ...item,
    status: normalizeWorkStatus(item.status),
  }));
}

export async function workStats() {
  const items = await db
    .select({ status: workItems.status })
    .from(workItems)
    .where(isNull(workItems.deletedAt));

  const counts: Record<WorkStatus, number> = {
    someday: 0,
    scheduled: 0,
    in_progress: 0,
    done: 0,
  };

  for (const it of items) {
    counts[normalizeWorkStatus(it.status)] += 1;
  }
  return counts;
}

export async function getWorkItem(id: number) {
  const rows = await db
    .select()
    .from(workItems)
    .where(and(eq(workItems.id, id), isNull(workItems.deletedAt)))
    .limit(1);

  const item = rows[0] ?? null;
  return item
    ? {
        ...item,
        status: normalizeWorkStatus(item.status),
      }
    : null;
}
