import { NextRequest, NextResponse } from "next/server";
import { sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  LEGACY_WORK_STATUS_MAP,
  WORK_STATUSES,
  normalizeWorkStatus,
  workItems,
  type WorkStatus,
} from "@/lib/db/schema";

export const runtime = "nodejs";

function parseStatus(value: unknown): WorkStatus | null {
  if (
    typeof value === "string" &&
    ((WORK_STATUSES as readonly string[]).includes(value) ||
      value in LEGACY_WORK_STATUS_MAP)
  ) {
    return normalizeWorkStatus(value);
  }
  return null;
}

/**
 * 批量重排:body { ids: number[] } 或 { items: { id, status }[] }。
 * 一次 SQL(CASE)完成,避免多次往返。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const itemInput: unknown = body.items;
  if (Array.isArray(itemInput)) {
    const entries = itemInput.map((entry) => {
      if (
        !entry ||
        typeof entry !== "object" ||
        !("id" in entry) ||
        !Number.isInteger(entry.id)
      ) {
        return null;
      }
      const status = parseStatus("status" in entry ? entry.status : null);
      if (!status) return null;
      return { id: entry.id as number, status };
    });
    if (entries.some((entry) => entry === null)) {
      return NextResponse.json({ error: "items 无效" }, { status: 400 });
    }

    const validEntries = entries as { id: number; status: WorkStatus }[];
    if (validEntries.length === 0) return NextResponse.json({ ok: true });

    const idList = validEntries.map((entry) => entry.id);
    const orderCases = sql.join(
      validEntries.map(
        (entry, i) => sql`when ${workItems.id} = ${entry.id} then ${i}`,
      ),
      sql` `,
    );
    const statusCases = sql.join(
      validEntries.map(
        (entry) =>
          sql`when ${workItems.id} = ${entry.id} then ${entry.status}`,
      ),
      sql` `,
    );
    const doneAtCases = sql.join(
      validEntries.map((entry) =>
        entry.status === "done"
          ? sql`when ${workItems.id} = ${entry.id} then coalesce(${workItems.doneAt}, now())`
          : sql`when ${workItems.id} = ${entry.id} then null`,
      ),
      sql` `,
    );

    await db
      .update(workItems)
      .set({
        sortOrder: sql`case ${orderCases} else ${workItems.sortOrder} end`,
        status: sql`case ${statusCases} else ${workItems.status} end`,
        doneAt: sql`case ${doneAtCases} else ${workItems.doneAt} end`,
        updatedAt: new Date(),
      })
      .where(inArray(workItems.id, idList));

    return NextResponse.json({ ok: true });
  }

  const ids: unknown = body.ids;
  if (!Array.isArray(ids) || ids.some((n) => !Number.isInteger(n))) {
    return NextResponse.json({ error: "ids 无效" }, { status: 400 });
  }
  if (ids.length === 0) return NextResponse.json({ ok: true });

  const idList = ids as number[];
  const cases = sql.join(
    idList.map((id, i) => sql`when ${workItems.id} = ${id} then ${i}`),
    sql` `,
  );

  await db
    .update(workItems)
    .set({ sortOrder: sql`case ${cases} else ${workItems.sortOrder} end` })
    .where(inArray(workItems.id, idList));

  return NextResponse.json({ ok: true });
}
