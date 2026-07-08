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

const holdingSeed = [
  {
    market: "cn",
    symbol: "300308",
    name: "中际旭创",
    positionPct: 20,
    status: "active",
    thesisMd: "CPO/光互连主线核心标的。AI 算力互连需求驱动,光模块龙头。",
  },
  {
    market: "cn",
    symbol: "300502",
    name: "新易盛",
    positionPct: 12,
    status: "active",
    thesisMd: "CPO 主线第二仓位,高速光模块弹性标的。",
  },
  {
    market: "cn",
    symbol: "002371",
    name: "北方华创",
    positionPct: 10,
    status: "active",
    thesisMd: "半导体设备次线,国产替代逻辑,长期持有。",
  },
  {
    market: "cn",
    symbol: "000000",
    name: "存储标的(示例)",
    positionPct: 8,
    status: "active",
    thesisMd: "存储周期持有仓,不加仓不减仓,等周期。",
  },
  {
    market: "us",
    symbol: "NVDA",
    name: "NVIDIA",
    positionPct: 25,
    status: "active",
    thesisMd: "美股锚定仓位,AI 算力核心。",
  },
  {
    market: "us",
    symbol: "SMH",
    name: "VanEck 半导体 ETF",
    positionPct: 15,
    status: "active",
    thesisMd: "半导体行业 beta,平滑个股波动。",
  },
  {
    market: "us",
    symbol: "QQQM",
    name: "Invesco 纳指 ETF",
    positionPct: 10,
    status: "active",
    thesisMd: "指数底仓。",
  },
  {
    market: "cn",
    symbol: "688000",
    name: "观察标的(示例)",
    positionPct: 0,
    status: "watching",
    thesisMd: "观察池示例:记录想买的理由与当时价格,供事后验证冲动质量。",
    watchPriceNote: "示例占位,导入后按真实观察价格修改。",
  },
];

const statusContent =
  "## 近期状态(2026-07)\n\n**主线**:个人控制台系统 Console 进入开发验收阶段(Phase 1-2),由 AI 结对开发,目标是替代记事本并建立跨 AI 的画像分发能力。\n\n**工作**:ANR 治理已完成待外部确认;选本共创系统 P0 落地,P1 排期中;Engage SDK 与 Launcher 性能优化在排期。\n\n**创作**:碳基灵感收容所推进'硅基生命的致命弱点'方向(参数固化 vs 人类经验自改写),棱角计划持续更新。\n\n**投资**:仓位结构稳定(CPO 主线 + 设备次线 + 存储持有,美股 NVDA/SMH/QQQM 锚定),当前纪律是不做叙事驱动的反应式调仓。\n\n**基调**:平稳偏投入,周末在恢复 dates 节奏。";

const layerSeed: Array<{ layer: ProfileLayer; contentMd: string }> = [
  { layer: "status", contentMd: statusContent },
  {
    layer: "core",
    contentMd:
      "(待撰写:身份、职业、性格与沟通偏好、人生主线。约 1500 字。)",
  },
  {
    layer: "investing",
    contentMd:
      "(待撰写:投资框架、结构概述、行为弱点、AI 应扮演的刹车角色。约 800 字。)",
  },
  {
    layer: "creative",
    contentMd:
      "(待撰写:两个公众号定位、写作风格、世界观设定摘要。约 800 字。)",
  },
  { layer: "private", contentMd: "(待撰写:仅完整版分发。)" },
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
  for (const item of holdingSeed) {
    const rows = await db
      .select({ id: holdings.id })
      .from(holdings)
      .where(and(eq(holdings.symbol, item.symbol), eq(holdings.market, item.market)))
      .limit(1);
    const values = {
      name: item.name,
      positionPct: item.positionPct,
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
