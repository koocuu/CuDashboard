import Link from "next/link";
import { QuickAdd } from "@/components/quick-add";
import { MarkdownLite } from "@/components/ui/markdown-lite";
import { WorkBoard } from "@/components/work/work-board";
import type { ProfileLayer } from "@/lib/db/schema";
import { buildPositionSlices, donutGradient } from "@/lib/invest-chart";
import { LAYER_META } from "@/lib/profile-meta";
import { latestBackupRun } from "@/lib/queries/backup";
import { investStats, listHoldings } from "@/lib/queries/invest";
import { getAllLayers, listProposals } from "@/lib/queries/profile";
import { listWorkItems, workStats } from "@/lib/queries/work";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [work, workItems, invest, holdings, layers, proposals, backup] =
    await Promise.all([
      workStats().catch(() => null),
      listWorkItems().catch(() => []),
      investStats().catch(() => null),
      listHoldings().catch(() => []),
      getAllLayers().catch(() => []),
      listProposals().catch(() => []),
      latestBackupRun().catch(() => null),
    ]);

  const statusDoc = layers.find((layer) => layer.layer === "status");
  const statusMd = statusDoc?.contentMd ?? "还没有状态层内容。";
  const { preview: statusPreview, rest: statusRest } =
    splitStatusPreview(statusMd);
  const pending = proposals.filter((p) => p.status === "pending");
  const recentWrites = proposals.slice(0, 5);
  const { slices, total } = buildPositionSlices(holdings, 4);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(340px,0.82fr)_minmax(0,1.28fr)] xl:grid-cols-[420px_minmax(0,1fr)]">
      <aside className="space-y-5">
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-sm font-normal text-muted-foreground">
              近期状态
            </h1>
            <span className="font-mono text-[11px] text-primary">
              {statusDoc?.updatedAt
                ? formatDate(statusDoc.updatedAt, {
                    month: "2-digit",
                    day: "2-digit",
                  }).replace(/\//g, "-")
                : "--"}{" "}
              · v{statusDoc?.version ?? 1}
            </span>
          </div>
          <div className="text-[15px] leading-7">
            <MarkdownLite content={statusPreview} />
          </div>
          {statusRest && (
            <details className="group mt-3 border-t pt-3">
              <summary className="cursor-pointer list-none text-sm text-muted-foreground hover:text-foreground">
                展开全文 →
              </summary>
              <div className="mt-3 text-[15px] leading-7">
                <MarkdownLite content={statusRest} />
              </div>
            </details>
          )}
        </section>

        {pending.length > 0 && (
          <Link
            href="/profile/proposals"
            className="block rounded-xl border border-primary/40 bg-card px-3 py-2 transition-opacity hover:opacity-80"
          >
            <span className="font-mono text-[11px] text-primary">
              待确认 · {String(pending.length).padStart(2, "0")}
            </span>
          </Link>
        )}

        {backup?.status === "failed" && (
          <Link href="/settings" className="block border-t pt-3 text-sm">
            <span className="text-sm text-muted-foreground">备份失败</span>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {backup.message}
            </p>
          </Link>
        )}

        <section className="border-t pt-4">
          <Link href="/invest" className="block">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-normal text-muted-foreground">
                仓位
              </h2>
              <span className="text-sm text-muted-foreground">打开 →</span>
            </div>

            <div className="mt-4 flex items-center gap-5">
              <PositionDonut
                slices={slices}
                total={invest?.activePositionPct ?? total}
              />
              <div className="min-w-0 flex-1 space-y-2">
                {slices.map((slice) => (
                  <div
                    key={slice.key}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="truncate">{slice.label}</span>
                    <span className="ml-auto font-mono text-muted-foreground">
                      {slice.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {invest && (
              <p className="mt-4 text-xs text-muted-foreground">
                持仓{" "}
                <span className="font-mono">
                  {String(invest.holdingCount).padStart(2, "0")}
                </span>{" "}
                · 观察{" "}
                <span className="font-mono">
                  {String(invest.watchingCount).padStart(2, "0")}
                </span>
              </p>
            )}
          </Link>
        </section>

        <section className="border-t pt-4">
          <h2 className="text-sm font-normal text-muted-foreground">AI 动态</h2>
          <div className="mt-2 space-y-1">
            {recentWrites.length > 0 ? (
              recentWrites.map((p) => (
                <Link
                  key={p.id}
                  href={`/profile/proposals/${p.id}`}
                  className="grid grid-cols-[1fr_auto] gap-2 border-b py-2 text-sm"
                >
                  <span className="truncate">
                    {LAYER_META[p.layer as ProfileLayer]?.label ?? p.layer} ·{" "}
                    <span className="text-muted-foreground">
                      {p.diffSummary}
                    </span>
                  </span>
                  <span
                    className={
                      p.status === "pending"
                        ? "rounded-full bg-[#FBE7E1] px-2 py-0.5 font-mono text-[11px] text-primary"
                        : p.status === "approved"
                          ? "font-mono text-[11px] text-positive"
                          : "font-mono text-[11px] text-muted-foreground"
                    }
                  >
                    {p.status === "pending"
                      ? "待确认"
                      : p.status === "approved"
                        ? "已合并"
                        : "已拒绝"}
                  </span>
                </Link>
              ))
            ) : (
              <p className="py-3 text-sm text-muted-foreground">
                暂无 AI 写入。
              </p>
            )}
          </div>
        </section>
      </aside>

      <main className="space-y-4">
        <QuickAdd />

        <section className="space-y-3">
          <div className="border-b pb-2">
            <h2 className="text-sm font-normal text-muted-foreground">
              工作台账
            </h2>
            {work && (
              <p className="mt-1 text-xs text-muted-foreground">
                进行中{" "}
                <span className="font-mono text-foreground">
                  {String(work.in_progress).padStart(2, "0")}
                </span>{" "}
                · 等待外部{" "}
                <span className="font-mono text-foreground">
                  {String(work.waiting).padStart(2, "0")}
                </span>{" "}
                · 想做未做{" "}
                <span className="font-mono text-foreground">
                  {String(work.someday).padStart(2, "0")}
                </span>
              </p>
            )}
          </div>
          <WorkBoard initialItems={workItems} showQuickAdd={false} />
        </section>
      </main>
    </div>
  );
}

function PositionDonut({
  slices,
  total,
}: {
  slices: ReturnType<typeof buildPositionSlices>["slices"];
  total: number;
}) {
  return (
    <div
      className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
      style={{ background: donutGradient(slices) }}
      aria-label="仓位结构环形图"
    >
      <div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-card">
        <span className="font-mono text-sm text-foreground">{total}%</span>
      </div>
    </div>
  );
}

function splitStatusPreview(markdown: string) {
  const cleaned = removeStatusTitle(markdown);
  const sections = splitMarkdownSections(cleaned);
  const preview = sections.slice(0, 2).join("\n\n");
  const rest = sections.slice(2).join("\n\n");
  return {
    preview: preview || cleaned,
    rest,
  };
}

function removeStatusTitle(markdown: string) {
  const lines = markdown.trim().split(/\r?\n/);
  const first = lines[0]?.trim() ?? "";
  const plain = first.replace(/^#{1,6}\s*/, "");
  if (/^近期状态(?:\s|$|[（(])/.test(plain) || /^status(?:\s|$|[·:：])/i.test(plain)) {
    return lines.slice(1).join("\n").trim();
  }
  return markdown.trim();
}

function splitMarkdownSections(markdown: string) {
  const lines = markdown.trim().split(/\r?\n/);
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line) && current.length > 0) {
      sections.push(current.join("\n").trim());
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) sections.push(current.join("\n").trim());

  if (sections.length >= 2) return sections.filter(Boolean);
  const paragraphs = markdown
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
  return paragraphs.length > 0 ? paragraphs : [markdown];
}
