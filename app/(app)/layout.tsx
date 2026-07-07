import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { LogoutButton } from "@/components/logout-button";
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
    // 数据库未就绪时不阻塞页面渲染。
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col px-4 sm:px-6 xl:px-8">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/dashboard"
            className="font-mono text-sm font-semibold uppercase tracking-[0.22em]"
          >
            CONSOLE
          </Link>
          {stats && (
            <span className="hidden truncate font-mono text-[11px] text-muted-foreground md:inline">
              ACTIVE {String(stats.in_progress).padStart(2, "0")} · WAIT{" "}
              {String(stats.waiting).padStart(2, "0")} ·{" "}
              {formatDate(new Date(), {
                month: "2-digit",
                day: "2-digit",
                weekday: "short",
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/profile"
            className="relative rounded-lg px-3 py-2 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            画像
            {proposalCount > 0 && (
              <span className="absolute -right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {proposalCount}
              </span>
            )}
          </Link>
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
            aria-label="设置"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 pb-24 pt-4 lg:pb-6">{children}</main>
      <BottomNav proposalCount={proposalCount} />
    </div>
  );
}
