import { NextRequest, NextResponse } from "next/server";
import { saveLayer, isValidLayer } from "@/lib/queries/profile";

export const runtime = "nodejs";

/** PATCH /api/profile/layers/[layer]:用户直接保存某层内容。 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ layer: string }> },
) {
  const { layer } = await params;
  if (!isValidLayer(layer)) {
    return NextResponse.json({ error: "无效层" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const content = typeof body.contentMd === "string" ? body.contentMd : "";
  const saved = await saveLayer(layer, content);
  return NextResponse.json({ layer: saved });
}
