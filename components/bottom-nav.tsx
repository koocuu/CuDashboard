"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "控制台" },
  { href: "/profile", label: "画像" },
];

export function BottomNav({ proposalCount = 0 }: { proposalCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto border-t bg-background lg:hidden">
      <div className="grid grid-cols-2">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const showBadge = item.href === "/profile" && proposalCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center justify-center py-3 font-mono text-xs tracking-[0.14em] transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span>{item.label}</span>
              {showBadge && (
                <span className="absolute right-[38%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {proposalCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
