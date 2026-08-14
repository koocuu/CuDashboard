"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Project, ProjectArea } from "@/lib/db/schema";
import {
  PROJECT_AREA_META,
  isProjectArea,
  projectTone,
} from "@/lib/project-meta";
import { cn } from "@/lib/utils";

const AREAS: ProjectArea[] = ["personal", "work", "writing"];

export function ProjectWall({ initialItems }: { initialItems: Project[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [adding, setAdding] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(
    initialItems[0]?.id ?? null,
  );

  useEffect(() => {
    setItems(initialItems);
    setActiveId((cur) => {
      if (cur !== null && initialItems.some((item) => item.id === cur)) return cur;
      return initialItems[0]?.id ?? null;
    });
  }, [initialItems]);

  function replace(next: Project) {
    setItems((cur) => cur.map((item) => (item.id === next.id ? next : item)));
  }

  function remove(id: number) {
    setItems((cur) => {
      const next = cur.filter((item) => item.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
  }

  function add(item: Project) {
    setItems((cur) => [...cur, item]);
    setAdding(false);
    setActiveId(item.id);
    router.refresh();
  }

  function pick(id: number) {
    setActiveId(id);
  }

  const active = items.find((item) => item.id === activeId) ?? items[0] ?? null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-sm font-normal text-muted-foreground">作品</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            给人看，也给 AI 读。点名字切换当前这一件。
          </p>
        </div>
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          <Plus className="h-3.5 w-3.5" />
          {adding ? "收起" : "新作品"}
        </Button>
      </div>

      {items.length > 0 ? (
        <ProjectIndex items={items} activeId={active?.id ?? null} onPick={pick} />
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">
          还没有作品。加一个正在碰的。
        </p>
      )}

      {adding && (
        <ProjectEditor onCancel={() => setAdding(false)} onSaved={add} />
      )}

      {active ? (
        <ProjectDetail
          key={active.id}
          item={active}
          index={items.findIndex((item) => item.id === active.id)}
          onPatch={replace}
          onDelete={remove}
        />
      ) : null}
    </div>
  );
}

function ProjectIndex({
  items,
  activeId,
  onPick,
}: {
  items: Project[];
  activeId: number | null;
  onPick: (id: number) => void;
}) {
  return (
    <nav
      className="flex flex-wrap items-end gap-x-8 gap-y-5 border-b pb-8"
      aria-label="作品目录"
    >
      {items.map((item, index) => {
        const active = item.id === activeId;
        const tone = projectTone(index);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick(item.id)}
            className="group min-w-0 text-left"
          >
            <span
              className="block font-mono text-[11px] tabular-nums"
              style={{ color: tone }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "mt-1 block text-2xl font-medium tracking-tight md:text-[28px]",
                active
                  ? "text-foreground"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
            >
              {item.name}
            </span>
            <span
              className="mt-2 block h-px w-full"
              style={{ background: active ? tone : "transparent" }}
            />
          </button>
        );
      })}
    </nav>
  );
}

function ProjectDetail({
  item,
  index,
  onPatch,
  onDelete,
}: {
  item: Project;
  index: number;
  onPatch: (item: Project) => void;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const area = isProjectArea(item.area) ? item.area : "personal";
  const tone = projectTone(index);

  if (editing) {
    return (
      <div className="border-t pt-6">
        <ProjectEditor
          item={item}
          onCancel={() => setEditing(false)}
          onSaved={(next) => {
            onPatch(next);
            setEditing(false);
          }}
          onDeleted={() => onDelete(item.id)}
        />
      </div>
    );
  }

  return (
    <article className="relative border-t py-10 md:py-12">
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-6 select-none text-7xl font-medium leading-none md:text-8xl"
        style={{ color: tone, opacity: 0.16 }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <p className="text-[11px] text-muted-foreground">
        {PROJECT_AREA_META[area].label}
        {item.skillRef ? ` · ${item.skillRef}` : ""}
      </p>
      <h2 className="mt-2 text-4xl font-medium tracking-tight md:text-5xl">
        {item.name}
      </h2>
      {item.summary ? (
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-[15px]">
          {item.summary}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:opacity-80"
          >
            打开 →
          </a>
        ) : null}
        {item.repoUrl ? (
          <a
            href={item.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            仓库 →
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          编辑
        </button>
      </div>
    </article>
  );
}

function ProjectEditor({
  item,
  onCancel,
  onSaved,
  onDeleted,
}: {
  item?: Project;
  onCancel: () => void;
  onSaved: (item: Project) => void;
  onDeleted?: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [slug, setSlug] = useState(item?.slug ?? "");
  const [area, setArea] = useState<ProjectArea>(
    item && isProjectArea(item.area) ? item.area : "personal",
  );
  const [summary, setSummary] = useState(item?.summary ?? "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [repoUrl, setRepoUrl] = useState(item?.repoUrl ?? "");
  const [skillRef, setSkillRef] = useState(item?.skillRef ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        area,
        summary: summary.trim(),
        url: url.trim(),
        repoUrl: repoUrl.trim(),
        skillRef: skillRef.trim(),
      };
      const res = item
        ? await fetch(`/api/projects/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = (await res.json().catch(() => ({}))) as {
        item?: Project;
        error?: string;
      };
      if (!res.ok || !data.item) {
        setError(data.error || "保存失败");
        return;
      }
      onSaved(data.item);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!item || busy) return;
    if (!confirm(`删除「${item.name}」？`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${item.id}`, { method: "DELETE" });
      if (res.ok) onDeleted?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="名称"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="slug（可空，自动生成）"
        />
        <Input
          value={skillRef}
          onChange={(e) => setSkillRef(e.target.value)}
          placeholder="skill 名，可空"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {AREAS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setArea(value)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs",
              area === value
                ? "border-primary bg-[#FBE7E1] text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {PROJECT_AREA_META[value].label}
          </button>
        ))}
      </div>
      <Textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={3}
        placeholder="一句话，给人和 AI 看"
      />
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="线上地址"
      />
      <Input
        value={repoUrl}
        onChange={(e) => setRepoUrl(e.target.value)}
        placeholder="仓库地址"
      />
      {error ? <p className="text-xs text-primary">{error}</p> : null}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => void save()} disabled={busy || !name.trim()}>
          保存
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={busy}>
          取消
        </Button>
        {item && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void remove()}
            disabled={busy}
          >
            删除
          </Button>
        )}
      </div>
    </div>
  );
}
