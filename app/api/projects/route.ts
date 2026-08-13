import { NextRequest, NextResponse } from "next/server";
import {
  insertProject,
  listProjects,
  nextProjectSortOrder,
} from "@/lib/queries/projects";
import { isProjectArea, slugifyProject } from "@/lib/project-meta";

export const runtime = "nodejs";

export async function GET() {
  const items = await listProjects();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
  }

  const slugRaw = typeof body.slug === "string" ? body.slug.trim() : "";
  const slug = slugifyProject(slugRaw || name);
  const area =
    typeof body.area === "string" && isProjectArea(body.area)
      ? body.area
      : "personal";

  try {
    const item = await insertProject({
      name,
      slug,
      area,
      summary: typeof body.summary === "string" ? body.summary.trim() : "",
      url: typeof body.url === "string" ? body.url.trim() : "",
      repoUrl: typeof body.repoUrl === "string" ? body.repoUrl.trim() : "",
      skillRef: typeof body.skillRef === "string" ? body.skillRef.trim() : "",
      sortOrder: await nextProjectSortOrder(),
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json({ error: "slug 已存在" }, { status: 409 });
    }
    throw error;
  }
}