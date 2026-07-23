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

test("supports inline bold-label entries used by the investing layer", () => {
  const content = `## 已知行为弱点(重要)\n\n这里先有一段普通说明。\n\n**旧教训**: 旧内容\n\n## 下一节\n\n保留`;
  const added = applyProfilePatch({
    contentMd: content,
    section: "已知行为弱点(重要)",
    operation: "add",
    anchor: "",
    newContentMd: "**低beta资产的价值**: 第一次补充",
  });
  const updated = applyProfilePatch({
    contentMd: added.contentMd,
    section: "已知行为弱点(重要)",
    operation: "update",
    anchor: "低beta资产的价值",
    newContentMd: "**低beta资产的价值**：第二次累计修改",
  });

  assert.match(updated.contentMd, /\*\*旧教训\*\*: 旧内容/);
  assert.match(
    updated.contentMd,
    /\*\*低beta资产的价值\*\*：第二次累计修改/,
  );
  assert.doesNotMatch(updated.contentMd, /第一次补充/);
  assert.match(updated.contentMd, /## 下一节\n\n保留/);
});

test("matches the complete title instead of a similar prefix", () => {
  const content = `## 记录\n\n**近期**\n\n短标题内容\n\n**近期状态**\n\n长标题内容`;
  const result = applyProfilePatch({
    contentMd: content,
    section: "记录",
    operation: "update",
    anchor: "近期",
    newContentMd: "**近期**\n\n只修改精确匹配项",
  });

  assert.match(result.contentMd, /\*\*近期\*\*\n\n只修改精确匹配项/);
  assert.match(result.contentMd, /\*\*近期状态\*\*\n\n长标题内容/);
  assert.throws(
    () =>
      applyProfilePatch({
        contentMd: content,
        section: "记录",
        operation: "delete",
        anchor: "近期状",
      }),
    /未找到条目：近期状/,
  );
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
    /必须以 ### 条目标题/,
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

test("replace_section replaces the whole section and leaves others intact", () => {
  const result = applyProfilePatch({
    contentMd: PROFILE,
    section: "情感复盘记录",
    operation: "replace_section",
    newContentMd:
      "## 情感复盘记录\n\n**全新条目 · 2026年7月**\n\n- 事实：整节已换",
  });

  assert.match(result.contentMd, /## 情感复盘记录\n\n\*\*全新条目 · 2026年7月\*\*/);
  assert.doesNotMatch(result.contentMd, /甲 · 2026年1月|乙 · 2026年2月/);
  assert.match(result.contentMd, /## 其他敏感约定\n\n不要改这里。/);
  assert.equal(result.entryTitle, "情感复盘记录");
});

test("replace_section appends when the section does not exist", () => {
  const result = applyProfilePatch({
    contentMd: PROFILE,
    section: "风格库",
    operation: "replace_section",
    newContentMd: "## 风格库\n\n- 短句优先\n- 少用形容词",
  });

  assert.ok(
    result.contentMd.indexOf("## 其他敏感约定") <
      result.contentMd.indexOf("## 风格库"),
  );
  assert.match(result.contentMd, /## 风格库\n\n- 短句优先/);
});

test("replace_section rejects mismatched or multi h2 payloads", () => {
  assert.throws(
    () =>
      applyProfilePatch({
        contentMd: PROFILE,
        section: "情感复盘记录",
        operation: "replace_section",
        newContentMd: "## 别的标题\n\n正文",
      }),
    /与 section「情感复盘记录」不一致/,
  );

  assert.throws(
    () =>
      applyProfilePatch({
        contentMd: PROFILE,
        section: "情感复盘记录",
        operation: "replace_section",
        newContentMd: "## 情感复盘记录\n\n正文\n\n## 另一个\n\n更多",
      }),
    /只能包含一个二级标题/,
  );
});
