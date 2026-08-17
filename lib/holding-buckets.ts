export const HOLDING_BUCKET_RULE =
  "holdings 的 item 必须使用固定大类桶 symbol（先调 get_holding_buckets）。同一桶内的不同基金或个股必须合并为一个 item，具体标的与金额拆分写进该 item 的 thesis_md。禁止按单只基金或个股拆分 item。桶名变动会被系统识别为「移出旧 item + 新增新 item」，产生大量假变动，掩盖真实仓位变化。桶名是代码里的白名单，与当前 holdings 行无关；pending / rejected 提案不会改白名单。需要新增桶时改 CANONICAL_HOLDING_BUCKETS，不允许通过月度提案或随手加仓隐式创建。";

export type HoldingBucket = { symbol: string; name: string; market: "cn" | "us" | "other" };

/**
 * 月度提案与 get_holding_buckets 的唯一白名单。
 * 不要从 holdings 表现活推导：批准一条拆仓提案会污染持仓表，但不能反过来改规则。
 */
export const CANONICAL_HOLDING_BUCKETS: HoldingBucket[] = [
  { symbol: "CN-CPO", name: "A股CPO", market: "cn" },
  { symbol: "CN-MEM", name: "A股存储", market: "cn" },
  { symbol: "CN-EQUIP", name: "A股半设", market: "cn" },
  { symbol: "US-SEMI", name: "美股半导体", market: "us" },
  { symbol: "US-MEM", name: "美股存储", market: "us" },
  { symbol: "QQQ", name: "QQQ", market: "us" },
  { symbol: "GOLD", name: "黄金", market: "other" },
  { symbol: "CASH", name: "现金", market: "other" },
];

export function allowedHoldingBuckets(): HoldingBucket[] {
  return CANONICAL_HOLDING_BUCKETS.map((bucket) => ({ ...bucket }));
}

export function isCanonicalHoldingSymbol(symbol: string) {
  const key = symbol.trim().toUpperCase();
  return CANONICAL_HOLDING_BUCKETS.some((bucket) => bucket.symbol === key);
}

export function formatBucketList(buckets: HoldingBucket[] = allowedHoldingBuckets()) {
  return buckets.map((bucket) => `${bucket.symbol}（${bucket.name}）`).join("、");
}

export function formatBucketSymbols(buckets: HoldingBucket[] = allowedHoldingBuckets()) {
  return buckets.map((bucket) => bucket.symbol).join(", ");
}

/**
 * 月度快照里的 symbol 必须都是白名单大类桶。
 * 未列出的旧桶视为移出（真实清仓）；列出未知 symbol 视为粒度拆分，直接拒绝。
 */
export function assertSnapshotUsesAllowedBuckets(
  snapshot: Array<{ symbol: string }>,
  buckets: HoldingBucket[] = allowedHoldingBuckets(),
) {
  const allow = new Set(buckets.map((bucket) => bucket.symbol));
  const illegal = snapshot.filter((item) => !allow.has(item.symbol.toUpperCase()));
  if (illegal.length === 0) return;
  const first = illegal[0].symbol;
  throw new Error(
    `symbol "${first}" 不在允许的桶名列表内。合法桶名：[${formatBucketSymbols(buckets)}]。请将同类产品合并到对应桶，具体标的写入 thesis_md。完整列表：${formatBucketList(buckets)}。`,
  );
}

export function holdingStructureChurn(
  holdings: Array<{ symbol: string; status: string }>,
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

export function formatBucketsMarkdown(buckets: HoldingBucket[] = allowedHoldingBuckets()) {
  const lines = [
    "# 持仓大类桶",
    "",
    "月度 `propose_monthly_investment_update` 必须用这些 symbol。同一桶内的基金/个股合并为一个 item，拆分写进 thesis_md。禁止按单只标的拆 item，也不要通过月度提案新建桶。白名单是固定列表，不随当前持仓行变化。",
    "",
  ];
  for (const bucket of buckets) {
    lines.push(`- ${bucket.symbol}（${bucket.name}）`);
  }
  return `${lines.join("\n")}\n`;
}
