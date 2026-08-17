import assert from "node:assert/strict";
import test from "node:test";
import {
  extractInternalStatusForDashboard,
  extractPublicStatusForWebsite,
  parseNowFrontmatter,
  statusContentForNow,
} from "./status-sections";

const STATUS = `## 内部状态

**主线**: 建设转入使用。

**投资**: 不做叙事驱动调仓。

## 公开状态

---
season: 2026 夏
headline: 让个人系统稳定产出，而不是继续加零件
---

## 在做

控制台转入日常使用。

## 在写

两个公众号在持续更新。
`;

test("public section keeps nested ## 在做 / 在写", () => {
  const pub = extractPublicStatusForWebsite(STATUS);
  assert.match(pub, /headline: 让个人系统稳定产出/);
  assert.match(pub, /## 在做/);
  assert.match(pub, /控制台转入日常使用/);
  assert.match(pub, /## 在写/);
  assert.doesNotMatch(pub, /\*\*主线\*\*/);
});

test("internal section stops before 公开状态", () => {
  const internal = extractInternalStatusForDashboard(STATUS);
  assert.match(internal, /\*\*主线\*\*/);
  assert.match(internal, /\*\*投资\*\*/);
  assert.doesNotMatch(internal, /## 在做/);
  assert.doesNotMatch(internal, /headline:/);
});

test("parseNowFrontmatter splits headline from body", () => {
  const pub = extractPublicStatusForWebsite(STATUS);
  const parsed = parseNowFrontmatter(pub);
  assert.equal(parsed.season, "2026 夏");
  assert.equal(parsed.headline, "让个人系统稳定产出，而不是继续加零件");
  assert.match(parsed.body, /^## 在做/m);
  assert.match(parsed.body, /## 在写/);
});

test("statusContentForNow prefers 公开状态 and does not leak 内部状态", () => {
  const now = statusContentForNow(STATUS);
  assert.match(now, /## 在做/);
  assert.doesNotMatch(now, /\*\*主线\*\*/);
});

test("statusContentForNow uses the whole layer when there is no split", () => {
  const single = `---\nseason: 2026 夏\n---\n\n## 在做\n\n推进一个 SDK。\n`;
  const now = statusContentForNow(single);
  assert.match(now, /推进一个 SDK/);
});

test("statusContentForNow stays empty if only 内部状态 exists", () => {
  const onlyInternal = `## 内部状态\n\n**主线**: 别上网站。\n`;
  assert.equal(statusContentForNow(onlyInternal), "");
});
