import { NextRequest, NextResponse } from "next/server";
import { verifyRequestToken } from "@/lib/auth/tokens";
import { db } from "@/lib/db";
import {
  workItems,
  holdings,
  entries,
  PROFILE_LAYERS,
  type ProfileLayer,
} from "@/lib/db/schema";
import { saveLayer } from "@/lib/queries/profile";
import { isProposalOnlyLayer } from "@/lib/profile-meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 实体名 → 表 映射(批量导入)
const TABLES = {
  work_items: workItems,
  holdings,
  entries,
} as const;

type TableKey = keyof typeof TABLES;
const PROFILE_KEYS = new Set(["profile", "profiles", "profile_doc"]);

function isProfileLayer(v: unknown): v is ProfileLayer {
  return typeof v === "string" && (PROFILE_LAYERS as readonly string[]).includes(v);
}

async function importProfileRows(
  raw: unknown,
): Promise<{ count: number; skipped: string[] }> {
  const skipped: string[] = [];
  if (!raw) return { count: 0, skipped };

  if (!Array.isArray(raw) && typeof raw === "object") {
    let count = 0;
    for (const [layer, content] of Object.entries(raw as Record<string, unknown>)) {
      if (!isProfileLayer(layer)) continue;
      if (isProposalOnlyLayer(layer)) {
        skipped.push(layer);
        continue;
      }
      await saveLayer(layer, String(content ?? ""));
      count++;
    }
    return { count, skipped };
  }

  if (!Array.isArray(raw)) return { count: 0, skipped };

  let count = 0;
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const layer = r.layer;
    if (!isProfileLayer(layer)) continue;
    if (isProposalOnlyLayer(layer)) {
      skipped.push(layer);
      continue;
    }
    const content = r.contentMd ?? r.content_md ?? r.content ?? "";
    await saveLayer(layer, String(content));
    count++;
  }
  return { count, skipped };
}

/**
 * POST /api/import（需 write token):批量导入。
 * Body: { work_items: [...], holdings: [...], profile_doc: [...] }
 * 每个键对应一个专表,值为记录数组(camelCase 字段,省略 id/时间戳)。
 * profile_doc 可传数组或 { core: "...", status: "..." } 对象。
 * 用于初始迁移。
 */
export async function POST(req: NextRequest) {
  const auth = await verifyRequestToken(req, "write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "请求体需为 JSON 对象" }, { status: 400 });
  }

  const result: Record<string, number> = {};
  const errors: string[] = [];

  for (const key of Object.keys(body)) {
    if (PROFILE_KEYS.has(key)) {
      try {
        const imported = await importProfileRows(body[key]);
        result[key] = imported.count;
        for (const layer of imported.skipped) {
          errors.push(
            `${key}.${layer}: 非法或已废弃层,已跳过批量导入`,
          );
        }
      } catch (e) {
        errors.push(`${key}: ${e instanceof Error ? e.message : String(e)}`);
      }
      continue;
    }

    if (!(key in TABLES)) {
      errors.push(`未知实体:${key}`);
      continue;
    }
    const rows = body[key];
    if (!Array.isArray(rows) || rows.length === 0) {
      result[key] = 0;
      continue;
    }
    try {
      const table = TABLES[key as TableKey];
      // 逐条插入(容忍单条错误不影响其余)
      let ok = 0;
      for (const row of rows) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await db.insert(table).values(row as any);
          ok++;
        } catch (e) {
          errors.push(`${key}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      result[key] = ok;
    } catch (e) {
      errors.push(`${key}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ imported: result, errors });
}
