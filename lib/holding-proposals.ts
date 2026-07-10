import { and, desc, eq, isNull, notInArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { holdingProposals, holdings, type Holding } from "@/lib/db/schema";
import {
  monthlyReviewDataSchema,
  type MonthlyReviewData,
} from "@/lib/invest-review-template";

export const holdingSnapshotItemSchema = z.object({
  market: z.enum(["cn", "us", "other"]).describe("cn=A股，us=美股，other=黄金/债券/现金等"),
  symbol: z.string().trim().min(1).max(48).describe("稳定唯一代号，月更时必须沿用，例如 CN-CPO、US-MEM、CASH"),
  name: z.string().trim().min(1).max(100).describe("页面展示名称，可随提案修改"),
  amount_cny: z.number().finite().min(0).describe("当前折人民币金额，不传比例"),
  thesis_md: z.string().max(4000).optional().default("").describe("可选：持仓逻辑"),
  cost_note: z.string().max(1000).optional().default("").describe("可选：金额或成本备注"),
});

export const holdingSnapshotSchema = z.array(holdingSnapshotItemSchema).min(1).max(100);
export type HoldingSnapshotItem = z.infer<typeof holdingSnapshotItemSchema>;

export function normalizeHoldingSnapshot(input: unknown): HoldingSnapshotItem[] {
  const snapshot = holdingSnapshotSchema.parse(input).map((item) => ({
    ...item,
    symbol: item.symbol.toUpperCase(),
    amount_cny: Math.round(item.amount_cny * 100) / 100,
  }));
  const symbols = new Set<string>();
  for (const item of snapshot) {
    if (symbols.has(item.symbol)) throw new Error(`代号重复：${item.symbol}`);
    symbols.add(item.symbol);
  }
  if (!symbols.has("CASH")) {
    throw new Error("完整持仓必须包含 symbol=CASH 的现金/余额项");
  }
  const total = snapshot.reduce((sum, item) => sum + item.amount_cny, 0);
  if (total <= 0) throw new Error("总资产金额必须大于 0");
  return snapshot;
}

export async function createMonthlyInvestmentProposal(input: {
  month: string;
  snapshot: unknown;
  reviewData: unknown;
  sourceName?: string | null;
}) {
  if (!/^\d{4}-\d{2}$/.test(input.month)) throw new Error("月份格式必须为 YYYY-MM");
  const snapshot = normalizeHoldingSnapshot(input.snapshot);
  const reviewData = monthlyReviewDataSchema.parse(input.reviewData);
  const [proposal] = await db
    .insert(holdingProposals)
    .values({
      snapshot,
      month: input.month,
      reviewData,
      summary: `${input.month} 月度审计与持仓更新`,
      source: "mcp",
      sourceName: input.sourceName ?? null,
      status: "pending",
    })
    .returning();
  return proposal;
}

export async function listHoldingProposals() {
  return db.select().from(holdingProposals).orderBy(desc(holdingProposals.createdAt));
}

export async function getHoldingProposal(id: number) {
  const rows = await db
    .select()
    .from(holdingProposals)
    .where(eq(holdingProposals.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export function proposalSnapshot(value: unknown) {
  return normalizeHoldingSnapshot(value);
}

export function proposalReviewData(value: unknown): MonthlyReviewData {
  return monthlyReviewDataSchema.parse(value);
}

function money(value: number) {
  return `¥${Math.round(value).toLocaleString("zh-CN")}`;
}

export function holdingSnapshotDiff(current: Holding[], snapshot: HoldingSnapshotItem[]) {
  const active = current.filter((holding) => holding.status === "active");
  const currentTotal = active.reduce((sum, holding) => sum + holding.amountCny, 0);
  const nextTotal = snapshot.reduce((sum, item) => sum + item.amount_cny, 0);
  const currentBySymbol = new Map(active.map((holding) => [holding.symbol, holding]));
  const nextSymbols = new Set(snapshot.map((item) => item.symbol));
  const lines: string[] = [];

  for (const item of snapshot) {
    const before = currentBySymbol.get(item.symbol);
    const nextPct = nextTotal > 0 ? (item.amount_cny / nextTotal) * 100 : 0;
    if (!before) {
      lines.push(`新增 ${item.name} ${money(item.amount_cny)}（${nextPct.toFixed(2)}%）`);
      continue;
    }
    if (before.amountCny !== item.amount_cny || before.name !== item.name || before.market !== item.market) {
      const beforePct = currentTotal > 0 ? (before.amountCny / currentTotal) * 100 : 0;
      lines.push(
        `${before.name} ${money(before.amountCny)} -> ${item.name} ${money(item.amount_cny)}（${beforePct.toFixed(2)}% -> ${nextPct.toFixed(2)}%）`,
      );
    }
  }
  for (const holding of active) {
    if (!nextSymbols.has(holding.symbol)) lines.push(`移出 ${holding.name} ${money(holding.amountCny)}`);
  }
  lines.unshift(`总资产 ${money(currentTotal)} -> ${money(nextTotal)}`);
  return lines;
}

/** 批准完整金额快照：未列出的活跃仓位软删除；观察池不受影响。 */
export async function applyHoldingSnapshot(snapshotInput: unknown) {
  const snapshot = normalizeHoldingSnapshot(snapshotInput);
  const symbols = snapshot.map((item) => item.symbol);
  const total = snapshot.reduce((sum, item) => sum + item.amount_cny, 0);
  const now = new Date();

  await db
    .update(holdings)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(holdings.status, "active"), isNull(holdings.deletedAt), notInArray(holdings.symbol, symbols)));

  for (const item of snapshot) {
    const existing = await db
      .select()
      .from(holdings)
      .where(eq(holdings.symbol, item.symbol))
      .orderBy(desc(holdings.id))
      .limit(1);
    const values = {
      market: item.market,
      name: item.name,
      amountCny: item.amount_cny,
      positionPct: Math.round((item.amount_cny / total) * 10000) / 100,
      thesisMd: item.thesis_md || existing[0]?.thesisMd || "",
      costNote: item.cost_note || existing[0]?.costNote || "",
      status: "active",
      watchPriceNote: "",
      deletedAt: null,
      updatedAt: now,
    } as const;
    if (existing[0]) {
      await db.update(holdings).set(values).where(eq(holdings.id, existing[0].id));
    } else {
      await db.insert(holdings).values({ symbol: item.symbol, ...values });
    }
  }
}
