import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { workItems, type WorkStatus } from "@/lib/db/schema";

/** 全部未删除事项,按 sortOrder、id 升序。 */
export async function listWorkItems() {
  return db
    .select()
    .from(workItems)
    .where(isNull(workItems.deletedAt))
    .orderBy(asc(workItems.sortOrder), asc(workItems.id));
}

/** 各状态计数(未删除)。 */
export async function workStats() {
  const items = await db
    .select({ status: workItems.status })
    .from(workItems)
    .where(isNull(workItems.deletedAt));

  const counts: Record<WorkStatus, number> = {
    inbox: 0,
    scheduled: 0,
    in_progress: 0,
    waiting: 0,
    someday: 0,
    done: 0,
    archived: 0,
  };
  for (const it of items) {
    const s = it.status as WorkStatus;
    if (s in counts) counts[s] += 1;
  }
  return counts;
}

/** 取某事项(未删除)。 */
export async function getWorkItem(id: number) {
  const rows = await db
    .select()
    .from(workItems)
    .where(and(eq(workItems.id, id), isNull(workItems.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}
