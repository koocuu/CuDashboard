import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";

/** 列出某板块的条目(未删除)。 */
export async function listEntries(sectionKey: string) {
  return db
    .select()
    .from(entries)
    .where(and(eq(entries.sectionKey, sectionKey), isNull(entries.deletedAt)))
    .orderBy(desc(entries.createdAt));
}

/** 某板块的全部标签(去重)。 */
export async function listTags(sectionKey: string): Promise<string[]> {
  const rows = await listEntries(sectionKey);
  const set = new Set<string>();
  for (const r of rows) for (const t of r.tags) set.add(t);
  return [...set].sort();
}

/** 全部条目的标签统计(标签归并工具用)。 */
export async function tagCounts(): Promise<Array<{ tag: string; count: number }>> {
  const rows = await db
    .select({ tags: entries.tags })
    .from(entries)
    .where(isNull(entries.deletedAt));
  const map = new Map<string, number>();
  for (const r of rows)
    for (const t of r.tags) map.set(t, (map.get(t) ?? 0) + 1);
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 标签归并:把 from 标签合并进 to(更新所有含 from 的条目)。
 * 用 Postgres 数组函数,一次完成。
 */
export async function mergeTags(from: string, to: string) {
  // array_remove + 追加(去重),仅对含 from 的行
  await db
    .update(entries)
    .set({
      tags: sql`(
        SELECT array_agg(DISTINCT t) FROM unnest(
          array_append(array_remove(${entries.tags}, ${from}), ${to})
        ) AS t
      )`,
      updatedAt: new Date(),
    })
    .where(sql`${from} = ANY(${entries.tags})`);
}
