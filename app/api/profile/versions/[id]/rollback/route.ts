import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profileVersions } from "@/lib/db/schema";
import { saveLayer, isValidLayer } from "@/lib/queries/profile";

export const runtime = "nodejs";

/** POST /api/profile/versions/[id]/rollback:回滚到某历史版本。 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "无效 id" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(profileVersions)
    .where(eq(profileVersions.id, id))
    .limit(1);
  const ver = rows[0];
  if (!ver) return NextResponse.json({ error: "未找到版本" }, { status: 404 });
  if (!isValidLayer(ver.layer)) {
    return NextResponse.json({ error: "层非法" }, { status: 400 });
  }

  // saveLayer 会把当前版本归档,再写入历史内容
  const saved = await saveLayer(ver.layer, ver.contentMd);
  return NextResponse.json({ ok: true, layer: saved });
}
