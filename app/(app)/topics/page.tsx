import Link from "next/link";
import { getLatestTopicBatch } from "@/lib/queries/topics";
import {
  TOPIC_ACCOUNT_LABEL,
  asTopicCandidates,
  groupTopicCandidates,
  topicDisplayTitle,
} from "@/lib/topics-display";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const batch = await getLatestTopicBatch().catch(() => null);
  const candidates = asTopicCandidates(batch?.candidates);
  const grouped = groupTopicCandidates(candidates);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between gap-3 border-b pb-3">
        <div>
          <h1 className="text-sm font-normal text-muted-foreground">选题雷达</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {batch
              ? `${batch.day} · ${batch.summary || "最新一批候选"}`
              : "尚无批次。等 topic-radar 写入后刷新。"}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
        >
          ← 首页
        </Link>
      </div>

      {!batch || candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无选题内容。</p>
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([key, items]) => (
            <section key={key} className="space-y-3">
              <h2 className="border-b pb-2 text-sm text-muted-foreground">
                {TOPIC_ACCOUNT_LABEL[key] ?? key}
                <span className="ml-2 font-mono text-[11px]">
                  {String(items.length).padStart(2, "0")}
                </span>
              </h2>
              <ol className="space-y-5">
                {items.map((item, idx) => (
                  <li key={`${item.url}-${idx}`} className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium leading-7">
                          {topicDisplayTitle(item)}
                        </p>
                        {item.title_zh && item.title !== item.title_zh && (
                          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                            原文题：{item.title}
                          </p>
                        )}
                        {!item.title_zh && item.title === topicDisplayTitle(item) && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            （尚无中文题，等下次雷达用 LLM 生成）
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-x-3 font-mono text-[11px] text-muted-foreground">
                          {typeof item.final_score === "number" && (
                            <span>{item.final_score} 分</span>
                          )}
                          {item.source && <span>{item.source}</span>}
                          {item.published_at && (
                            <span>
                              {formatDate(item.published_at, {
                                month: "2-digit",
                                day: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        {item.anchor?.trim() && (
                          <p className="mt-2 text-sm leading-6">
                            <span className="text-muted-foreground">锚点 · </span>
                            {item.anchor}
                          </p>
                        )}
                        {(typeof item.anchor_score === "number" ||
                          typeof item.angle_authenticity === "number" ||
                          typeof item.heat === "number") && (
                          <div className="mt-1 flex flex-wrap gap-x-3 font-mono text-[11px] text-muted-foreground">
                            {typeof item.anchor_score === "number" && (
                              <span>锚点 {item.anchor_score}/10</span>
                            )}
                            {typeof item.angle_authenticity === "number" && (
                              <span>真实 {item.angle_authenticity}/10</span>
                            )}
                            {typeof item.heat === "number" && (
                              <span>热度 {item.heat}/10</span>
                            )}
                          </div>
                        )}
                        {item.angle && (
                          <p className="mt-2 text-sm leading-6">
                            <span className="text-muted-foreground">切入点 · </span>
                            {item.angle}
                          </p>
                        )}
                        {item.rationale && (
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {item.rationale}
                          </p>
                        )}
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs text-primary hover:opacity-80"
                        >
                          打开原文 →
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}

          <p className="border-t pt-3 font-mono text-[11px] text-muted-foreground">
            batch #{batch.id} · 写入{" "}
            {formatDate(batch.createdAt, {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}
    </div>
  );
}
