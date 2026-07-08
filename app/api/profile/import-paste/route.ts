import { NextRequest, NextResponse } from "next/server";
import {
  PROFILE_UPDATE_TEMPLATE,
  parseUpdateBlock,
} from "@/lib/profile-update-parser";
import { createProposal } from "@/lib/proposals";

export const runtime = "nodejs";

/**
 * POST /api/profile/import-paste  { text }
 * 解析“更新块”文本 → 创建 proposal(source=paste)。
 * 格式非法时返回明确错误。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) {
    return NextResponse.json(
      { error: "内容为空", template: PROFILE_UPDATE_TEMPLATE },
      { status: 400 },
    );
  }

  const parsed = parseUpdateBlock(text);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, template: PROFILE_UPDATE_TEMPLATE },
      { status: 400 },
    );
  }

  const proposal = await createProposal({
    layer: parsed.update.layer,
    proposedContentMd: parsed.update.content,
    summary: parsed.update.summary,
    source: "paste",
    sourceName: "粘贴导入",
    distributionWrapperCleaned: parsed.update.distributionWrapperCleaned,
  });

  return NextResponse.json({ proposal }, { status: 201 });
}
