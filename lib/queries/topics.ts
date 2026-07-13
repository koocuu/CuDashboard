import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { topicBatches } from "@/lib/db/schema";

export type TopicCandidate = {
  title: string
  url: string
  source: string
  summary?: string
  account_id?: string
  account_name?: string
  final_score?: number
  score?: number
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
