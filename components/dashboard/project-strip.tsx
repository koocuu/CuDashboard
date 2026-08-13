import Link from "next/link";
import type { Project } from "@/lib/db/schema";

export function ProjectStrip({
  projects,
  limit = 5,
}: {
  projects: Project[];
  limit?: number;
}) {
  const shown = projects.slice(0, limit);

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-normal text-muted-foreground">作品</h2>
        <Link
          href="/projects"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          墙 →
        </Link>
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">还没有作品。去项目页加一个。</p>
      ) : (
        <ul className="divide-y">
          {shown.map((item) => (
            <li key={item.id}>
              <Link
                href="/projects"
                className="block py-2 hover:opacity-80"
              >
                <span className="text-sm font-medium">{item.name}</span>
                {item.summary ? (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {item.summary}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}