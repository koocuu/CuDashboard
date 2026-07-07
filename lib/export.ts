import { db } from "@/lib/db";
import {
  workItems,
  holdings,
  entries,
  profileDoc,
} from "@/lib/db/schema";

export interface MarkdownFile {
  path: string;
  content: string;
}

function fm(v: unknown): string {
  if (v === null || v === undefined) return '""';
  if (v instanceof Date) return `"${v.toISOString()}"`;
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === "object") return JSON.stringify(v);
  return JSON.stringify(v);
}

function record(fields: Record<string, unknown>, body: string): string {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fields)) lines.push(`${k}: ${fm(v)}`);
  lines.push("---", "", body || "", "");
  return lines.join("\n");
}

function safePart(v: unknown): string {
  const raw = String(v ?? "item").trim() || "item";
  return raw
    .replace(/[\\/:*?"<>|#%{}]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 48);
}

function addSection(
  files: MarkdownFile[],
  dir: string,
  title: string,
  kind: string,
  rows: Array<Record<string, unknown>>,
  bodyKey: string,
  nameKey: string,
) {
  files.push({
    path: `${dir}/_index.md`,
    content: [
      `# ${title}`,
      "",
      `生成于 ${new Date().toISOString()}`,
      `共 ${rows.length} 条。`,
      "",
      ...rows.map((r) => `- ${r.id ?? ""} ${String(r[nameKey] ?? "").trim()}`),
      "",
    ].join("\n"),
  });

  for (const r of rows) {
    const { [bodyKey]: body, ...rest } = r;
    const id = r.id ?? "new";
    const label = safePart(r[nameKey] ?? id);
    files.push({
      path: `${dir}/${id}-${label}.md`,
      content: record({ _kind: kind, ...rest }, String(body ?? "")),
    });
  }
}

/** 全量数据导出为目录化 Markdown 文件列表。 */
export async function exportMarkdownFiles(): Promise<MarkdownFile[]> {
  const [
    workRows,
    holdingRows,
    entryRows,
    profileRows,
  ] = await Promise.all([
    db.select().from(workItems),
    db.select().from(holdings),
    db.select().from(entries),
    db.select().from(profileDoc),
  ]);

  const files: MarkdownFile[] = [
    {
      path: "README.md",
      content: [
        "# Console 数据导出",
        "",
        `生成于 ${new Date().toISOString()}`,
        "",
        "每个实体是一个 Markdown 文件,frontmatter 保存结构化字段,正文保存 Markdown 内容。",
        "",
      ].join("\n"),
    },
  ];

  addSection(files, "work_items", "工作事项", "work_item", workRows, "note", "name");
  addSection(files, "holdings", "持仓", "holding", holdingRows, "thesisMd", "name");
  addSection(files, "entries", "通用条目", "entry", entryRows, "contentMd", "title");

  for (const r of profileRows) {
    files.push({
      path: `profile/${safePart(r.layer)}.md`,
      content: record(
        {
          _kind: "profile",
          id: r.id,
          layer: r.layer,
          version: r.version,
          updatedAt: r.updatedAt,
        },
        r.contentMd,
      ),
    });
  }

  files.push({
    path: "profile/_index.md",
    content: [
      "# 画像层",
      "",
      `共 ${profileRows.length} 层。`,
      "",
      ...profileRows.map((r) => `- ${r.layer} v${r.version}`),
      "",
    ].join("\n"),
  });

  return files;
}

/**
 * 全量数据导出为单个结构化 Markdown 文档。
 * 每个实体一个 frontmatter 块,可人类阅读。
 */
export async function exportAllMarkdown(): Promise<string> {
  const files = await exportMarkdownFiles();
  return files
    .map((file) => [`# ${file.path}`, "", file.content.trim(), ""].join("\n"))
    .join("\n");
}
