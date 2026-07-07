import { NextRequest } from "next/server";
import { verifyRequestToken } from "@/lib/auth/tokens";
import { exportMarkdownFiles } from "@/lib/export";
import { zipMarkdownFiles } from "@/lib/zip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/export（需 read token）：全量数据导出为目录化 Markdown ZIP。 */
export async function GET(req: NextRequest) {
  const auth = await verifyRequestToken(req, "read");
  if (!auth.ok) {
    return new Response(auth.error, { status: auth.status });
  }

  const files = await exportMarkdownFiles();
  const zip = zipMarkdownFiles(files);
  const body = new Uint8Array(zip);
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="console-export-${stamp}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
