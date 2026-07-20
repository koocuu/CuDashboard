import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  holdings,
  profileDoc,
  profileProposals,
  workItems,
  type ProfileLayer,
  type WorkStatus,
} from "@/lib/db/schema";

const workSeed: Array<{
  name: string;
  status: WorkStatus;
  note: string;
  pinned: boolean;
}> = [
  { name: "Engage SDK", status: "scheduled", note: "排期", pinned: false },
  {
    name: "ANR 治理",
    status: "scheduled",
    note: "治理完成,等龙哥看低端机 C1",
    pinned: false,
  },
  {
    name: "选本共创系统",
    status: "in_progress",
    note: "P0 完成,等待做 P1",
    pinned: true,
  },
  {
    name: "Launcher 性能优化",
    status: "scheduled",
    note: "排期 app.onCreate",
    pinned: false,
  },
  { name: "决策助手", status: "done", note: "", pinned: false },
  {
    name: "棱角计划 / 碳基灵感收容所",
    status: "in_progress",
    note: "持续更新",
    pinned: false,
  },
  { name: "个人主页", status: "someday", note: "有想法就更新", pinned: false },
  {
    name: "Console 个人控制台",
    status: "in_progress",
    note: "Phase 1-2 开发中",
    pinned: true,
  },
];

const holdingSeed: Array<{
  market: string;
  symbol: string;
  name: string;
  amountCny: number;
  status: string;
  thesisMd: string;
  watchPriceNote?: string;
}> = [
  {
    market: "cn",
    symbol: "CN-CPO",
    name: "A股CPO",
    amountCny: 351262,
    status: "active",
    thesisMd: "中航机遇领航C、永赢科技智选C、华泰柏瑞质量成长C、远东股份。CPO/光互连主线仓位。",
  },
  {
    market: "cn",
    symbol: "CN-MEM",
    name: "A股存储",
    amountCny: 151064,
    status: "active",
    thesisMd: "永赢先锋半导体智选C。A股存储周期仓位。",
  },
  {
    market: "cn",
    symbol: "CN-EQUIP",
    name: "A股半设",
    amountCny: 70970,
    status: "active",
    thesisMd: "东方人工智能主题C、半导设备个股。A股半导体设备仓位。",
  },
  {
    market: "us",
    symbol: "QQQ",
    name: "QQQ",
    amountCny: 88739,
    status: "active",
    thesisMd: "五只纳指基金。美股科技指数底仓。",
  },
  {
    market: "us",
    symbol: "US-SEMI",
    name: "美股半导体",
    amountCny: 87371,
    status: "active",
    thesisMd: "NVDA、SMH、SOXX。美股半导体仓位。",
  },
  {
    market: "us",
    symbol: "US-MEM",
    name: "美股存储",
    amountCny: 67170,
    status: "active",
    thesisMd: "MU、DRAM、SNDK。美股存储仓位。",
  },
  {
    market: "other",
    symbol: "BOND",
    name: "债券",
    amountCny: 18070,
    status: "active",
    thesisMd: "兴业120天债券A。防守仓位。",
  },
  {
    market: "other",
    symbol: "GOLD",
    name: "黄金",
    amountCny: 20000,
    status: "active",
    thesisMd: "黄金。防守仓位。",
  },
  {
    market: "other",
    symbol: "CASH",
    name: "现金",
    amountCny: 50000,
    status: "active",
    thesisMd: "现金/货基。",
  },
];

const statusContent = `## 内部状态

**主线**:个人控制台系统 Console 进入开发验收阶段(Phase 1-2),由 AI 结对开发,目标是替代记事本并建立跨 AI 的画像分发能力。

**工作**:ANR 治理已完成待外部确认;选本共创系统 P0 落地,P1 排期中;Engage SDK 与 Launcher 性能优化在排期。

**创作**:碳基灵感收容所推进'硅基生命的致命弱点'方向(参数固化 vs 人类经验自改写),棱角计划持续更新。

**投资**:仓位结构按 A股CPO / A股存储 / A股半设 / QQQ / 美股半导体 / 美股存储 / 黄金 / 债券 / 现金 聚合维护,当前纪律是不做叙事驱动的反应式调仓。

**基调**:平稳偏投入,周末在恢复 dates 节奏。

## 公开状态

---
season: 2026 夏
---

## 在做

（待撰写公开近况）
`;

const layerSeed: Array<{ layer: ProfileLayer; contentMd: string }> = [
  { layer: "status", contentMd: statusContent },
  {
    layer: "core",
    contentMd:
      "(待撰写:身份、职业、性格与沟通偏好、人生主线、创作附录。约 2000 字。)",
  },
  {
    layer: "investing",
    contentMd:
      "(待撰写:投资框架、结构概述、行为弱点、AI 刹车角色、投资历程。约 1500 字。)",
  },
  {
    layer: "relationship",
    contentMd: "(待撰写:情感与社交、关系复盘。仅完整版分发。)",
  },
];

async function upsertWork() {
  let sortOrder = 1;
  for (const item of workSeed) {
    const rows = await db
      .select({ id: workItems.id })
      .from(workItems)
      .where(eq(workItems.name, item.name))
      .limit(1);
    const values = {
      status: item.status,
      note: item.note,
      pinned: item.pinned,
      sortOrder: sortOrder++,
      updatedAt: new Date(),
      doneAt: item.status === "done" ? new Date() : null,
      deletedAt: null,
    };
    if (rows[0]) {
      await db.update(workItems).set(values).where(eq(workItems.id, rows[0].id));
    } else {
      await db.insert(workItems).values({ name: item.name, ...values });
    }
  }
}

async function upsertHoldings() {
  const total = holdingSeed.reduce((sum, item) => sum + item.amountCny, 0);
  for (const item of holdingSeed) {
    const rows = await db
      .select({ id: holdings.id })
      .from(holdings)
      .where(and(eq(holdings.symbol, item.symbol), eq(holdings.market, item.market)))
      .limit(1);
    const values = {
      name: item.name,
      amountCny: item.amountCny,
      positionPct: Math.round((item.amountCny / total) * 10000) / 100,
      status: item.status,
      thesisMd: item.thesisMd,
      watchPriceNote: item.watchPriceNote ?? "",
      updatedAt: new Date(),
      deletedAt: null,
    };
    if (rows[0]) {
      await db.update(holdings).set(values).where(eq(holdings.id, rows[0].id));
    } else {
      await db.insert(holdings).values({
        market: item.market,
        symbol: item.symbol,
        costNote: "",
        ...values,
      });
    }
  }
}

async function upsertProfile() {
  for (const item of layerSeed) {
    const rows = await db
      .select({ id: profileDoc.id })
      .from(profileDoc)
      .where(eq(profileDoc.layer, item.layer))
      .limit(1);
    if (rows[0]) {
      await db
        .update(profileDoc)
        .set({ contentMd: item.contentMd, updatedAt: new Date() })
        .where(eq(profileDoc.id, rows[0].id));
    } else {
      await db.insert(profileDoc).values(item);
    }
  }
}

async function seedProposal() {
  const diffSummary = "示例提案:更新 Console 进度为'首页 UI 重构中'";
  const existing = await db
    .select({ id: profileProposals.id })
    .from(profileProposals)
    .where(eq(profileProposals.diffSummary, diffSummary))
    .limit(1);
  if (existing[0]) return;

  await db.insert(profileProposals).values({
    layer: "status",
    source: "paste",
    sourceName: "Claude",
    diffSummary,
    proposedContentMd: statusContent.replace(
      "进入开发验收阶段(Phase 1-2)",
      "进入首页 UI 重构中",
    ),
    status: "pending",
  });
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  await upsertWork();
  await upsertHoldings();
  await upsertProfile();
  await seedProposal();
  console.log("✓ Console demo seed imported");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
