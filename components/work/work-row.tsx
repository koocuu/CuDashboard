"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { Check, GripVertical, Pin, Trash2 } from "lucide-react";
import { useState } from "react";
import type { WorkItem, WorkStatus } from "@/lib/db/schema";
import {
  NEXT_STATUS_BY_DOT,
  STATUS_META,
} from "@/lib/work-meta";
import { cn } from "@/lib/utils";

export interface WorkRowProps {
  item: WorkItem;
  categoryOptions: string[];
  onPatch: (id: number, patch: Partial<WorkItem>) => void;
  onDelete: (id: number) => void;
}

export function WorkRow({
  item,
  categoryOptions,
  onPatch,
  onDelete,
}: WorkRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const status = item.status as WorkStatus;
  const meta = STATUS_META[status];
  const done = status === "done";
  const nextStatus = NEXT_STATUS_BY_DOT[status];
  const [editingName, setEditingName] = useState(false);
  const [editingCategory, setEditingCategory] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const categoryListId = `work-category-options-${item.id}`;

  function advanceStatus() {
    onPatch(item.id, { status: nextStatus });
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "group flex items-start gap-2 border-b border-border/80 py-2",
        item.pinned && "border-l-2 border-l-primary pl-2",
        isDragging && "z-10 bg-card opacity-90",
      )}
    >
      <button
        className="mt-0.5 touch-none text-muted-foreground/50 hover:text-muted-foreground"
        aria-label="拖拽排序"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button
        onClick={advanceStatus}
        className="mt-1 shrink-0"
        aria-label={`推进到${STATUS_META[nextStatus].label}`}
        title={`推进到${STATUS_META[nextStatus].label}`}
      >
        <span
          className={cn(
            "flex h-3.5 w-3.5 items-center justify-center rounded-full",
            meta.dot,
          )}
        >
          {done && <Check className="h-2.5 w-2.5 text-white" />}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        {editingName ? (
          <input
            autoFocus
            defaultValue={item.name}
            className="w-full bg-transparent text-sm font-medium outline-none"
            onBlur={(e) => {
              setEditingName(false);
              const v = e.target.value.trim();
              if (v && v !== item.name) onPatch(item.id, { name: v });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setEditingName(false);
            }}
          />
        ) : (
          <div
            onClick={() => setEditingName(true)}
            className={cn(
              "cursor-text text-sm font-medium text-foreground",
              done && "text-muted-foreground line-through",
            )}
          >
            {item.name}
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {editingCategory ? (
            <>
              <input
                autoFocus
                list={categoryListId}
                defaultValue={item.category}
                placeholder="公司 / 个人 / 杂项"
                className="w-24 bg-transparent font-mono text-[11px] text-muted-foreground outline-none"
                onBlur={(e) => {
                  setEditingCategory(false);
                  const v = e.target.value.trim();
                  if (v !== item.category) onPatch(item.id, { category: v });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") setEditingCategory(false);
                }}
              />
              <datalist id={categoryListId}>
                {categoryOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditingCategory(true)}
              className={cn(
                "font-mono text-[11px]",
                item.category
                  ? "text-foreground/70 hover:text-foreground"
                  : "text-muted-foreground/50 hover:text-muted-foreground",
              )}
              title="编辑分类"
            >
              {item.category || "+ 分类"}
            </button>
          )}

          <span className={cn("font-mono text-[11px]", meta.badge)}>
            {meta.label}
          </span>

          {editingNote ? (
            <input
              autoFocus
              defaultValue={item.note}
              placeholder="一句话备注"
              className="min-w-40 flex-1 bg-transparent text-xs text-muted-foreground outline-none"
              onBlur={(e) => {
                setEditingNote(false);
                const v = e.target.value;
                if (v !== item.note) onPatch(item.id, { note: v });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setEditingNote(false);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingNote(true)}
              className="min-w-0 flex-1 truncate text-left text-xs text-muted-foreground"
            >
              {item.note || <span className="opacity-50">+ 备注</span>}
            </button>
          )}
        </div>
      </div>

      <button
        onClick={() => onPatch(item.id, { pinned: !item.pinned })}
        className={cn(
          "mt-0.5 text-muted-foreground/40 transition-colors hover:text-foreground",
          item.pinned && "text-primary",
        )}
        aria-label={item.pinned ? "取消置顶" : "置顶"}
        title={item.pinned ? "取消置顶" : "置顶"}
      >
        <Pin className={cn("h-4 w-4", item.pinned && "fill-current")} />
      </button>

      <button
        onClick={() => onDelete(item.id)}
        className="mt-0.5 text-muted-foreground/40 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        aria-label="删除"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
