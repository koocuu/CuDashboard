export const PROFILE_PATCH_OPERATIONS = ["add", "update", "delete"] as const;
export type ProfilePatchOperation = (typeof PROFILE_PATCH_OPERATIONS)[number];

interface MarkdownLine {
  text: string;
  start: number;
  end: number;
}

interface MarkdownHeading {
  level: number;
  title: string;
  line: MarkdownLine;
}

interface EntryMarker {
  title: string;
  line: MarkdownLine;
}

interface MarkdownScan {
  headings: MarkdownHeading[];
  entries: EntryMarker[];
}

export interface ProfilePatchInput {
  contentMd: string;
  section: string;
  operation: ProfilePatchOperation;
  anchor?: string;
  newContentMd?: string;
}

export interface ProfilePatchResult {
  contentMd: string;
  section: string;
  entryTitle: string;
}

function indexedLines(text: string): MarkdownLine[] {
  const rawLines = text.split("\n");
  let offset = 0;
  return rawLines.map((line, index) => {
    const hasNewline = index < rawLines.length - 1;
    const result = {
      text: line,
      start: offset,
      end: offset + line.length + (hasNewline ? 1 : 0),
    };
    offset = result.end;
    return result;
  });
}

function headingFromLine(line: MarkdownLine): MarkdownHeading | null {
  const match = line.text.match(/^[ ]{0,3}(#{1,6})[ \t]+(.+?)[ \t]*$/);
  if (!match) return null;
  const title = match[2].replace(/[ \t]+#+[ \t]*$/, "").trim();
  if (!title) return null;
  return { level: match[1].length, title, line };
}

function unwrapTitle(value: string): string {
  let title = value.trim();
  title = title.replace(/^[ ]{0,3}#{2,3}[ \t]+/, "").trim();
  const bold = title.match(/^\*\*(.+)\*\*$/);
  if (bold && !bold[1].includes("**")) title = bold[1].trim();
  return title;
}

function boldEntryFromLine(line: MarkdownLine): EntryMarker | null {
  const match = line.text.match(
    /^[ ]{0,3}\*\*(.+?)\*\*(?:[ \t]*[:：][ \t]*.*)?[ \t]*$/,
  );
  if (!match || match[1].includes("**")) return null;
  const title = match[1].trim();
  return title ? { title, line } : null;
}

function scanMarkdown(text: string): MarkdownScan {
  const headings: MarkdownHeading[] = [];
  const entries: EntryMarker[] = [];
  let fence: { marker: "`" | "~"; length: number } | null = null;

  for (const line of indexedLines(text)) {
    const trimmed = line.text.trimStart();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);

    if (fence) {
      if (
        fenceMatch &&
        fenceMatch[1][0] === fence.marker &&
        fenceMatch[1].length >= fence.length &&
        trimmed.slice(fenceMatch[1].length).trim() === ""
      ) {
        fence = null;
      }
      continue;
    }

    if (fenceMatch) {
      fence = {
        marker: fenceMatch[1][0] as "`" | "~",
        length: fenceMatch[1].length,
      };
      continue;
    }

    const heading = headingFromLine(line);
    if (heading) {
      headings.push(heading);
      if (heading.level === 3) {
        entries.push({ title: unwrapTitle(heading.title), line });
      }
      continue;
    }

    const boldEntry = boldEntryFromLine(line);
    if (boldEntry) entries.push(boldEntry);
  }

  return { headings, entries };
}

function requireSingleMatch<T>(
  matches: T[],
  missingMessage: string,
  ambiguousMessage: string,
): T {
  if (matches.length === 0) throw new Error(missingMessage);
  if (matches.length > 1) throw new Error(ambiguousMessage);
  return matches[0];
}

function validateNewEntry(raw: string | undefined, operation: ProfilePatchOperation) {
  if (operation === "delete") return null;
  const content = raw?.replace(/\r\n/g, "\n").trim();
  if (!content) {
    throw new Error(`${operation === "add" ? "新增" : "修改"}条目时 new_content_md 不能为空`);
  }

  const scan = scanMarkdown(content);
  if (scan.headings.some((heading) => heading.level <= 2)) {
    throw new Error("new_content_md 只能包含单个条目，不能包含一级或二级标题");
  }

  const firstContentOffset = indexedLines(content).find(
    (line) => line.text.trim().length > 0,
  )?.start;
  const firstEntry = scan.entries[0];
  if (!firstEntry || firstEntry.line.start !== firstContentOffset) {
    throw new Error(
      "new_content_md 必须以 ### 条目标题、**条目标题** 或 **条目标题**: 正文开头",
    );
  }
  if (scan.entries.length !== 1) {
    throw new Error("new_content_md 必须且只能包含一个可定位条目");
  }

  return { content, title: firstEntry.title };
}

function contentEndBeforeWhitespace(text: string, start: number, end: number) {
  const segment = text.slice(start, end);
  const trailing = segment.match(/\s+$/)?.[0] ?? "";
  return end - trailing.length;
}

function insertEntry(text: string, index: number, entry: string) {
  const before = text.slice(0, index);
  const after = text.slice(index);
  const beforeSeparator = before.endsWith("\n\n")
    ? ""
    : before.endsWith("\n")
      ? "\n"
      : "\n\n";
  const afterSeparator = !after || after.startsWith("\n") ? "" : "\n\n";
  return `${before}${beforeSeparator}${entry}${afterSeparator}${after}`;
}

export function applyProfilePatch(input: ProfilePatchInput): ProfilePatchResult {
  const text = input.contentMd.replace(/\r\n/g, "\n");
  const sectionTitle = unwrapTitle(input.section);
  if (!sectionTitle) throw new Error("section 不能为空");

  const scan = scanMarkdown(text);
  const section = requireSingleMatch(
    scan.headings.filter(
      (heading) => heading.level === 2 && heading.title === sectionTitle,
    ),
    `未找到二级标题：${sectionTitle}`,
    `二级标题存在重复，无法确定目标：${sectionTitle}`,
  );
  const sectionEnd =
    scan.headings.find(
      (heading) =>
        heading.line.start > section.line.start && heading.level <= 2,
    )?.line.start ?? text.length;
  const sectionEntries = scan.entries.filter(
    (entry) =>
      entry.line.start >= section.line.end && entry.line.start < sectionEnd,
  );
  const newEntry = validateNewEntry(input.newContentMd, input.operation);
  const anchorTitle = unwrapTitle(input.anchor ?? "");

  if (input.operation === "add" && !anchorTitle) {
    const insertAt = contentEndBeforeWhitespace(text, section.line.end, sectionEnd);
    return {
      contentMd: insertEntry(text, insertAt, newEntry!.content),
      section: sectionTitle,
      entryTitle: newEntry!.title,
    };
  }

  if (!anchorTitle) {
    throw new Error(`${input.operation} 操作必须提供 anchor`);
  }

  const target = requireSingleMatch(
    sectionEntries.filter((entry) => entry.title === anchorTitle),
    `未找到条目：${anchorTitle}`,
    `条目标题存在重复，无法确定目标：${anchorTitle}`,
  );
  const targetIndex = sectionEntries.indexOf(target);
  const targetEnd = sectionEntries[targetIndex + 1]?.line.start ?? sectionEnd;
  const targetContentEnd = contentEndBeforeWhitespace(
    text,
    target.line.start,
    targetEnd,
  );

  if (input.operation === "add") {
    return {
      contentMd: insertEntry(text, targetContentEnd, newEntry!.content),
      section: sectionTitle,
      entryTitle: newEntry!.title,
    };
  }

  if (input.operation === "delete") {
    return {
      contentMd: text.slice(0, target.line.start) + text.slice(targetEnd),
      section: sectionTitle,
      entryTitle: target.title,
    };
  }

  const trailingWhitespace = text.slice(targetContentEnd, targetEnd);
  return {
    contentMd:
      text.slice(0, target.line.start) +
      newEntry!.content +
      trailingWhitespace +
      text.slice(targetEnd),
    section: sectionTitle,
    entryTitle: newEntry!.title,
  };
}
