import { NextRequest, NextResponse } from "next/server";
import { sql, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  normalizeWorkStatus,
  workItems,
  type WorkStatus,
} from "@/lib/db/schema";
import { listWorkItems } from "@/lib/queries/work";

export const runtime = "nodejs";

function parseStatus(value: unknown): WorkStatus {
  return typeof value === "string" ? normalizeWorkStatus(value) : "someday";
}

export async function GET() {
  const items = await listWorkItems();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
  }

  const status = parseStatus(body.status);

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${workItems.sortOrder}), 0)` })
    .from(workItems)
    .where(isNull(workItems.deletedAt));

  const [item] = await db
    .insert(workItems)
    .values({
      name,
      category: typeof body.category === "string" ? body.category.trim() : "",
      note: typeof body.note === "string" ? body.note : "",
      pinned: body.pinned === true,
      status,
      sortOrder: Number(max) + 1,
      doneAt: status === "done" ? new Date() : null,
    })
    .returning();

  return NextResponse.json({ item }, { status: 201 });
}
