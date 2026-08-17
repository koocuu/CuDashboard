import assert from "node:assert/strict";
import test from "node:test";
import { planHoldingBucketMerge } from "./holding-bucket-merge";

function row(symbol: string, name: string, amountCny: number) {
  return { symbol, name, amountCny, status: "active" as const, deletedAt: null };
}

const split16 = [
  row("CN-CPO-YYKJ", "永赢科技智选混合发起C", 204678),
  row("HK-03308", "中际旭创(港股 03308)", 44300),
  row("CN-MEM-YYXF", "永赢先锋半导体智选混合发起C", 96947),
  row("CN-SEMIEQ-DF", "东方人工智能主题混合", 90579),
  row("US-NVDA", "英伟达 NVDA", 47100),
  row("US-SMH", "SMH 半导体ETF", 27500),
  row("US-SOXX", "SOXX 费城半导体ETF", 14700),
  row("US-MU", "美光 MU", 23700),
  row("US-DRAM", "Roundhill Memory ETF (DRAM,两账户合计)", 29000),
  row("US-SNDK", "闪迪 SNDK", 1600),
  row("CN-QQQ-GF", "广发纳斯达克100ETF联接", 38056),
  row("CN-QQQ-JS", "景顺长城纳斯达克科技", 18135),
  row("CN-QQQ-NF", "南方纳斯达克100(QDII)", 26808),
  row("CN-QQQ-MG", "摩根纳斯达克100(QDII)A", 409),
  row("GOLD", "黄金", 28000),
  row("CASH", "现金/货基(含券商可用余额)", 97100),
];

test("16 stock-level rows merge to 8 buckets totaling 788612", () => {
  const { buckets, total } = planHoldingBucketMerge(split16);
  assert.equal(total, 788612);
  const bySymbol = Object.fromEntries(buckets.map((item) => [item.symbol, item]));
  assert.equal(bySymbol["CN-CPO"].amountCny, 248978);
  assert.equal(bySymbol["CN-MEM"].amountCny, 96947);
  assert.equal(bySymbol["CN-EQUIP"].amountCny, 90579);
  assert.equal(bySymbol["US-SEMI"].amountCny, 89300);
  assert.equal(bySymbol["US-MEM"].amountCny, 54300);
  assert.equal(bySymbol["QQQ"].amountCny, 83408);
  assert.equal(bySymbol.GOLD.amountCny, 28000);
  assert.equal(bySymbol.CASH.amountCny, 97100);
  assert.equal(bySymbol.GOLD.keepUnchanged, true);
  assert.equal(bySymbol.CASH.keepUnchanged, true);
  assert.equal(bySymbol.CASH.name, "现金/货基(含券商可用余额)");
  assert.match(bySymbol["CN-CPO"].thesisMd, /永赢科技智选/);
  assert.match(bySymbol["CN-CPO"].thesisMd, /中际旭创/);
});

test("wrong total aborts before writes", () => {
  assert.throws(
    () => planHoldingBucketMerge([{ ...split16[0], amountCny: 1 }, ...split16.slice(1)]),
    /已中止不写库/,
  );
});

test("unmapped active symbol aborts", () => {
  assert.throws(
    () => planHoldingBucketMerge([...split16, row("BOND", "债券", 1)]),
    /未映射的活跃 symbol "BOND"/,
  );
});
