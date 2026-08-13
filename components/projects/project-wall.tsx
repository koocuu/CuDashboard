"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Project, ProjectArea, ProjectStatus } from "@/lib/db/schema";
import {
  PROJECT_AREA_META,
  PROJECT_STATUS_META,
  PROJECT_STATUS_ORDER,
  isProjectArea,
  isProjectStatus,
} from "@/lib/project-meta";
import { cn } from "@/lib/utils";

const AREAS: ProjectArea[] = ["personal", "work", "writing"];

export function ProjectWall({ initialItems }: { initialItems: Project[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  function replace(next: Project) {
    setItems((cur) => cur.map((item) => (item.id === next.id ? next : item)));
  }

  function remove(id: number) {
    setItems((cur) => cur.filter((item) => item.id !== id));
  }

  function add(item: Project) {
    setItems((cur) => [...cur, item]);
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-sm font-normal text-muted-foreground">作品墙</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            上线的和正在做的。给自己看，也给 AI 读。
          </p>
        </div>
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          <Plus className="h-3.5 w-3.5" />
          {adding ? "收起" : "新作品"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 border-b pb-4">
        {PROJECT_STATUS_ORDER.map((status) => {
          const count = items.filter((item) => item.status === status).length;
          return (
            <div key={status}>
              <p className="font-mono text-2xl leading-none">{count}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {PROJECT_STATUS_META[status].label}
              </p>
            </div>
          );
        })}
      </div>

      {adding && (
        <ProjectEditor
          onCancel={() => setAdding(false)}
          onSaved={add}
        />
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {PROJECT_STATUS_ORDER.map((status) => {
          const group = items.filter((item) => item.status === status);
          return (
            <section key={status} className="space-y-3">
              <h2 className="border-b pb-2 text-sm text-muted-foreground">
                {PROJECT_STATUS_META[status].label}
                <span className="ml-2 font-mono text-[11px]">
                  {String(group.length).padStart(2, "0")}
                </span>
              </h2>
              {group.length === 0 ? (
                <p className="text-xs text-muted-foreground/70">空</p>
              ) : (
                <div className="space-y-4">
                  {group.map((item) => (
                    <ProjectCard
                      key={item.id}
                      item={item}
                      onPatch={replace}
                      onDelete={remove}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ProjectCard({
  item,
  onPatch,
  onDelete,
}: {
  item: Project;
  onPatch: (item: Project) => void;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const status = isProjectStatus(item.status) ? item.status : "building";
  const area = isProjectArea(item.area) ? item.area : "personal";
  const meta = PROJECT_STATUS_META[status];

  if (editing) {
    return (
      <ProjectEditor
        item={item}
        onCancel={() => setEditing(false)}
        onSaved={(next) => {
          onPatch(next);
          setEditing(false);
        }}
        onDeleted={() => onDelete(item.id)}
      />
    );
  }

  return (
    <article className={cn("border-l-2 pl-3", meta.bar)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-medium leading-6">{item.name}</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {PROJECT_AREA_META[area].label}
            {item.skillRef ? ` · ${item.skillRef}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
        >
          编辑
        </button>
      </div>
      {item.summary ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
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
  const [status, setStatus] = useState<ProjectStatus>(
    item && isProjectStatus(item.status) ? item.status : "building",
  );
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
        status,
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
    <div className="space-y-2 rounded-lg border bg-card p-3">
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
        {PROJECT_STATUS_ORDER.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs",
              status === value
                ? PROJECT_STATUS_META[value].chip
                : "border-border text-muted-foreground",
            )}
          >
            {PROJECT_STATUS_META[value].label}
          </button>
        ))}
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
          <Button size="sm" variant="ghost" onClick={() => void remove()} disabled={busy}>
            删除
          </Button>
        )}
      </div>
    </div>
  );
}