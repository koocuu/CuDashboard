import { NextRequest } from "next/server";
import { verifyRequestToken } from "@/lib/auth/tokens";
import { buildContextPackage, resolveLayers } from "@/lib/context-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/context?token=xxx&profile=full|general 或 &layers=core,status
 * 返回纯 Markdown(text/plain),供联网 AI 直接读取。
 */
export async function GET(req: NextRequest) {
  const auth = await verifyRequestToken(req, "read");
  if (!auth.ok) {
    return new Response(auth.error, {
      status: auth.status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const url = new URL(req.url);
  const layers = resolveLayers(
    url.searchParams.get("profile"),
    url.searchParams.get("layers"),
  );
  const md = await buildContextPackage(layers);

  return new Response(md, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
