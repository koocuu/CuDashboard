import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { backupRuns } from "@/lib/db/schema";
import {
  commitFiles,
  isGithubBackupConfigured,
} from "@/lib/backup/github";
import { exportMarkdownFiles } from "@/lib/export";
import { formatDate } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 每日全量快照:每个实体渲染为一个 Markdown 文件(frontmatter 存结构化字段),
 * 一次 commit 推送到 GitHub 私有仓库。由 Vercel Cron 触发,CRON_SECRET 保护。
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // fail-closed:未配置密钥时禁用接口,而不是放行
    return NextResponse.json(
      { error: "未配置 CRON_SECRET,备份接口已禁用" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  // 未启用不是运行故障，不写 failed 记录，也不在首页制造红色告警。
  if (!isGithubBackupConfigured()) {
    return NextResponse.json(
      { ok: false, disabled: true, error: "GitHub 备份未启用" },
      { status: 503 },
    );
  }

  try {
    const stamp = new Date().toISOString().slice(0, 10);
    const files = await exportMarkdownFiles();

    await commitFiles(files, `backup: 每日快照 ${stamp}`);
    await db.insert(backupRuns).values({
      status: "success",
      message: `已备份 ${files.length} 个 Markdown 文件`,
    });

    return NextResponse.json({
      ok: true,
      count: files.length,
      at: formatDate(new Date()),
    });
  } catch (err) {
    const message = String(err instanceof Error ? err.message : err);
    await db
      .insert(backupRuns)
      .values({ status: "failed", message })
      .catch(() => {});
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
