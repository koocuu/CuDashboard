import { NextRequest, NextResponse } from "next/server";
import { saveLayer, isValidLayer } from "@/lib/queries/profile";
import { isProposalOnlyLayer } from "@/lib/profile-meta";

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
  if (isProposalOnlyLayer(layer)) {
    return NextResponse.json(
      {
        error:
          "public 层只能通过提案批准写入,不能直接编辑。请提交画像提案并在 diff 确认后批准。",
      },
      { status: 403 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const content = typeof body.contentMd === "string" ? body.contentMd : "";
  const saved = await saveLayer(layer, content);
  return NextResponse.json({ layer: saved });
}
