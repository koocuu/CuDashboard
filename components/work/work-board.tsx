"use client";

import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkItem, WorkStatus } from "@/lib/db/schema";
import { ACTIVE_GROUP_ORDER, STATUS_META } from "@/lib/work-meta";
import { cn } from "@/lib/utils";
import { WorkRow } from "./work-row";

const COMPLETED: WorkStatus[] = ["done", "archived"];

export function WorkBoard({
  initialItems,
  showQuickAdd = true,
}: {
  initialItems: WorkItem[];
  showQuickAdd?: boolean;
}) {
  const [items, setItems] = useState<WorkItem[]>(initialItems);
  const [newName, setNewName] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [adding, setAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
  );

  const active = items.filter((i) => !COMPLETED.includes(i.status as WorkStatus));
  const completed = items.filter((i) =>
    COMPLETED.includes(i.status as WorkStatus),
  );

  async function addItem() {
    const name = newName.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/work-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const { item } = await res.json();
        setItems((prev) => [...prev, item]);
        setNewName("");
      }
    } finally {
      setAdding(false);
    }
  }

  async function patchItem(id: number, patch: Partial<WorkItem>) {
    const prev = items;
    setItems((cur) =>
      cur.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    );
    const res = await fetch(`/api/work-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setItems(prev);
      return;
    }
    const { item } = await res.json();
    setItems((cur) => cur.map((i) => (i.id === id ? item : i)));
  }

  async function deleteItem(id: number) {
    const prev = items;
    setItems((cur) => cur.filter((i) => i.id !== id));
    const res = await fetch(`/api/work-items/${id}`, { method: "DELETE" });
    if (!res.ok) setItems(prev);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === a.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    fetch("/api/work-items/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((i) => i.id) }),
    });
  }

  return (
    <div className="space-y-3">
      {showQuickAdd && (
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="新增事项,回车添加"
          />
          <Button onClick={addItem} disabled={!newName.trim() || adding} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        {ACTIVE_GROUP_ORDER.map((status) => {
          const group = active
            .filter((item) => item.status === status)
            .sort((a, b) => Number(b.pinned) - Number(a.pinned));
          if (group.length === 0) return null;
          return (
            <section key={status} className="space-y-1.5">
              <h2 className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[status].dot)}
                />
                {STATUS_META[status].label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 font-mono text-[10px]",
                    STATUS_META[status].chip,
                  )}
                >
                  {String(group.length).padStart(2, "0")}
                </span>
              </h2>
              <SortableContext
                items={group.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div>
                  {group.map((item) => (
                    <WorkRow
                      key={item.id}
                      item={item}
                      onPatch={patchItem}
                      onDelete={deleteItem}
                    />
                  ))}
                </div>
              </SortableContext>
            </section>
          );
        })}

        {active.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            还没有进行中的事项,上面加一条吧。
          </p>
        )}

        {completed.length > 0 && (
          <section className="space-y-2">
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="flex items-center gap-1 text-sm font-normal text-muted-foreground"
            >
              {showCompleted ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              已完成 · 归档
              <span className="rounded-full bg-[#EAF1EB] px-1.5 py-0.5 font-mono text-[10px] text-positive">
                {String(completed.length).padStart(2, "0")}
              </span>
            </button>
            {showCompleted && (
              <SortableContext
                items={completed.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div>
                  {completed.map((item) => (
                    <WorkRow
                      key={item.id}
                      item={item}
                      onPatch={patchItem}
                      onDelete={deleteItem}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </section>
        )}
      </DndContext>
    </div>
  );
}
