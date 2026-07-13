import { NextRequest, NextResponse } from "next/server";
import { verifyRequestToken } from "@/lib/auth/tokens";
import { createTopicBatch, getLatestTopicBatch } from "@/lib/queries/topics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/topic-batches（需 write token）
 * Body: { summary, content_md, candidates?, day?, generated_at? }
 * 写入首页「今日选题」区块，不走画像提案。
 */
export async function POST(req: NextRequest) {
  const auth = await verifyRequestToken(req, "write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));
  const summary =
    typeof body.summary === "string" ? body.summary.trim() : "";
  const contentMd =
    typeof body.content_md === "string"
      ? body.content_md
      : typeof body.contentMd === "string"
        ? body.contentMd
        : "";
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];
  const dayRaw =
    typeof body.day === "string"
      ? body.day
      : typeof body.generated_at === "string"
        ? body.generated_at.slice(0, 10)
        : new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayRaw)) {
    return NextResponse.json({ error: "day 须为 YYYY-MM-DD" }, { status: 400 });
  }
  if (!contentMd.trim() && candidates.length === 0) {
    return NextResponse.json(
      { error: "content_md 或 candidates 至少提供一项" },
      { status: 400 },
    );
  }

  const batch = await createTopicBatch({
    day: dayRaw,
    summary: summary || `每日选题候选 ${dayRaw}`,
    contentMd: contentMd.trim() || "",
    candidates,
    sourceName: auth.name || "topic-radar",
  });

  return NextResponse.json({ batch }, { status: 201 });
}

/** GET /api/topic-batches（需 write token）: 取最新一批，便于脚本自检。 */
export async function GET(req: NextRequest) {
  const auth = await verifyRequestToken(req, "write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const batch = await getLatestTopicBatch();
  return NextResponse.json({ batch });
}
