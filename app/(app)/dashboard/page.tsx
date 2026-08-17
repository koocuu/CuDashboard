import Link from "next/link";
import { cookies } from "next/headers";
import { QuickAdd } from "@/components/quick-add";
import { MarkdownLite } from "@/components/ui/markdown-lite";
import { WorkBoard } from "@/components/work/work-board";
import type { BackupRun } from "@/lib/db/schema";
import { latestBackupRun } from "@/lib/queries/backup";
import { getAllLayers, listProposals } from "@/lib/queries/profile";
import { listWorkItems } from "@/lib/queries/work";
import { listHoldingProposals } from "@/lib/holding-proposals";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
  WORK_CATEGORY_ALL,
  WORK_CATEGORY_FILTER_COOKIE,
} from "@/lib/work-category-filter";
import { parseNowFrontmatter, statusContentForNow } from "@/lib/status-sections";

export const dynamic = "force-dynamic";

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

  const [workItems, layers, proposals, backup, holdingProposals] =
    await Promise.all([
      listWorkItems().catch(logQueryError("work_items", [])),
      getAllLayers().catch(logQueryError("profile_layers", [])),
      listProposals().catch(logQueryError("proposals", [])),
      latestBackupRun().catch(logQueryError("backup_runs", null)),
      listHoldingProposals().catch(logQueryError("holding_proposals", [])),
    ]);

  const statusDoc = layers.find((layer) => layer.layer === "status");
  const publicRaw = statusContentForNow(statusDoc?.contentMd ?? "");
  const { body: statusMd, headline: nowHeadline } = parseNowFrontmatter(publicRaw);
  const { preview: statusPreview, rest: statusRest } =
    splitStatusPreview(statusMd);
  const statusAgeDays = statusDoc?.updatedAt
    ? Math.floor(
        (Date.now() - new Date(statusDoc.updatedAt).getTime()) / 86_400_000,
      )
    : null;
  const statusStale = statusAgeDays !== null && statusAgeDays > 35;
  const pending = proposals.filter((p) => p.status === "pending");
  const pendingHoldings = holdingProposals.filter((p) => p.status === "pending");
  const categoryOptions = Array.from(
    new Set(
      workItems
        .map((item) => item.category?.trim())
        .filter((category): category is string => Boolean(category)),
    ),
  ).sort((a, b) => a.localeCompare(b, "zh-CN"));

  const ledgerBusy = workItems.some(
    (item) =>
      item.pinned ||
      item.status === "in_progress" ||
      item.status === "scheduled",
  );
  const somedayCount = workItems.filter((item) => item.status === "someday").length;

  return (
    <div className="space-y-6">
      <div className="lg:hidden">
        <QuickAdd categoryOptions={categoryOptions} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(340px,0.82fr)_minmax(0,1.28fr)] xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h1 className="text-sm font-normal text-muted-foreground">
                近期状态
              </h1>
              <div className="flex shrink-0 items-center gap-3 text-[11px] text-muted-foreground">
                <a
                  href="https://koocuu.com/zh/now/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground"
                >
                  /now →
                </a>
                {statusStale ? (
                  <span style={{ color: "#9A938A" }}>
                    上次更新 {statusAgeDays} 天前
                  </span>
                ) : (
                  <span>
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
            </div>
            {statusMd || nowHeadline ? (
              <>
                {nowHeadline ? (
                  <p className="mb-3 text-[15px] leading-7 text-muted-foreground">
                    {nowHeadline}
                  </p>
                ) : null}
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
              </>
            ) : (
              <p className="text-sm leading-7 text-muted-foreground">
                还没有近况。去画像 status 写一份可公开的近期状态，或等月度审计一起提交。保存后会同步到网站
                /now。
              </p>
            )}
          </section>

          {(pending.length > 0 || pendingHoldings.length > 0) && (
            <div className="space-y-1 border-y py-2 text-sm text-primary">
              {pending.length > 0 ? (
                <Link href="/profile/proposals" className="block hover:opacity-80">
                  画像待确认 {pending.length} 条 →
                </Link>
              ) : null}
              {pendingHoldings.length > 0 ? (
                <Link href="/invest" className="block hover:opacity-80">
                  投资待确认 {pendingHoldings.length} 条 →
                </Link>
              ) : null}
            </div>
          )}

          <BackupStatus
            backup={backup}
            enabled={Boolean(
              process.env.GITHUB_BACKUP_TOKEN?.trim() &&
                process.env.GITHUB_BACKUP_REPO?.trim(),
            )}
          />
        </aside>

        <main className="space-y-4">
          <div className="hidden lg:block">
            <QuickAdd categoryOptions={categoryOptions} />
          </div>

          <section className="space-y-3">
            <div className="flex items-baseline justify-between border-b pb-2">
              <h2 className="text-sm font-normal text-muted-foreground">
                手头的事
              </h2>
              {!ledgerBusy && somedayCount > 0 ? (
                <span className="text-[11px] text-muted-foreground">
                  想做 {String(somedayCount).padStart(2, "0")} · 闲的时候可以不管
                </span>
              ) : null}
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
      <p className="border-t pt-3 text-[11px] text-muted-foreground">
        备份 · 未启用
      </p>
    );
  }

  if (!backup) {
    return (
      <p className="border-t pt-3 text-[11px] text-muted-foreground">
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
      <p className="border-t pt-3 text-[11px] text-muted-foreground">
        备份 · {ago}
      </p>
    );
  }

  return (
    <div className="border-t pt-3">
      <span className="text-[11px] text-primary">
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

function splitStatusPreview(markdown: string) {
  const cleaned = removeStatusTitle(markdown);
  const sections = splitMarkdownSections(cleaned);
  const preview = sections.slice(0, 1).join("\n\n");
  const rest = sections.slice(1).join("\n\n");
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