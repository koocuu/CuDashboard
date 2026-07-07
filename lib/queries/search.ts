import { db } from "@/lib/db";
import { sql, and, isNull } from "drizzle-orm";
import {
  entries,
  workItems,
  holdings,
} from "@/lib/db/schema";

export interface SearchHit {
  kind: string;
  id: number;
  title: string;
  snippet: string;
}

/**
 * 全文检索(pg_trgm ILIKE)。跨多个专表 + entries。
 * PRD 3.1:中文用 ILIKE + GIN(gin_trgm_ops),不用 tsvector。
 */
export async function searchAll(q: string, limit = 30): Promise<SearchHit[]> {
  const term = `%${q}%`;
  const hits: SearchHit[] = [];

  const [entryRows, workRows, holdingRows] = await Promise.all([
    db
      .select()
      .from(entries)
      .where(
        and(
          isNull(entries.deletedAt),
          sql`(${entries.title} ILIKE ${term} OR ${entries.contentMd} ILIKE ${term})`,
        ),
      )
      .limit(limit),
    db
      .select()
      .from(workItems)
      .where(
        and(
          isNull(workItems.deletedAt),
          sql`(${workItems.name} ILIKE ${term} OR ${workItems.note} ILIKE ${term})`,
        ),
      )
      .limit(limit),
    db
      .select()
      .from(holdings)
      .where(
        and(
          isNull(holdings.deletedAt),
          sql`(${holdings.name} ILIKE ${term} OR ${holdings.thesisMd} ILIKE ${term})`,
        ),
      )
      .limit(limit),
  ]);

  const snip = (s: string) => (s || "").replace(/\s+/g, " ").slice(0, 120);

  for (const r of entryRows)
    hits.push({
      kind: `条目/${r.sectionKey}`,
      id: r.id,
      title: r.title || "(无标题)",
      snippet: snip(r.contentMd),
    });
  for (const r of workRows)
    hits.push({ kind: "工作", id: r.id, title: r.name, snippet: snip(r.note) });
  for (const r of holdingRows)
    hits.push({
      kind: "持仓",
      id: r.id,
      title: r.name,
      snippet: snip(r.thesisMd),
    });
  return hits.slice(0, limit);
}
