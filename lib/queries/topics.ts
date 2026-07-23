import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { topicBatches } from "@/lib/db/schema";

export type TopicCandidate = {
  title: string
  title_zh?: string
  url: string
  source: string
  summary?: string
  account_id?: string
  account_name?: string
  final_score?: number
  score?: number
  /** 锚点：可被还原成场景/精确数字的具体细节。 */
  anchor?: string
  /** 锚点分 0-10。 */
  anchor_score?: number
  /** 切入点真实性 0-10。 */
  angle_authenticity?: number
  /** 热度 0-10。 */
  heat?: number
  /** 碳基线索：A / B / none。 */
  storyline?: "A" | "B" | "none"
  /** 不可逆性（仅线索 B）：true=单向临界；false=稳定循环。 */
  irreversible?: boolean | null
  /** 安全/漏洞类核实提醒（⚠ …）；无则空。 */
  caveat?: string
  angle?: string
  rationale?: string
  published_at?: string | null
}

export async function getLatestTopicBatch() {
  const rows = await db
    .select()
    .from(topicBatches)
    .orderBy(desc(topicBatches.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function createTopicBatch(input: {
  day: string
  summary: string
  contentMd: string
  candidates: TopicCandidate[]
  sourceName?: string
}) {
  const [row] = await db
    .insert(topicBatches)
    .values({
      day: input.day,
      summary: input.summary,
      contentMd: input.contentMd,
      candidates: input.candidates,
      sourceName: input.sourceName ?? "topic-radar",
    })
    .returning();
  return row;
}
