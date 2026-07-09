import { and, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries, holdings, workItems } from "@/lib/db/schema";

export interface SearchHit {
  kind: string;
  id: number;
  title: string;
  snippet: string;
}

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
          sql`(${workItems.name} ILIKE ${term} OR ${workItems.note} ILIKE ${term} OR ${workItems.category} ILIKE ${term})`,
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

  const snip = (value: string) =>
    (value || "").replace(/\s+/g, " ").slice(0, 120);

  for (const row of entryRows) {
    hits.push({
      kind: `条目/${row.sectionKey}`,
      id: row.id,
      title: row.title || "(无标题)",
      snippet: snip(row.contentMd),
    });
  }
  for (const row of workRows) {
    hits.push({
      kind: "工作",
      id: row.id,
      title: row.name,
      snippet: snip([row.category, row.note].filter(Boolean).join(" · ")),
    });
  }
  for (const row of holdingRows) {
    hits.push({
      kind: "持仓",
      id: row.id,
      title: row.name,
      snippet: snip(row.thesisMd),
    });
  }

  return hits.slice(0, limit);
}
