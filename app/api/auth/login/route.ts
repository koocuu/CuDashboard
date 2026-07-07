import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import "@/lib/env-loader";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

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

function cleanEnv(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: "尝试过于频繁,请稍后再试" },
        { status: 429 },
      );
    }

    const { password } = await req.json().catch(() => ({ password: "" }));
    const hash = cleanEnv(process.env.AUTH_PASSWORD_HASH);
    const jwtSecret = cleanEnv(process.env.JWT_SECRET);

    if (!hash) {
      return NextResponse.json(
        { error: "服务器未配置 AUTH_PASSWORD_HASH" },
        { status: 500 },
      );
    }
    if (!jwtSecret) {
      return NextResponse.json(
        { error: "服务器未配置 JWT_SECRET" },
        { status: 500 },
      );
    }

    process.env.AUTH_PASSWORD_HASH = hash;
    process.env.JWT_SECRET = jwtSecret;

    const ok =
      typeof password === "string" && (await bcrypt.compare(password, hash));
    if (!ok) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    const token = await createSessionToken();
    await setSessionCookie(token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("login failed", error);
    return NextResponse.json(
      { error: "登录服务异常,请检查 Vercel 环境变量" },
      { status: 500 },
    );
  }
}
