import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { formatDate } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 每月 1 号 09:00（Asia/Shanghai）提醒做月度审计。
 * Vercel Cron 按 UTC 配置为 `0 1 1 * *`。
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "未配置 CRON_SECRET，提醒接口已禁用" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.AUDIT_REMINDER_EMAIL?.trim();
  const from =
    process.env.AUDIT_REMINDER_FROM?.trim() || "Console <onboarding@resend.dev>";

  if (!apiKey || !to) {
    return NextResponse.json(
      {
        ok: false,
        disabled: true,
        error: "未配置 RESEND_API_KEY 或 AUDIT_REMINDER_EMAIL",
      },
      { status: 503 },
    );
  }

  const month = formatDate(new Date(), {
    year: "numeric",
    month: "2-digit",
  }).replace(/\//g, "-");

  const subject = `Console：该做 ${month} 月度审计了`;
  const text = `该做 ${month} 月度审计了。流程:与 AI 完成审计对话 → 批准审计提案 → 批准联动的 status 更新提案。`;

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      text,
    });
    if (error) {
      console.error("audit-reminder: Resend 失败", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, month, id: data?.id ?? null });
  } catch (error) {
    console.error("audit-reminder: 发送异常", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "发送失败",
      },
      { status: 500 },
    );
  }
}
