import "dotenv/config";
import { neon } from "@neondatabase/serverless";

/**
 * pg_trgm GIN 索引:用于中文全文检索(ILIKE)。
 * PRD 3.1:禁止用 tsvector,必须 pg_trgm + GIN + ILIKE。
 * 幂等:IF NOT EXISTS。
 */
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const sql = neon(process.env.DATABASE_URL);

  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;

  const indexes: Array<[string, string, string]> = [
    ["entries_content_trgm", "entries", "content_md"],
    ["entries_title_trgm", "entries", "title"],
    ["work_items_name_trgm", "work_items", "name"],
    ["work_items_note_trgm", "work_items", "note"],
    ["holdings_name_trgm", "holdings", "name"],
    ["holdings_thesis_trgm", "holdings", "thesis_md"],
  ];

  for (const [idx, table, col] of indexes) {
    const stmt = `CREATE INDEX IF NOT EXISTS ${idx} ON ${table} USING gin (${col} gin_trgm_ops)`;
    // neon-http:用数组形式传原始 SQL(无参数)
    await sql(stmt as unknown as TemplateStringsArray);
    console.log(`✓ ${idx}`);
  }

  console.log("✓ 全部 pg_trgm GIN 索引就绪");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
