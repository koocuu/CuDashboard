import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// 无需登录即可访问的路径前缀
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

// 备份 cron 由 CRON_SECRET 保护;公开 AI API 由 Bearer token 自校验,均不走 session
// 前缀匹配:整个子树都放行
const BYPASS_PREFIXES = ["/.well-known", "/oauth", "/c", "/api/cron", "/api/context", "/api/export", "/api/import", "/api/search", "/api/mcp"];
// 精确匹配:仅该路径放行(子路径如 /api/profile/proposals/[id] 仍需 session)
const BYPASS_EXACT = ["/api/profile/proposals"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    BYPASS_PREFIXES.some((p) => pathname.startsWith(p)) ||
    BYPASS_EXACT.includes(pathname)
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = await verifySessionToken(token);

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // 已登录访问登录页 → 进首页
  if (authed && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (!authed && !isPublic) {
    // 页面重定向到登录;API 返回 401
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // 排除静态资源与 PWA 文件
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|sw.js).*)",
  ],
};
