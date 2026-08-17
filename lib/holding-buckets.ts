import type { Holding } from "@/lib/db/schema";

export const HOLDING_BUCKET_RULE =
  "holdings 的 item 必须使用当前生效的大类桶 symbol（先调 get_holding_buckets）。同一桶内的不同基金或个股必须合并为一个 item，具体标的与金额拆分写进该 item 的 thesis_md。禁止按单只基金或个股拆分 item。桶名变动会被系统识别为「移出旧 item + 新增新 item」，产生大量假变动，掩盖真实仓位变化。桶名一经确定不得逐月改写。需要新增桶时先在 dashboard 投资页手动建仓，不允许通过月度提案隐式创建。";

export type HoldingBucket = { symbol: string; name: string };

/** 当前生效的大类桶 = 未删除的活跃持仓。月度提案不得隐式新建桶。 */
export function allowedHoldingBuckets(holdings: Holding[]): HoldingBucket[] {
  return holdings
    .filter((row) => row.status === "active")
    .map((row) => ({
      symbol: row.symbol.toUpperCase(),
      name: row.name,
    }));
}

export function formatBucketList(buckets: HoldingBucket[]) {
  return buckets.map((bucket) => `${bucket.symbol}（${bucket.name}）`).join("、");
}

export function formatBucketSymbols(buckets: HoldingBucket[]) {
  return buckets.map((bucket) => bucket.symbol).join(", ");
}

/**
 * 月度快照里的 symbol 必须都是已有大类桶。
 * 未列出的旧桶视为移出（真实清仓）；列出未知 symbol 视为粒度拆分，直接拒绝。
 */
export function assertSnapshotUsesAllowedBuckets(
  snapshot: Array<{ symbol: string }>,
  buckets: HoldingBucket[],
) {
  if (buckets.length === 0) return;
  const allow = new Set(buckets.map((bucket) => bucket.symbol));
  const illegal = snapshot.filter((item) => !allow.has(item.symbol.toUpperCase()));
  if (illegal.length === 0) return;
  const first = illegal[0].symbol;
  throw new Error(
    `symbol "${first}" 不在允许的桶名列表内。合法桶名：[${formatBucketSymbols(buckets)}]。请将同类产品合并到对应桶，具体标的写入 thesis_md。完整列表：${formatBucketList(buckets)}。`,
  );
}

export function holdingStructureChurn(
  holdings: Holding[],
  snapshot: Array<{ symbol: string }>,
) {
  const current = new Set(
    holdings
      .filter((row) => row.status === "active")
      .map((row) => row.symbol.toUpperCase()),
  );
  const next = new Set(snapshot.map((item) => item.symbol.toUpperCase()));
  let added = 0;
  let removed = 0;
  for (const symbol of next) {
    if (!current.has(symbol)) added += 1;
  }
  for (const symbol of current) {
    if (!next.has(symbol)) removed += 1;
  }
  return { added, removed, total: added + removed };
}

export function formatBucketsMarkdown(buckets: HoldingBucket[]) {
  if (buckets.length === 0) {
    return "当前没有活跃持仓桶。请先在 dashboard 投资页建仓，再提交月度提案。";
  }
  const lines = [
    "# 持仓大类桶",
    "",
    "月度 `propose_monthly_investment_update` 必须用这些 symbol。同一桶内的基金/个股合并为一个 item，拆分写进 thesis_md。禁止按单只标的拆 item，也不要通过月度提案新建桶。",
    "",
  ];
  for (const bucket of buckets) {
    lines.push(`- ${bucket.symbol}（${bucket.name}）`);
  }
  return `${lines.join("\n")}\n`;
}
