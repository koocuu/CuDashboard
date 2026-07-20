import Link from "next/link";
import { cookies } from "next/headers";
import { TopicRadarPanel } from "@/components/dashboard/topic-radar-panel";
import { QuickAdd } from "@/components/quick-add";
import { MarkdownLite } from "@/components/ui/markdown-lite";
import { WorkBoard } from "@/components/work/work-board";
import type { BackupRun, ProfileLayer } from "@/lib/db/schema";
import { buildPositionSlices, donutGradient } from "@/lib/invest-chart";
import { LAYER_META } from "@/lib/profile-meta";
import { latestBackupRun } from "@/lib/queries/backup";
import { investStats, listHoldings } from "@/lib/queries/invest";
import { getAllLayers, listProposals } from "@/lib/queries/profile";
import { getLatestTopicBatch } from "@/lib/queries/topics";
import { listWorkItems } from "@/lib/queries/work";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
  WORK_CATEGORY_ALL,
  WORK_CATEGORY_FILTER_COOKIE,
} from "@/lib/work-category-filter";
import { extractInternalStatusForDashboard } from "@/lib/status-sections";

export const dynamic = "force-dynamic";

// 兜底空数据保证首页可渲染,但把数据库错误记进日志,不再静默吞掉
function logQueryError<T>(label: string, fallback: T) {
  return (error: unknown): T => {
    console.error(`dashboard: ${label} 查询失败`, error);
    return fallback;
  };
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const rawFilter = cookieStore.get(WORK_CATEGORY_FILTER_COOKIE)?.value;
  let initialCategoryFilter = WORK_CATEGORY_ALL;
  if (rawFilter) {
    try {
      initialCategoryFilter = decodeURIComponent(rawFilter);
    } catch {
      initialCategoryFilter = rawFilter;
    }
  }

  const [workItems, invest, holdings, layers, proposals, backup, topicBatch] =
    await Promise.all([
      listWorkItems().catch(logQueryError("work_items", [])),
      investStats().catch(logQueryError("invest_stats", null)),
      listHoldings().catch(logQueryError("holdings", [])),
      getAllLayers().catch(logQueryError("profile_layers", [])),
      listProposals().catch(logQueryError("proposals", [])),
      latestBackupRun().catch(logQueryError("backup_runs", null)),
      getLatestTopicBatch().catch(logQueryError("topic_batches", null)),
    ]);

  const statusDoc = layers.find((layer) => layer.layer === "status");
  const statusMd = extractInternalStatusForDashboard(
    statusDoc?.contentMd ?? "还没有状态层内容。",
  );
  const { preview: statusPreview, rest: statusRest } =
    splitStatusPreview(statusMd);
  const statusAgeDays = statusDoc?.updatedAt
    ? Math.floor(
        (Date.now() - new Date(statusDoc.updatedAt).getTime()) / 86_400_000,
      )
    : null;
  const statusStale = statusAgeDays !== null && statusAgeDays > 35;
  const pending = proposals.filter((p) => p.status === "pending");
  const recentWrites = proposals.slice(0, 5);
  const { slices, total } = buildPositionSlices(holdings, 4);
  const categoryOptions = Array.from(
    new Set(
      workItems
        .map((item) => item.category?.trim())
        .filter((category): category is string => Boolean(category)),
    ),
  ).sort((a, b) => a.localeCompare(b, "zh-CN"));

  return (
    <div className="space-y-6">
      {/* 移动端把快速录入放在首屏最顶上,桌面端仍在右栏 */}
      <div className="lg:hidden">
        <QuickAdd categoryOptions={categoryOptions} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(340px,0.82fr)_minmax(0,1.28fr)] xl:grid-cols-[420px_minmax(0,1fr)]">
      <aside className="space-y-5">
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h1 className="text-sm font-normal text-muted-foreground">
              近期状态
            </h1>
            {statusStale ? (
              <span
                className="shrink-0 font-mono text-[11px]"
                style={{ color: "#9A938A" }}
              >
                上次更新 {statusAgeDays} 天前
              </span>
            ) : (
              <span className="shrink-0 font-mono text-[11px] text-primary">
                {statusDoc?.updatedAt
                  ? formatDate(statusDoc.updatedAt, {
                      month: "2-digit",
                      day: "2-digit",
                    }).replace(/\//g, "-")
                  : "--"}{" "}
                · v{statusDoc?.version ?? 1}
              </span>
            )}
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

        <TopicRadarPanel batch={topicBatch} />

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

        <BackupStatus
          backup={backup}
          enabled={Boolean(
            process.env.GITHUB_BACKUP_TOKEN?.trim() &&
              process.env.GITHUB_BACKUP_REPO?.trim(),
          )}
        />

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
                total={total}
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
        <div className="hidden lg:block">
          <QuickAdd categoryOptions={categoryOptions} />
        </div>

        <section className="space-y-3">
          <div className="border-b pb-2">
            <h2 className="text-sm font-normal text-muted-foreground">
              工作台账
            </h2>
          </div>
          <WorkBoard
            initialItems={workItems}
            showQuickAdd={false}
            initialCategoryFilter={initialCategoryFilter}
          />
        </section>
      </main>
      </div>
    </div>
  );
}

// 备份状态常驻显示:不只报失败,长时间没跑(cron 停了)也要能看出来
const BACKUP_STALE_MS = 48 * 60 * 60 * 1000;

function BackupStatus({
  backup,
  enabled,
}: {
  backup: BackupRun | null;
  enabled: boolean;
}) {
  if (!enabled) {
    return (
      <p className="border-t pt-3 font-mono text-[11px] text-muted-foreground">
        备份 · 未启用
      </p>
    );
  }

  if (!backup) {
    return (
      <p className="border-t pt-3 font-mono text-[11px] text-muted-foreground">
        备份 · 尚无记录
      </p>
    );
  }

  const failed = backup.status === "failed";
  const stale =
    Date.now() - new Date(backup.createdAt).getTime() > BACKUP_STALE_MS;
  const ago = formatRelativeTime(backup.createdAt);

  if (!failed && !stale) {
    return (
      <p className="border-t pt-3 font-mono text-[11px] text-muted-foreground">
        备份 · {ago}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-primary/40 bg-card px-3 py-2">
      <span className="font-mono text-[11px] text-primary">
        {failed ? "备份失败" : "备份已停滞"} · {ago}
      </span>
      {failed && backup.message && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {backup.message}
        </p>
      )}
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
      <div className="grid h-[68px] w-[68px] place-items-center content-center rounded-full bg-card">
        <span className="text-[10px] text-muted-foreground">已投</span>
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
