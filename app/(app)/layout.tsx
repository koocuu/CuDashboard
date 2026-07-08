import { redirect } from "next/navigation";
import { AppTopNav } from "@/components/app-top-nav";
import { isAuthenticated } from "@/lib/auth/session";
import { pendingProposalCount } from "@/lib/queries/profile";
import { workStats } from "@/lib/queries/work";
import { formatDate } from "@/lib/utils";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  let proposalCount = 0;
  let stats: Awaited<ReturnType<typeof workStats>> | null = null;
  try {
    [proposalCount, stats] = await Promise.all([
      pendingProposalCount(),
      workStats(),
    ]);
  } catch {
    // Do not block rendering while the database is unavailable.
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
      <AppTopNav proposalCount={proposalCount} statsLabel={statsLabel} />
      <main className="flex-1 pb-6 pt-4">{children}</main>
    </div>
  );
}
