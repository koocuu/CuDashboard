import { NextRequest, NextResponse } from "next/server";
import { saveLayer, isValidLayer } from "@/lib/queries/profile";
import { extractPublicStatusForWebsite } from "@/lib/status-sections";
import { syncPublicLayerToWebsite } from "@/lib/website-sync";

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

  let websiteSync: { ok: boolean; warning?: string; path?: string } | undefined;
  if (layer === "status") {
    const publicSection = extractPublicStatusForWebsite(content);
    if (publicSection.trim()) {
      const sync = await syncPublicLayerToWebsite(publicSection);
      websiteSync = sync.ok
        ? { ok: true, path: sync.path }
        : { ok: false, warning: sync.error };
    }
  }

  return NextResponse.json({ layer: saved, websiteSync });
}
