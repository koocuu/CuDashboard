import "dotenv/config";
import { and, eq, isNull, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";

const targetHoldings = [
  {
    market: "cn",
    symbol: "CN-CPO",
    name: "A股CPO",
    amountCny: 351262,
    thesisMd:
      "中航机遇领航C、永赢科技智选C、华泰柏瑞质量成长C、远东股份。CPO/光互连主线仓位。",
  },
  {
    market: "cn",
    symbol: "CN-MEM",
    name: "A股存储",
    amountCny: 151064,
    thesisMd: "永赢先锋半导体智选C。A股存储周期仓位。",
  },
  {
    market: "cn",
    symbol: "CN-EQUIP",
    name: "A股半设",
    amountCny: 70970,
    thesisMd: "东方人工智能主题C、半导设备个股。A股半导体设备仓位。",
  },
  {
    market: "us",
    symbol: "QQQ",
    name: "QQQ",
    amountCny: 88739,
    thesisMd: "五只纳指基金。美股科技指数底仓。",
  },
  {
    market: "us",
    symbol: "US-SEMI",
    name: "美股半导体",
    amountCny: 87371,
    thesisMd: "NVDA、SMH、SOXX。美股半导体仓位。",
  },
  {
    market: "us",
    symbol: "US-MEM",
    name: "美股存储",
    amountCny: 67170,
    thesisMd: "MU、DRAM、SNDK。美股存储仓位。",
  },
  {
    market: "other",
    symbol: "BOND",
    name: "债券",
    amountCny: 18070,
    thesisMd: "兴业120天债券A。防守仓位。",
  },
  {
    market: "other",
    symbol: "GOLD",
    name: "黄金",
    amountCny: 20000,
    thesisMd: "黄金。防守仓位。",
  },
  {
    market: "other",
    symbol: "CASH",
    name: "现金",
    amountCny: 50000,
    thesisMd: "现金/货基。",
  },
] as const;

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const symbols = targetHoldings.map((item) => item.symbol);
  const total = targetHoldings.reduce((sum, item) => sum + item.amountCny, 0);
  await db
    .update(holdings)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(isNull(holdings.deletedAt), notInArray(holdings.symbol, symbols)));

  for (const item of targetHoldings) {
    const rows = await db
      .select({ id: holdings.id })
      .from(holdings)
      .where(eq(holdings.symbol, item.symbol))
      .limit(1);

    const values = {
      market: item.market,
      name: item.name,
      amountCny: item.amountCny,
      positionPct: Math.round((item.amountCny / total) * 10000) / 100,
      thesisMd: item.thesisMd,
      status: "active",
      costNote: "",
      watchPriceNote: "",
      updatedAt: new Date(),
      deletedAt: null,
    };

    if (rows[0]) {
      await db.update(holdings).set(values).where(eq(holdings.id, rows[0].id));
    } else {
      await db.insert(holdings).values({ symbol: item.symbol, ...values });
    }
  }

  console.log(`✓ holdings synced: ${targetHoldings.length} rows, total ¥${total.toLocaleString("zh-CN")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
