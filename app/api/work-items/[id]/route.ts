import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { workItems, WORK_STATUSES, type WorkStatus } from "@/lib/db/schema";

export const runtime = "nodejs";

function parseId(param: string): number | null {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isWorkStatus(value: unknown): value is WorkStatus {
  return typeof value === "string" && WORK_STATUSES.includes(value as WorkStatus);
}

function isClosedStatus(status: WorkStatus) {
  return status === "done" || status === "archived";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = parseId(idStr);
  if (!id) return NextResponse.json({ error: "无效 id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const patch: Partial<typeof workItems.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
    }
    patch.name = name;
  }

  if (typeof body.note === "string") patch.note = body.note;
  if (typeof body.pinned === "boolean") patch.pinned = body.pinned;

  if (body.status !== undefined) {
    if (!isWorkStatus(body.status)) {
      return NextResponse.json({ error: "无效状态" }, { status: 400 });
    }
    patch.status = body.status;
    patch.doneAt = isClosedStatus(body.status) ? new Date() : null;
  }

  const [item] = await db
    .update(workItems)
    .set(patch)
    .where(and(eq(workItems.id, id), isNull(workItems.deletedAt)))
    .returning();

  if (!item) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = parseId(idStr);
  if (!id) return NextResponse.json({ error: "无效 id" }, { status: 400 });

  const [item] = await db
    .update(workItems)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(workItems.id, id), isNull(workItems.deletedAt)))
    .returning();

  if (!item) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
