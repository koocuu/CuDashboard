import type { TopicCandidate } from "@/lib/queries/topics";
import { formatDate } from "@/lib/utils";

type TopicBatchView = {
  id: number;
  day: string;
  summary: string;
  contentMd: string;
  candidates: unknown;
  createdAt: Date;
};

const ACCOUNT_LABEL: Record<string, string> = {
  lengjiao: "棱角计划",
  carbon: "碳基灵感收容所",
};

function asCandidates(raw: unknown): TopicCandidate[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is TopicCandidate =>
      !!item &&
      typeof item === "object" &&
      typeof (item as TopicCandidate).title === "string" &&
      typeof (item as TopicCandidate).url === "string",
  );
}

export function TopicRadarPanel({ batch }: { batch: TopicBatchView | null }) {
  if (!batch) {
    return (
      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-normal text-muted-foreground">今日选题</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          暂无选题。topic-radar 跑完后会出现在这里。
        </p>
      </section>
    );
  }

  const candidates = asCandidates(batch.candidates);
  const grouped = new Map<string, TopicCandidate[]>();
  for (const c of candidates) {
    const key = c.account_id || c.account_name || "other";
    const list = grouped.get(key) ?? [];
    list.push(c);
    grouped.set(key, list);
  }

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-normal text-muted-foreground">今日选题</h2>
        <span className="shrink-0 font-mono text-[11px] text-primary">
          {batch.day} ·{" "}
          {formatDate(batch.createdAt, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {batch.summary || "本批无结构化候选。"}
        </p>
      ) : (
        <div className="space-y-4">
          {[...grouped.entries()].map(([key, items]) => (
            <div key={key}>
              <p className="mb-2 text-xs text-muted-foreground">
                {ACCOUNT_LABEL[key] ?? key}
              </p>
              <ul className="space-y-2">
                {items.slice(0, 5).map((item) => (
                  <li key={`${item.url}-${item.title}`} className="text-sm">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium leading-snug hover:opacity-80"
                    >
                      {item.title}
                    </a>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[11px] text-muted-foreground">
                      {typeof item.final_score === "number" && (
                        <span>{item.final_score} 分</span>
                      )}
                      {item.source && <span>{item.source}</span>}
                    </div>
                    {item.angle && (
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {item.angle}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
