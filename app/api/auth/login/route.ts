import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import "@/lib/env-loader";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

// 简单内存速率限制:5 次/分钟/IP
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "尝试过于频繁,请稍后再试" },
      { status: 429 },
    );
  }

  const { password } = await req.json().catch(() => ({ password: "" }));
  const hash = process.env.AUTH_PASSWORD_HASH;

  if (!hash) {
    return NextResponse.json(
      { error: "服务器未配置密码(AUTH_PASSWORD_HASH)" },
      { status: 500 },
    );
  }

  const ok = typeof password === "string" && (await bcrypt.compare(password, hash));
  if (!ok) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const token = await createSessionToken();
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
