import { buildSharedContextHtml, htmlResponse } from "@/lib/context-share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const html = await buildSharedContextHtml(slug, "full");

  if (!html) {
    return htmlResponse("<!doctype html><title>Not found</title><p>Not found</p>", 404);
  }

  return htmlResponse(html);
}
