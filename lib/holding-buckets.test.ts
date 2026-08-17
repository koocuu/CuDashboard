import assert from "node:assert/strict";
import test from "node:test";
import type { Holding } from "@/lib/db/schema";
import {
  allowedHoldingBuckets,
  assertSnapshotUsesAllowedBuckets,
  holdingStructureChurn,
} from "./holding-buckets";

function holding(symbol: string, name: string): Holding {
  return {
    id: 1,
    market: "cn",
    symbol,
    name,
    amountCny: 1,
    positionPct: 0,
    costNote: "",
    thesisMd: "",
    status: "active",
    watchPriceNote: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

const current = [
  holding("CN-CPO", "A股CPO"),
  holding("CN-MEM", "A股存储"),
  holding("CASH", "现金"),
];

test("eight-bucket style snapshot passes", () => {
  const buckets = allowedHoldingBuckets(current);
  assert.doesNotThrow(() =>
    assertSnapshotUsesAllowedBuckets(
      [
        { symbol: "CN-CPO" },
        { symbol: "CN-MEM" },
        { symbol: "CASH" },
      ],
      buckets,
    ),
  );
});

test("stock-level symbols are rejected with the legal list", () => {
  const buckets = allowedHoldingBuckets(current);
  assert.throws(
    () => assertSnapshotUsesAllowedBuckets([{ symbol: "US-NVDA" }, { symbol: "CASH" }], buckets),
    /symbol "US-NVDA" 不在允许的桶名列表内[\s\S]*CN-CPO, CN-MEM, CASH/,
  );
});

test("structure churn counts adds and removes", () => {
  const churn = holdingStructureChurn(current, [
    { symbol: "CN-CPO" },
    { symbol: "GOLD" },
  ]);
  assert.equal(churn.added, 1);
  assert.equal(churn.removed, 2);
  assert.equal(churn.total, 3);
});
