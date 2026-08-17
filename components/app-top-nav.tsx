"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "今日" },
  { href: "/projects", label: "项目" },
  { href: "/invest", label: "投资" },
  { href: "/profile", label: "画像" },
] as const;

export function AppTopNav({
  proposalCount,
  holdingProposalCount,
  statsLabel,
}: {
  proposalCount: number;
  holdingProposalCount: number;
  statsLabel: string | null;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 py-4">
      <div className="flex min-w-0 items-center gap-4">
        <nav className="flex items-center gap-1" aria-label="主导航">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const showBadge =
              (item.href === "/profile" && proposalCount > 0) ||
              (item.href === "/invest" && holdingProposalCount > 0);
            const badgeCount =
              item.href === "/profile" ? proposalCount : holdingProposalCount;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "border bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {showBadge && (
                  <span className="absolute -right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        {statsLabel && (
          <span className="hidden truncate text-[11px] text-muted-foreground md:inline">
            {statsLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/topics"
          className={cn(
            "text-[11px] transition-colors",
            pathname.startsWith("/topics")
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          选题
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}