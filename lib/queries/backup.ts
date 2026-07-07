import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { backupRuns } from "@/lib/db/schema";

/** 最近一次 GitHub 备份结果。 */
export async function latestBackupRun() {
  const rows = await db
    .select()
    .from(backupRuns)
    .orderBy(desc(backupRuns.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
