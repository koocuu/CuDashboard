import { NextResponse } from "next/server";
import { getLiveRevision } from "@/lib/live-revision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/live-revision：登录态下返回数据版本号，供客户端热更新轮询。 */
export async function GET() {
  try {
    const revision = await getLiveRevision();
    return NextResponse.json(
      { revision },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "revision unavailable" }, { status: 503 });
  }
}
