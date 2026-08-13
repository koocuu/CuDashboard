import Link from "next/link";
import type { Project } from "@/lib/db/schema";
import {
  PROJECT_STATUS_META,
  PROJECT_STATUS_ORDER,
} from "@/lib/project-meta";
import { normalizeProjectStatus } from "@/lib/queries/projects";

export function ProjectStrip({
  projects,
  limit = 5,
}: {
  projects: Project[];
  limit?: number;
}) {
  const active = PROJECT_STATUS_ORDER.flatMap((status) =>
    projects.filter((item) => normalizeProjectStatus(item.status) === status),
  ).filter((item) => normalizeProjectStatus(item.status) !== "paused");
  const shown = active.slice(0, limit);

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-normal text-muted-foreground">作品</h2>
        <Link
          href="/projects"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          全部 {String(projects.length).padStart(2, "0")} →
        </Link>
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          还没有作品。去项目页加一个正在做或已上线的。
        </p>
      ) : (
        <ul className="divide-y">
          {shown.map((item) => {
            const status = normalizeProjectStatus(item.status);
            const meta = PROJECT_STATUS_META[status];
            return (
              <li key={item.id}>
                <Link
                  href="/projects"
                  className="flex items-baseline gap-3 py-2 text-sm hover:opacity-80"
                >
                  <span className="min-w-0 truncate font-medium">{item.name}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {meta.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}