import assert from "node:assert/strict";
import test from "node:test";
import {
  allowedHoldingBuckets,
  assertSnapshotUsesAllowedBuckets,
  formatBucketSymbols,
  holdingStructureChurn,
} from "./holding-buckets";

test("whitelist is the frozen eight buckets, not current holdings", () => {
  const buckets = allowedHoldingBuckets();
  assert.equal(formatBucketSymbols(buckets), "CN-CPO, CN-MEM, CN-EQUIP, US-SEMI, US-MEM, QQQ, GOLD, CASH");
  assert.doesNotThrow(() =>
    assertSnapshotUsesAllowedBuckets(
      buckets.map((bucket) => ({ symbol: bucket.symbol })),
    ),
  );
});

test("stock-level symbols are rejected with the legal list even if they are in holdings", () => {
  assert.throws(
    () => assertSnapshotUsesAllowedBuckets([{ symbol: "US-NVDA" }, { symbol: "CASH" }]),
    /symbol "US-NVDA" 不在允许的桶名列表内[\s\S]*CN-CPO, CN-MEM, CN-EQUIP, US-SEMI, US-MEM, QQQ, GOLD, CASH/,
  );
  assert.throws(
    () => assertSnapshotUsesAllowedBuckets([{ symbol: "A-CPO" }, { symbol: "CASH" }]),
    /symbol "A-CPO" 不在允许的桶名列表内/,
  );
});

test("structure churn counts adds and removes", () => {
  const current = [
    { symbol: "CN-CPO", status: "active" },
    { symbol: "CN-MEM", status: "active" },
    { symbol: "CASH", status: "active" },
  ];
  const churn = holdingStructureChurn(current, [{ symbol: "CN-CPO" }, { symbol: "GOLD" }]);
  assert.equal(churn.added, 1);
  assert.equal(churn.removed, 2);
  assert.equal(churn.total, 3);
});
