import type { TopicCandidate } from "@/lib/queries/topics";

export const TOPIC_ACCOUNT_LABEL: Record<string, string> = {
  lengjiao: "棱角计划",
  carbon: "碳基灵感收容所",
};

export function asTopicCandidates(raw: unknown): TopicCandidate[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is TopicCandidate =>
      !!item &&
      typeof item === "object" &&
      typeof (item as TopicCandidate).title === "string" &&
      typeof (item as TopicCandidate).url === "string",
  );
}

/** 优先中文题；其次用切入点；最后才回退英文原题。 */
export function topicDisplayTitle(c: TopicCandidate): string {
  const zh = c.title_zh?.trim();
  if (zh) return zh;
  const angle = c.angle?.trim();
  if (angle && !angle.startsWith("启发式")) return angle;
  return c.title;
}

export function groupTopicCandidates(candidates: TopicCandidate[]) {
  const grouped = new Map<string, TopicCandidate[]>();
  for (const c of candidates) {
    const key = c.account_id || c.account_name || "other";
    const list = grouped.get(key) ?? [];
    list.push(c);
    grouped.set(key, list);
  }
  return grouped;
}

/** 过滤账号：lengjiao / carbon / 中文名均可。 */
export function filterTopicCandidatesByAccount(
  candidates: TopicCandidate[],
  account?: string | null,
): TopicCandidate[] {
  const raw = account?.trim();
  if (!raw) return candidates;
  const needle = raw.toLowerCase();
  const aliases: Record<string, string[]> = {
    lengjiao: ["lengjiao", "棱角计划"],
    carbon: ["carbon", "碳基灵感收容所", "碳基"],
  };
  return candidates.filter((c) => {
    const id = (c.account_id || "").toLowerCase();
    const name = c.account_name || "";
    if (id === needle || name.includes(raw)) return true;
    for (const [canonical, list] of Object.entries(aliases)) {
      if (list.some((a) => a.toLowerCase() === needle || a === raw)) {
        return id === canonical || name.includes(TOPIC_ACCOUNT_LABEL[canonical] ?? "");
      }
    }
    return false;
  });
}

/** 供 MCP / 导出：最新选题批次 Markdown。 */
export function formatTopicBatchMarkdown(input: {
  id: number;
  day: string;
  summary: string;
  contentMd?: string | null;
  candidates: unknown;
  createdAt: Date;
  account?: string | null;
}): string {
  let candidates = asTopicCandidates(input.candidates);
  candidates = filterTopicCandidatesByAccount(candidates, input.account);
  const grouped = groupTopicCandidates(candidates);

  if (candidates.length === 0) {
    if (input.contentMd?.trim() && !input.account) {
      return input.contentMd.trim();
    }
    return input.account
      ? `选题批次 #${input.id}（${input.day}）中没有账号「${input.account}」的候选。`
      : `选题批次 #${input.id}（${input.day}）暂无结构化候选。`;
  }

  const parts: string[] = [
    `# 选题候选 ${input.day}`,
    "",
    `batch #${input.id} · ${input.summary || "topic-radar"}`,
    "",
    "说明：以下为待人工挑选的候选，不是已定选题；写稿前请先确认。",
    "",
  ];

  for (const [key, items] of grouped) {
    parts.push(`## ${TOPIC_ACCOUNT_LABEL[key] ?? key}`, "");
    items.forEach((item, idx) => {
      parts.push(`### ${idx + 1}. ${topicDisplayTitle(item)}`, "");
      if (item.title_zh && item.title && item.title_zh !== item.title) {
        parts.push(`- 原文题: ${item.title}`);
      }
      if (item.anchor?.trim()) parts.push(`- 锚点: ${item.anchor}`);
      if (typeof item.final_score === "number") {
        const parts3 = [
          typeof item.anchor_score === "number" ? `锚点 ${item.anchor_score}/10` : null,
          typeof item.angle_authenticity === "number" ? `真实 ${item.angle_authenticity}/10` : null,
          typeof item.heat === "number" ? `热度 ${item.heat}/10` : null,
        ].filter(Boolean);
        parts.push(
          `- 分数: ${item.final_score}${parts3.length ? `（${parts3.join(" · ")}）` : ""}`,
        );
      }
      if (item.source) parts.push(`- 来源: ${item.source}`);
      parts.push(`- 链接: ${item.url}`);
      if (item.angle) parts.push(`- 切入点: ${item.angle}`);
      if (item.rationale) parts.push(`- 理由: ${item.rationale}`);
      if (item.storyline && item.storyline !== "none") {
        const irrev =
          item.irreversible === true
            ? "不可逆 ✓"
            : item.irreversible === false
              ? "稳定循环 ✗（已降权）"
              : "—";
        parts.push(`- 线索: ${item.storyline} · ${irrev}`);
      }
      if (item.caveat?.trim()) parts.push(`- 核实: ${item.caveat}`);
      parts.push("");
    });
  }

  return parts.join("\n").trim() + "\n";
}
