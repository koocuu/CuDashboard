import assert from "node:assert/strict";
import test from "node:test";
import { applyProfilePatch } from "./profile-patch";

const PROFILE = `# 私密层

## 情感复盘记录

**甲 · 2026年1月**

- 事实：甲

**乙 · 2026年2月**

- 事实：乙

## 其他敏感约定

不要改这里。
`;

test("updates one bold entry without changing surrounding sections", () => {
  const result = applyProfilePatch({
    contentMd: PROFILE,
    section: "情感复盘记录",
    operation: "update",
    anchor: "乙 · 2026年2月",
    newContentMd: "**乙 · 2026年2月**\n\n- 事实：已更新",
  });

  assert.match(result.contentMd, /\*\*甲 · 2026年1月\*\*[\s\S]*事实：甲/);
  assert.match(result.contentMd, /\*\*乙 · 2026年2月\*\*[\s\S]*事实：已更新/);
  assert.match(result.contentMd, /## 其他敏感约定\n\n不要改这里。/);
  assert.doesNotMatch(result.contentMd, /事实：乙/);
});

test("adds after an exact anchor", () => {
  const result = applyProfilePatch({
    contentMd: PROFILE,
    section: "情感复盘记录",
    operation: "add",
    anchor: "甲 · 2026年1月",
    newContentMd: "**甲乙之间 · 2026年1月**\n\n- 事实：新增",
  });

  assert.ok(
    result.contentMd.indexOf("**甲 · 2026年1月**") <
      result.contentMd.indexOf("**甲乙之间 · 2026年1月**"),
  );
  assert.ok(
    result.contentMd.indexOf("**甲乙之间 · 2026年1月**") <
      result.contentMd.indexOf("**乙 · 2026年2月**"),
  );
});

test("adds to the section end when anchor is empty", () => {
  const result = applyProfilePatch({
    contentMd: PROFILE,
    section: "情感复盘记录",
    operation: "add",
    anchor: "",
    newContentMd: "### 丙 · 2026年3月\n\n- 事实：丙",
  });

  assert.ok(
    result.contentMd.indexOf("### 丙 · 2026年3月") <
      result.contentMd.indexOf("## 其他敏感约定"),
  );
});

test("deletes only the matched entry", () => {
  const result = applyProfilePatch({
    contentMd: PROFILE,
    section: "情感复盘记录",
    operation: "delete",
    anchor: "甲 · 2026年1月",
  });

  assert.doesNotMatch(result.contentMd, /甲 · 2026年1月|事实：甲/);
  assert.match(result.contentMd, /乙 · 2026年2月/);
  assert.match(result.contentMd, /## 其他敏感约定/);
});

test("supports level-three entry headings", () => {
  const content = `## 记录\n\n### 条目 A\n\n旧内容\n\n### 条目 B\n\n保留`;
  const result = applyProfilePatch({
    contentMd: content,
    section: "记录",
    operation: "update",
    anchor: "条目 A",
    newContentMd: "### 条目 A（新）\n\n新内容",
  });

  assert.match(result.contentMd, /### 条目 A（新）\n\n新内容/);
  assert.match(result.contentMd, /### 条目 B\n\n保留/);
});

test("ignores headings and entries inside fenced code blocks", () => {
  const content = `## 记录\n\n\`\`\`md\n**伪条目**\n## 伪分区\n\`\`\`\n\n**真条目**\n正文`;
  const result = applyProfilePatch({
    contentMd: content,
    section: "记录",
    operation: "delete",
    anchor: "真条目",
  });

  assert.match(result.contentMd, /\*\*伪条目\*\*/);
  assert.doesNotMatch(result.contentMd, /\*\*真条目\*\*/);
});

test("rejects missing and ambiguous targets", () => {
  assert.throws(
    () =>
      applyProfilePatch({
        contentMd: PROFILE,
        section: "不存在",
        operation: "delete",
        anchor: "甲 · 2026年1月",
      }),
    /未找到二级标题：不存在/,
  );

  const duplicateSection = `${PROFILE}\n## 情感复盘记录\n\n**丙**\n内容`;
  assert.throws(
    () =>
      applyProfilePatch({
        contentMd: duplicateSection,
        section: "情感复盘记录",
        operation: "delete",
        anchor: "甲 · 2026年1月",
      }),
    /二级标题存在重复/,
  );

  const duplicateEntry = PROFILE.replace(
    "## 其他敏感约定",
    "**甲 · 2026年1月**\n\n重复\n\n## 其他敏感约定",
  );
  assert.throws(
    () =>
      applyProfilePatch({
        contentMd: duplicateEntry,
        section: "情感复盘记录",
        operation: "delete",
        anchor: "甲 · 2026年1月",
      }),
    /条目标题存在重复/,
  );
});

test("requires exactly one complete entry for add and update", () => {
  assert.throws(
    () =>
      applyProfilePatch({
        contentMd: PROFILE,
        section: "情感复盘记录",
        operation: "add",
        newContentMd: "没有条目标题",
      }),
    /必须以 ### 条目标题 或 \*\*条目标题\*\* 开头/,
  );

  assert.throws(
    () =>
      applyProfilePatch({
        contentMd: PROFILE,
        section: "情感复盘记录",
        operation: "add",
        newContentMd: "**丙**\n内容\n\n**丁**\n内容",
      }),
    /必须且只能包含一个可定位条目/,
  );
});
