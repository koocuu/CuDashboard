"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
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
import { WORK_ITEM_CREATED_EVENT } from "@/components/quick-add";
import { WorkRow } from "./work-row";

const COMPLETED: WorkStatus[] = ["done"];
const DROP_PREFIX = "work-status:";

function statusDropId(status: WorkStatus) {
  return `${DROP_PREFIX}${status}`;
}

function statusFromDropId(id: string | number): WorkStatus | null {
  if (typeof id !== "string" || !id.startsWith(DROP_PREFIX)) return null;
  const status = id.slice(DROP_PREFIX.length);
  return STATUS_META[status as WorkStatus]
    ? (status as WorkStatus)
    : null;
}

function itemStatus(item: WorkItem): WorkStatus {
  return item.status as WorkStatus;
}

function statusOrderIndex(status: WorkStatus) {
  const order = [...ACTIVE_GROUP_ORDER, "done" as WorkStatus];
  const index = order.indexOf(status);
  return index === -1 ? order.length : index;
}

function insertIndexForStatus(items: WorkItem[], status: WorkStatus) {
  const lastInTarget = items.findLastIndex((item) => itemStatus(item) === status);
  if (lastInTarget !== -1) return lastInTarget + 1;

  const targetOrder = statusOrderIndex(status);
  const nextGroup = items.findIndex(
    (item) => statusOrderIndex(itemStatus(item)) > targetOrder,
  );
  return nextGroup === -1 ? items.length : nextGroup;
}

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
  const [draggingId, setDraggingId] = useState<number | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    function onCreated(event: Event) {
      const item = (event as CustomEvent<WorkItem>).detail;
      if (!item?.id) return;
      setItems((prev) =>
        prev.some((existing) => existing.id === item.id) ? prev : [...prev, item],
      );
    }
    window.addEventListener(WORK_ITEM_CREATED_EVENT, onCreated);
    return () => window.removeEventListener(WORK_ITEM_CREATED_EVENT, onCreated);
  }, []);

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
        body: JSON.stringify({ name, status: "someday" }),
      });
      if (res.ok) {
        const { item } = (await res.json()) as { item: WorkItem };
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
    const { item } = (await res.json()) as { item: WorkItem };
    setItems((cur) => cur.map((i) => (i.id === id ? item : i)));
  }

  async function deleteItem(id: number) {
    const prev = items;
    setItems((cur) => cur.filter((i) => i.id !== id));
    const res = await fetch(`/api/work-items/${id}`, { method: "DELETE" });
    if (!res.ok) setItems(prev);
  }

  async function persistOrder(next: WorkItem[], prev: WorkItem[]) {
    const res = await fetch("/api/work-items/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: next.map((item) => ({
          id: item.id,
          status: item.status,
        })),
      }),
    });
    if (!res.ok) setItems(prev);
  }

  function onDragStart(e: DragStartEvent) {
    const id = Number(e.active.id);
    setDraggingId(Number.isInteger(id) ? id : null);
  }

  function onDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    const { active: a, over } = e;
    if (!over) return;
    if (a.id === over.id) return;

    const activeId = Number(a.id);
    const activeItem = items.find((item) => item.id === activeId);
    if (!activeItem) return;

    const overDropStatus = statusFromDropId(over.id);
    const overItem = items.find((item) => item.id === Number(over.id));
    const targetStatus = overDropStatus ?? (overItem ? itemStatus(overItem) : null);
    if (!targetStatus) return;

    const prev = items;
    const oldIndex = items.findIndex((i) => i.id === activeId);
    let next: WorkItem[];

    if (overItem && itemStatus(activeItem) === targetStatus) {
      const newIndex = items.findIndex((i) => i.id === overItem.id);
      if (oldIndex < 0 || newIndex < 0) return;
      next = arrayMove(items, oldIndex, newIndex);
    } else {
      const updatedActive = { ...activeItem, status: targetStatus };
      const withoutActive = items.filter((i) => i.id !== activeId);
      const overIndex = overItem
        ? withoutActive.findIndex((item) => item.id === overItem.id)
        : -1;
      const insertIndex =
        overIndex === -1
          ? insertIndexForStatus(withoutActive, targetStatus)
          : overIndex;
      next = [...withoutActive];
      next.splice(insertIndex, 0, updatedActive);
    }

    setItems(next);
    void persistOrder(next, prev);
  }

  function onDragCancel() {
    setDraggingId(null);
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
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        {ACTIVE_GROUP_ORDER.map((status) => {
          const group = active
            .filter((item) => item.status === status)
            .sort((a, b) => Number(b.pinned) - Number(a.pinned));
          if (group.length === 0 && draggingId === null) return null;
          return (
            <WorkGroupSection
              key={status}
              status={status}
            >
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
                  {group.length === 0 && (
                    <p className="rounded-lg border border-dashed py-3 text-center text-xs text-muted-foreground/70">
                      拖到这里
                    </p>
                  )}
                </div>
              </SortableContext>
            </WorkGroupSection>
          );
        })}

        {active.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            还没有事项,先记一条。
          </p>
        )}

        {(completed.length > 0 || draggingId !== null) && (
          <WorkGroupSection
            status="done"
          >
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="flex items-center gap-1 text-sm font-normal text-muted-foreground"
            >
              {showCompleted ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              已完成
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
            {completed.length === 0 && (
              <p className="rounded-lg border border-dashed py-3 text-center text-xs text-muted-foreground/70">
                拖到这里完成
              </p>
            )}
          </WorkGroupSection>
        )}
      </DndContext>
    </div>
  );
}

function WorkGroupSection({
  status,
  children,
}: {
  status: WorkStatus;
  children: ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: statusDropId(status),
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "space-y-1.5 rounded-lg transition-colors",
        isOver && "bg-muted/40",
      )}
    >
      {children}
    </section>
  );
}
