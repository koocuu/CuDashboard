import { parseNowFrontmatter, statusContentForNow } from "@/lib/status-sections";

export const NOW_SECTION_TITLES = ["在做", "在写", "在想"] as const;

export type NowSection = { title: string; body: string };

export type NowDocument = {
  season: string | null;
  headline: string | null;
  extraFrontmatter: Record<string, string>;
  preface: string;
  sections: NowSection[];
};

export type NowMergeNote = {
  replaced: string[];
  kept: string[];
  cleared: string[];
  added: string[];
};

const H2_RE = /^##\s+(.+?)\s*$/gm;

function parseFrontmatterMap(fm: string) {
  const extra: Record<string, string> = {};
  let season: string | null = null;
  let headline: string | null = null;
  for (const line of fm.split("\n")) {
    const match = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2].trim();
    if (key === "season") season = value || null;
    else if (key === "headline") headline = value || null;
    else extra[key] = value;
  }
  return { season, headline, extra };
}

function splitH2Sections(body: string): { preface: string; sections: NowSection[] } {
  const text = body.replace(/\r\n/g, "\n").trim();
  if (!text) return { preface: "", sections: [] };
  const matches = [...text.matchAll(H2_RE)];
  if (matches.length === 0) return { preface: text, sections: [] };

  const first = matches[0];
  const preface = text.slice(0, first.index).trim();
  const sections: NowSection[] = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const start = (current.index ?? 0) + current[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    sections.push({
      title: current[1].trim(),
      body: text.slice(start, end).replace(/^\n+/, "").trim(),
    });
  }
  return { preface, sections };
}

export function parseNowDocument(markdown: string): NowDocument {
  const raw = markdown.replace(/\r\n/g, "\n").trim();
  const parsed = parseNowFrontmatter(raw);
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  const extraFrontmatter = fmMatch ? parseFrontmatterMap(fmMatch[1]).extra : {};
  const { preface, sections } = splitH2Sections(parsed.body);
  return {
    season: parsed.season,
    headline: parsed.headline,
    extraFrontmatter,
    preface,
    sections,
  };
}

function sectionMap(doc: NowDocument) {
  const map = new Map<string, string>();
  const present = new Set<string>();
  for (const section of doc.sections) {
    present.add(section.title);
    map.set(section.title, section.body);
  }
  return { map, present };
}

function orderedTitles(current: NowDocument, proposed: NowDocument) {
  const seen = new Set<string>();
  const titles: string[] = [];
  const push = (title: string) => {
    if (seen.has(title)) return;
    seen.add(title);
    titles.push(title);
  };
  for (const title of NOW_SECTION_TITLES) push(title);
  for (const section of proposed.sections) push(section.title);
  for (const section of current.sections) push(section.title);
  return titles;
}

function renderFrontmatter(doc: {
  season: string | null;
  headline: string | null;
  extraFrontmatter: Record<string, string>;
}) {
  const lines: string[] = [];
  if (doc.season) lines.push(`season: ${doc.season}`);
  if (doc.headline) lines.push(`headline: ${doc.headline}`);
  for (const [key, value] of Object.entries(doc.extraFrontmatter)) {
    if (key === "season" || key === "headline") continue;
    lines.push(`${key}: ${value}`);
  }
  if (lines.length === 0) return "";
  return `---\n${lines.join("\n")}\n---\n\n`;
}

/** 现稿作底。提案写了的章节（含空正文）覆盖；没写到的章节保留。 */
export function mergeNowRevision(currentMd: string, proposedMd: string): string {
  const current = parseNowDocument(statusContentForNow(currentMd) || currentMd);
  const proposed = parseNowDocument(proposedMd);
  const currentSections = sectionMap(current);
  const proposedSections = sectionMap(proposed);

  const season = proposed.season ?? current.season;
  const headline = proposed.headline ?? current.headline;
  const extraFrontmatter = { ...current.extraFrontmatter, ...proposed.extraFrontmatter };
  const preface = proposed.preface || current.preface;

  const sections: NowSection[] = [];
  for (const title of orderedTitles(current, proposed)) {
    if (proposedSections.present.has(title)) {
      const body = proposedSections.map.get(title) ?? "";
      if (!body) continue;
      sections.push({ title, body });
      continue;
    }
    const body = currentSections.map.get(title) ?? "";
    if (!body) continue;
    sections.push({ title, body });
  }

  const parts = [renderFrontmatter({ season, headline, extraFrontmatter })];
  if (preface) parts.push(`${preface}\n\n`);
  for (const section of sections) {
    parts.push(`## ${section.title}\n\n${section.body}\n\n`);
  }
  return parts.join("").trim() + "\n";
}

export function describeNowMerge(currentMd: string, proposedMd: string): NowMergeNote {
  const current = parseNowDocument(statusContentForNow(currentMd) || currentMd);
  const proposed = parseNowDocument(proposedMd);
  const currentSections = sectionMap(current);
  const proposedSections = sectionMap(proposed);
  const replaced: string[] = [];
  const kept: string[] = [];
  const cleared: string[] = [];
  const added: string[] = [];

  for (const title of orderedTitles(current, proposed)) {
    const inCurrent = currentSections.present.has(title);
    const inProposed = proposedSections.present.has(title);
    const proposedBody = proposedSections.map.get(title) ?? "";
    if (inProposed && !proposedBody) {
      if (inCurrent) cleared.push(title);
      continue;
    }
    if (inProposed && !inCurrent) {
      added.push(title);
      continue;
    }
    if (inProposed && inCurrent) {
      replaced.push(title);
      continue;
    }
    if (!inProposed && inCurrent) kept.push(title);
  }

  return { replaced, kept, cleared, added };
}
