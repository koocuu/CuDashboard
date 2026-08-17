import { redirect } from "next/navigation";
import { AppTopNav } from "@/components/app-top-nav";
import { LiveRefresh } from "@/components/live-refresh";
import { isAuthenticated } from "@/lib/auth/session";
import { getLiveRevision } from "@/lib/live-revision";
import { pendingProposalCount } from "@/lib/queries/profile";
import { pendingHoldingProposalCount } from "@/lib/holding-proposals";
import { workStats } from "@/lib/queries/work";
import { formatDate } from "@/lib/utils";

/** 提案角标等随 live-revision → router.refresh 更新，禁止 layout 静态缓存。 */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  let proposalCount = 0;
  let holdingProposalCount = 0;
  let stats: Awaited<ReturnType<typeof workStats>> | null = null;
  let initialRevision: string | null = null;
  try {
    [proposalCount, holdingProposalCount, stats] = await Promise.all([
      pendingProposalCount(),
      pendingHoldingProposalCount(),
      workStats(),
    ]);
  } catch {
    // Do not block rendering while the database is unavailable.
  }
  try {
    initialRevision = await getLiveRevision();
  } catch {
    // 作品表未迁移时不拖垮角标
  }

  const statsLabel = stats
    ? `进行中 ${String(stats.in_progress).padStart(2, "0")} · 排期 ${String(
        stats.scheduled,
      ).padStart(2, "0")} · 想做 ${String(stats.someday).padStart(
        2,
        "0",
      )} · ${formatDate(new Date(), {
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
      })}`
    : null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col px-4 sm:px-6 xl:px-8">
      <LiveRefresh initialRevision={initialRevision} />
      <AppTopNav
        proposalCount={proposalCount}
        holdingProposalCount={holdingProposalCount}
        statsLabel={statsLabel}
      />
      <main className="flex-1 pb-6 pt-4">{children}</main>
    </div>
  );
}
