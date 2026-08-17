import { CANONICAL_HOLDING_BUCKETS } from "@/lib/holding-buckets";

/** 2026-08 被拆开的单只标的 → 大类桶。canonical symbol 映射到自身，脚本可重跑。 */
export const SOURCE_TO_BUCKET: Record<string, string> = {
  "CN-CPO-YYKJ": "CN-CPO",
  "HK-03308": "CN-CPO",
  "CN-MEM-YYXF": "CN-MEM",
  "CN-SEMIEQ-DF": "CN-EQUIP",
  "US-NVDA": "US-SEMI",
  "US-SMH": "US-SEMI",
  "US-SOXX": "US-SEMI",
  "US-MU": "US-MEM",
  "US-DRAM": "US-MEM",
  "US-SNDK": "US-MEM",
  "CN-QQQ-GF": "QQQ",
  "CN-QQQ-NF": "QQQ",
  "CN-QQQ-JS": "QQQ",
  "CN-QQQ-MG": "QQQ",
  "CN-CPO": "CN-CPO",
  "CN-MEM": "CN-MEM",
  "CN-EQUIP": "CN-EQUIP",
  "US-SEMI": "US-SEMI",
  "US-MEM": "US-MEM",
  QQQ: "QQQ",
  GOLD: "GOLD",
  CASH: "CASH",
};

export const MERGE_EXPECTED_TOTAL_CNY = 788612;

export type MergeSourceHolding = {
  symbol: string;
  name: string;
  amountCny: number;
  status: string;
  deletedAt: Date | null;
};

export type MergedBucket = {
  symbol: string;
  name: string;
  market: "cn" | "us" | "other";
  amountCny: number;
  thesisMd: string;
  keepUnchanged: boolean;
};

function money(value: number) {
  return `¥${Math.round(value).toLocaleString("zh-CN")}`;
}

export function planHoldingBucketMerge(
  rows: MergeSourceHolding[],
  expectedTotal = MERGE_EXPECTED_TOTAL_CNY,
): { buckets: MergedBucket[]; total: number } {
  const active = rows.filter((row) => row.status === "active" && row.deletedAt == null);
  const grouped = new Map<string, MergeSourceHolding[]>();

  for (const row of active) {
    const symbol = row.symbol.trim().toUpperCase();
    const target = SOURCE_TO_BUCKET[symbol];
    if (!target) {
      throw new Error(
        `未映射的活跃 symbol "${row.symbol}"。合并前请确认它是否应并入大类桶，或先软删除。`,
      );
    }
    const list = grouped.get(target) ?? [];
    list.push({ ...row, symbol });
    grouped.set(target, list);
  }

  const buckets: MergedBucket[] = CANONICAL_HOLDING_BUCKETS.map((meta) => {
    const sources = grouped.get(meta.symbol) ?? [];
    if (sources.length === 0) {
      throw new Error(`合并结果缺少桶 ${meta.symbol}（${meta.name}）`);
    }
    const amountCny =
      Math.round(sources.reduce((sum, item) => sum + Number(item.amountCny), 0) * 100) / 100;
    const keepUnchanged = sources.length === 1 && sources[0].symbol === meta.symbol;
    const thesisMd = keepUnchanged
      ? ""
      : sources.map((item) => `${item.name} ${money(item.amountCny)}`).join("\n");
    return {
      symbol: meta.symbol,
      name: keepUnchanged ? sources[0].name : meta.name,
      market: meta.market,
      amountCny,
      thesisMd,
      keepUnchanged,
    };
  });

  const extra = [...grouped.keys()].filter(
    (symbol) => !CANONICAL_HOLDING_BUCKETS.some((bucket) => bucket.symbol === symbol),
  );
  if (extra.length > 0) {
    throw new Error(`映射到了白名单之外的桶：${extra.join(", ")}`);
  }

  const total = Math.round(buckets.reduce((sum, item) => sum + item.amountCny, 0) * 100) / 100;
  if (total !== expectedTotal) {
    throw new Error(`合并后总资产为 ${total}，期望 ${expectedTotal}，已中止不写库。`);
  }
  return { buckets, total };
}
