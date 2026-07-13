"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "CONSOLE", tracking: "tracking-[0.22em]" },
  { href: "/topics", label: "选题", tracking: "tracking-[0.14em]" },
  { href: "/profile", label: "画像", tracking: "tracking-[0.14em]" },
] as const;

export function AppTopNav({
  proposalCount,
  statsLabel,
}: {
  proposalCount: number;
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
            const showBadge = item.href === "/profile" && proposalCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition-colors",
                  item.tracking,
                  active
                    ? "border bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {showBadge && (
                  <span className="absolute -right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tracking-normal text-primary-foreground">
                    {proposalCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {statsLabel && (
          <span className="hidden truncate font-mono text-[11px] text-muted-foreground md:inline">
            {statsLabel}
          </span>
        )}
      </div>

      <LogoutButton />
    </header>
  );
}
