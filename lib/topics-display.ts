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
