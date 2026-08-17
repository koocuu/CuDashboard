import assert from "node:assert/strict";
import test from "node:test";
import { describeNowMerge, mergeNowRevision } from "./now-revision";

const CURRENT = `---
season: 2026 夏
headline: 让个人系统稳定产出，而不是继续加零件
sync_test: v2
---

## 在做

个人控制台系统已经竣工并转入日常使用。

## 在写

两个公众号在持续更新。

## 在想

一个人加上 AI，能把“从想法到上线”压缩到什么程度。
`;

test("missing sections stay on the current draft", () => {
  const proposed = `---
season: 2026 夏
headline: 把一个人加 AI 的流程，从能跑通做到不会跑歪
---

## 在做

个人控制台 Console 已经从“建完了”进入“天天在用”。
`;
  const merged = mergeNowRevision(CURRENT, proposed);
  assert.match(merged, /headline: 把一个人加 AI 的流程/);
  assert.match(merged, /天天在用/);
  assert.doesNotMatch(merged, /已经竣工并转入日常使用/);
  assert.match(merged, /## 在写/);
  assert.match(merged, /两个公众号在持续更新/);
  assert.match(merged, /## 在想/);
  assert.match(merged, /从想法到上线/);
  assert.match(merged, /sync_test: v2/);

  const note = describeNowMerge(CURRENT, proposed);
  assert.deepEqual(note.replaced, ["在做"]);
  assert.deepEqual(note.kept, ["在写", "在想"]);
  assert.deepEqual(note.cleared, []);
  assert.deepEqual(note.added, []);
});

test("an explicit empty heading removes that section", () => {
  const proposed = `## 在做

还在用控制台。

## 在写
`;
  const merged = mergeNowRevision(CURRENT, proposed);
  assert.match(merged, /还在用控制台/);
  assert.doesNotMatch(merged, /## 在写/);
  assert.match(merged, /## 在想/);
  const note = describeNowMerge(CURRENT, proposed);
  assert.deepEqual(note.cleared, ["在写"]);
  assert.deepEqual(note.kept, ["在想"]);
});

test("rewriting all three sections replaces the whole page", () => {
  const proposed = `---
season: 2026 秋
headline: 新的一句
---

## 在做

新的在做。

## 在写

新的在写。

## 在想

新的在想。
`;
  const merged = mergeNowRevision(CURRENT, proposed);
  assert.match(merged, /season: 2026 秋/);
  assert.match(merged, /新的在做/);
  assert.match(merged, /新的在写/);
  assert.match(merged, /新的在想/);
  assert.doesNotMatch(merged, /两个公众号/);
});
