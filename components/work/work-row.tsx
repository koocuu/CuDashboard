"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { Check, GripVertical, Pin, Trash2 } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { WorkItem, WorkStatus } from "@/lib/db/schema";
import {
  NEXT_STATUS_BY_DOT,
  STATUS_META,
} from "@/lib/work-meta";
import { cn } from "@/lib/utils";
import { CategoryPicker } from "./category-picker";

/** 从点击坐标推断文本光标偏移；失败时落到 fallback。 */
function caretOffsetFromPoint(clientX: number, clientY: number, fallback: number) {
  const doc = document as Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  if (typeof doc.caretPositionFromPoint === "function") {
    const pos = doc.caretPositionFromPoint(clientX, clientY);
    if (pos?.offsetNode?.nodeType === Node.TEXT_NODE) return pos.offset;
  }
  if (typeof doc.caretRangeFromPoint === "function") {
    const range = doc.caretRangeFromPoint(clientX, clientY);
    if (range?.startContainer?.nodeType === Node.TEXT_NODE) {
      return range.startOffset;
    }
  }
  return fallback;
}

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
  const [editingNote, setEditingNote] = useState(false);
  const [nameCaret, setNameCaret] = useState<number | null>(null);
  const [noteCaret, setNoteCaret] = useState<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (!editingName || !nameInputRef.current) return;
    const el = nameInputRef.current;
    const len = el.value.length;
    const offset = Math.max(0, Math.min(nameCaret ?? len, len));
    el.focus();
    el.setSelectionRange(offset, offset);
  }, [editingName, nameCaret]);

  useLayoutEffect(() => {
    if (!editingNote || !noteInputRef.current) return;
    const el = noteInputRef.current;
    const len = el.value.length;
    const offset = Math.max(0, Math.min(noteCaret ?? len, len));
    el.focus();
    el.setSelectionRange(offset, offset);
  }, [editingNote, noteCaret]);

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
            ref={nameInputRef}
            defaultValue={item.name}
            className="w-full bg-transparent text-sm font-medium outline-none"
            onBlur={(e) => {
              setEditingName(false);
              setNameCaret(null);
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
            onClick={(e) => {
              setNameCaret(
                caretOffsetFromPoint(e.clientX, e.clientY, item.name.length),
              );
              setEditingName(true);
            }}
            className={cn(
              "cursor-text text-sm font-medium text-foreground",
              done && "text-muted-foreground line-through",
            )}
          >
            {item.name}
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <CategoryPicker
            variant="inline"
            value={item.category}
            options={categoryOptions}
            onChange={(category) => onPatch(item.id, { category })}
          />

          <span
            className={cn(
              "inline-flex h-5 items-center rounded-md px-1.5 text-[11px] leading-none",
              meta.chip,
            )}
          >
            {meta.label}
          </span>
        </div>

        {editingNote ? (
          <textarea
            ref={noteInputRef}
            defaultValue={item.note}
            placeholder="一句话备注"
            rows={Math.min(6, Math.max(2, (item.note || "").split("\n").length + 1))}
            className="mt-1 w-full resize-y bg-transparent text-[11px] leading-4 text-muted-foreground outline-none"
            onBlur={(e) => {
              setEditingNote(false);
              setNoteCaret(null);
              const v = e.target.value;
              if (v !== item.note) onPatch(item.id, { note: v });
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditingNote(false);
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.currentTarget.blur();
              }
            }}
          />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              const fallback = item.note?.length ?? 0;
              setNoteCaret(
                item.note
                  ? caretOffsetFromPoint(e.clientX, e.clientY, fallback)
                  : 0,
              );
              setEditingNote(true);
            }}
            className="mt-1 w-full whitespace-pre-wrap break-words text-left text-[11px] leading-4 text-muted-foreground/80"
          >
            {item.note || <span className="opacity-50">+ 备注</span>}
          </button>
        )}
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
