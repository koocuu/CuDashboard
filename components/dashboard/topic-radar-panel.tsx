import Link from "next/link";
import {
  TOPIC_ACCOUNT_LABEL,
  asTopicCandidates,
  groupTopicCandidates,
  topicDisplayTitle,
} from "@/lib/topics-display";
import { formatDate } from "@/lib/utils";

type TopicBatchView = {
  id: number;
  day: string;
  summary: string;
  contentMd: string;
  candidates: unknown;
  createdAt: Date;
};

/** 首页精简预览：每账号最多 2 条，全文进 /topics。 */
export function TopicRadarPanel({ batch }: { batch: TopicBatchView | null }) {
  if (!batch) {
    return (
      <section className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-normal text-muted-foreground">今日选题</h2>
          <Link
            href="/topics"
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
          >
            打开 →
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          暂无选题。topic-radar 跑完后会出现在这里。
        </p>
      </section>
    );
  }

  const candidates = asTopicCandidates(batch.candidates);
  const grouped = groupTopicCandidates(candidates);
  const previewLimit = 2;

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-normal text-muted-foreground">今日选题</h2>
        <Link
          href="/topics"
          className="shrink-0 font-mono text-[11px] text-primary hover:opacity-80"
        >
          {batch.day} · 全部 {String(candidates.length).padStart(2, "0")} →
        </Link>
      </div>

      {candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {batch.summary || "本批无结构化候选。"}
        </p>
      ) : (
        <div className="space-y-3">
          {[...grouped.entries()].map(([key, items]) => (
            <div key={key}>
              <p className="mb-1.5 text-xs text-muted-foreground">
                {TOPIC_ACCOUNT_LABEL[key] ?? key}
              </p>
              <ul className="space-y-1.5">
                {items.slice(0, previewLimit).map((item) => (
                  <li key={`${item.url}-${item.title}`} className="text-sm">
                    <Link
                      href="/topics"
                      className="line-clamp-2 font-medium leading-snug hover:opacity-80"
                    >
                      {topicDisplayTitle(item)}
                    </Link>
                    {item.anchor?.trim() && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        锚点 · {item.anchor}
                      </p>
                    )}
                    {item.caveat?.trim() && (
                      <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-500">
                        {item.caveat}
                      </p>
                    )}
                    <div className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[11px] text-muted-foreground">
                      {typeof item.final_score === "number" && (
                        <span>{item.final_score} 分</span>
                      )}
                      {item.title_zh && item.title !== item.title_zh && (
                        <span className="truncate max-w-[12rem]" title={item.title}>
                          EN
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Link
            href="/topics"
            className="mt-1 inline-block text-xs text-muted-foreground hover:text-foreground"
          >
            查看全文与原文链接 →
          </Link>
          <p className="font-mono text-[10px] text-muted-foreground">
            更新{" "}
            {formatDate(batch.createdAt, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}
    </section>
  );
}
