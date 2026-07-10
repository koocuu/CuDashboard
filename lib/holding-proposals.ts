import { and, desc, eq, isNull, notInArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { holdingProposals, holdings, type Holding } from "@/lib/db/schema";

const marketSchema = z.enum(["cn", "us", "other"]);

export const holdingSnapshotItemSchema = z.object({
  market: marketSchema.describe("市场：cn（A股）、us（美股）或 other（黄金、债券、现金等）"),
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(48)
    .describe("稳定且唯一的代号，例如 CN-CPO、QQQ、CASH。后续月更必须沿用。"),
  name: z.string().trim().min(1).max(100).describe("页面展示名称"),
  position_pct: z
    .number()
    .finite()
    .min(0)
    .max(100)
    .describe("占总资产百分比，保留两位小数"),
  thesis_md: z.string().max(4000).optional().default("").describe("可选：持仓逻辑或备注"),
  cost_note: z.string().max(1000).optional().default("").describe("可选：成本或金额备注"),
});

export const holdingSnapshotSchema = z
  .array(holdingSnapshotItemSchema)
  .min(1)
  .max(100);

export type HoldingSnapshotItem = z.infer<typeof holdingSnapshotItemSchema>;

export function normalizeHoldingSnapshot(input: unknown): HoldingSnapshotItem[] {
  const snapshot = holdingSnapshotSchema.parse(input).map((item) => ({
    ...item,
    symbol: item.symbol.toUpperCase(),
    position_pct: Math.round(item.position_pct * 100) / 100,
  }));
  const symbols = new Set<string>();
  for (const item of snapshot) {
    const symbol = item.symbol.toUpperCase();
    if (symbols.has(symbol)) {
      throw new Error(`代号重复：${item.symbol}`);
    }
    symbols.add(symbol);
  }
  const total = snapshot.reduce((sum, item) => sum + item.position_pct, 0);
  if (total < 99.5 || total > 100.5) {
    throw new Error(`完整持仓快照合计应接近 100%，当前为 ${total.toFixed(2)}%`);
  }
  return snapshot;
}

export async function createHoldingSnapshotProposal(input: {
  snapshot: unknown;
  summary: string;
  source: "mcp" | "api";
  sourceName?: string | null;
}) {
  const snapshot = normalizeHoldingSnapshot(input.snapshot);
  const [proposal] = await db
    .insert(holdingProposals)
    .values({
      snapshot,
      summary: input.summary.trim(),
      source: input.source,
      sourceName: input.sourceName ?? null,
      status: "pending",
    })
    .returning();
  return proposal;
}

export async function listHoldingProposals() {
  return db
    .select()
    .from(holdingProposals)
    .orderBy(desc(holdingProposals.createdAt));
}

export async function getHoldingProposal(id: number) {
  const rows = await db
    .select()
    .from(holdingProposals)
    .where(eq(holdingProposals.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export function proposalSnapshot(value: unknown): HoldingSnapshotItem[] {
  return normalizeHoldingSnapshot(value);
}

export function holdingSnapshotDiff(
  current: Holding[],
  snapshot: HoldingSnapshotItem[],
) {
  const active = current.filter((holding) => holding.status === "active");
  const currentBySymbol = new Map(active.map((holding) => [holding.symbol, holding]));
  const nextSymbols = new Set(snapshot.map((item) => item.symbol));
  const lines: string[] = [];

  for (const item of snapshot) {
    const before = currentBySymbol.get(item.symbol);
    if (!before) {
      lines.push(`新增 ${item.name} ${item.position_pct.toFixed(2)}%`);
      continue;
    }
    if (
      before.positionPct !== item.position_pct ||
      before.name !== item.name ||
      before.market !== item.market
    ) {
      lines.push(
        `${item.name} ${before.positionPct.toFixed(2)}% -> ${item.position_pct.toFixed(2)}%`,
      );
    }
  }

  for (const holding of active) {
    if (!nextSymbols.has(holding.symbol)) {
      lines.push(`移出 ${holding.name} ${holding.positionPct.toFixed(2)}%`);
    }
  }

  return lines.length > 0 ? lines : ["与当前活跃持仓一致"];
}

/** 批准完整快照：未列出的活跃仓位软删除；观察池不受影响。 */
export async function applyHoldingSnapshot(snapshotInput: unknown) {
  const snapshot = normalizeHoldingSnapshot(snapshotInput);
  const symbols = snapshot.map((item) => item.symbol);
  const now = new Date();

  await db
    .update(holdings)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        eq(holdings.status, "active"),
        isNull(holdings.deletedAt),
        notInArray(holdings.symbol, symbols),
      ),
    );

  for (const item of snapshot) {
    const existing = await db
      .select({ id: holdings.id })
      .from(holdings)
      .where(eq(holdings.symbol, item.symbol))
      .orderBy(desc(holdings.id))
      .limit(1);
    const values = {
      market: item.market,
      name: item.name,
      positionPct: item.position_pct,
      thesisMd: item.thesis_md,
      costNote: item.cost_note,
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
