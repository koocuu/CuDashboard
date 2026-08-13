import { NextRequest, NextResponse } from "next/server";
import { softDeleteProject, updateProject } from "@/lib/queries/projects";
import { isProjectArea, slugifyProject } from "@/lib/project-meta";

export const runtime = "nodejs";

function parseId(param: string): number | null {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = parseId(idStr);
  if (!id) return NextResponse.json({ error: "无效 id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const patch: Parameters<typeof updateProject>[1] = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
    patch.name = name;
  }
  if (typeof body.slug === "string") {
    const slug = slugifyProject(body.slug);
    if (!slug) return NextResponse.json({ error: "slug 不能为空" }, { status: 400 });
    patch.slug = slug;
  }
  if (body.area !== undefined) {
    if (typeof body.area !== "string" || !isProjectArea(body.area)) {
      return NextResponse.json({ error: "无效领域" }, { status: 400 });
    }
    patch.area = body.area;
  }
  if (typeof body.summary === "string") patch.summary = body.summary.trim();
  if (typeof body.url === "string") patch.url = body.url.trim();
  if (typeof body.repoUrl === "string") patch.repoUrl = body.repoUrl.trim();
  if (typeof body.skillRef === "string") patch.skillRef = body.skillRef.trim();

  try {
    const item = await updateProject(id, patch);
    if (!item) return NextResponse.json({ error: "未找到" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json({ error: "slug 已存在" }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = parseId(idStr);
  if (!id) return NextResponse.json({ error: "无效 id" }, { status: 400 });
  const ok = await softDeleteProject(id);
  if (!ok) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ ok: true });
}