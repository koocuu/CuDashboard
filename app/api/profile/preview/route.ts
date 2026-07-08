import { NextRequest, NextResponse } from "next/server";
import { buildContextPackage, resolveLayers } from "@/lib/context-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/profile/preview?layers=core,status(session 内部用):返回组装后的 Markdown。 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const layers = resolveLayers(
    url.searchParams.get("profile"),
    url.searchParams.get("layers"),
  );
  const markdown = await buildContextPackage(layers, {
    includeUpdateProtocol: true,
  });
  return NextResponse.json({ markdown });
}
