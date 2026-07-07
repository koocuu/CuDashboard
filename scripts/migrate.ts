import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = neon(process.env.DATABASE_URL);

  // 中文全文检索需要 pg_trgm(Phase 2 使用),这里提前建好扩展。
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
  console.log("✓ pg_trgm 扩展已就绪");

  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ 数据库迁移完成");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
