import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import {
  OAUTH_TOOL_PERMISSIONS,
  getOAuthClient,
  publicOrigin,
  redirectUriMatches,
  storeAuthorizationCode,
} from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AuthorizationRequest {
  clientId: string;
  clientName: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  resource: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function isLoggedIn(req: NextRequest) {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

async function parseAuthorizationParams(
  params: URLSearchParams,
  origin: string,
): Promise<
  | { ok: true; value: AuthorizationRequest }
  | { ok: false; message: string; redirectUri?: string; state?: string }
> {
  const responseType = params.get("response_type") ?? "";
  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const state = params.get("state") ?? "";
  const codeChallenge = params.get("code_challenge") ?? "";
  const codeChallengeMethod = params.get("code_challenge_method") ?? "";
  const resource = params.get("resource") ?? "";

  if (responseType !== "code") {
    return { ok: false, message: "response_type must be code" };
  }
  if (!clientId || !redirectUri) {
    return { ok: false, message: "client_id and redirect_uri are required" };
  }

  const client = await getOAuthClient(clientId);
  if (!client) {
    return { ok: false, message: "Unknown OAuth client" };
  }
  if (!redirectUriMatches(client, redirectUri)) {
    return { ok: false, message: "redirect_uri is not registered" };
  }
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return {
      ok: false,
      message: "PKCE S256 code_challenge is required",
      redirectUri,
      state,
    };
  }
  if (resource) {
    try {
      const expectedResource = `${origin}/api/mcp`;
      const resourceUrl = new URL(resource);
      const expectedUrl = new URL(expectedResource);
      if (
        resourceUrl.protocol !== expectedUrl.protocol ||
        resourceUrl.host !== expectedUrl.host ||
        resourceUrl.pathname !== "/api/mcp"
      ) {
        return {
          ok: false,
          message: "resource must point to this server's /api/mcp",
          redirectUri,
          state,
        };
      }
    } catch {
      return {
        ok: false,
        message: "resource is invalid",
        redirectUri,
        state,
      };
    }
  }

  return {
    ok: true,
    value: {
      clientId,
      clientName: client.clientName,
      redirectUri,
      state,
      codeChallenge,
      resource,
    },
  };
}

function redirectWithOAuthError(
  redirectUri: string,
  error: string,
  state?: string,
) {
  const target = new URL(redirectUri);
  target.searchParams.set("error", error);
  if (state) target.searchParams.set("state", state);
  return NextResponse.redirect(target, 302);
}

function authorizationPage(req: AuthorizationRequest) {
  const permissions = OAUTH_TOOL_PERMISSIONS.map(
    (item) => `<li>${escapeHtml(item)}</li>`,
  ).join("");

  return html(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>授权 Console MCP</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #FAF7F1;
      --card: #FFFFFF;
      --text: #1E222A;
      --muted: #8A8880;
      --line: #E6E5E0;
      --accent: #E2694E;
    }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      width: min(420px, calc(100vw - 40px));
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--card);
      padding: 28px;
    }
    h1 { margin: 0 0 8px; font-size: 22px; }
    p, li { color: var(--muted); line-height: 1.7; }
    ul { margin: 16px 0 24px; padding-left: 20px; }
    .app { color: var(--text); font-weight: 600; }
    .actions { display: flex; gap: 12px; }
    button {
      flex: 1;
      height: 44px;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: #fff;
      color: var(--text);
      font: inherit;
      cursor: pointer;
    }
    button.primary {
      border-color: var(--accent);
      background: var(--accent);
      color: #fff;
    }
  </style>
</head>
<body>
  <main>
    <h1>授权连接 Console</h1>
    <p><span class="app">${escapeHtml(req.clientName)}</span> 请求连接你的 Console MCP。</p>
    <p>授权后,它可以:</p>
    <ul>${permissions}</ul>
    <form method="post" action="/oauth/authorize">
      <input type="hidden" name="client_id" value="${escapeHtml(req.clientId)}" />
      <input type="hidden" name="redirect_uri" value="${escapeHtml(req.redirectUri)}" />
      <input type="hidden" name="state" value="${escapeHtml(req.state)}" />
      <input type="hidden" name="code_challenge" value="${escapeHtml(req.codeChallenge)}" />
      <input type="hidden" name="resource" value="${escapeHtml(req.resource)}" />
      <div class="actions">
        <button name="decision" value="deny" type="submit">取消</button>
        <button class="primary" name="decision" value="approve" type="submit">授权连接</button>
      </div>
    </form>
  </main>
</body>
</html>`);
}

function errorPage(message: string) {
  return html(`<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8" /><title>OAuth 错误</title></head>
<body style="font-family: system-ui; padding: 32px; background: #FAF7F1; color: #1E222A;">
  <h1>OAuth 请求无效</h1>
  <p>${escapeHtml(message)}</p>
</body>
</html>`, 400);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (!(await isLoggedIn(req))) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", `${url.pathname}${url.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const parsed = await parseAuthorizationParams(
    url.searchParams,
    publicOrigin(req),
  );
  if (!parsed.ok) {
    if (parsed.redirectUri) {
      return redirectWithOAuthError(
        parsed.redirectUri,
        "invalid_request",
        parsed.state,
      );
    }
    return errorPage(parsed.message);
  }

  return authorizationPage(parsed.value);
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  if (!(await isLoggedIn(req))) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", `${url.pathname}${url.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const form = await req.formData();
  const params = new URLSearchParams();
  for (const key of [
    "client_id",
    "redirect_uri",
    "state",
    "code_challenge",
    "resource",
  ]) {
    params.set(key, String(form.get(key) ?? ""));
  }
  params.set("response_type", "code");
  params.set("code_challenge_method", "S256");

  const parsed = await parseAuthorizationParams(params, publicOrigin(req));
  if (!parsed.ok) {
    if (parsed.redirectUri) {
      return redirectWithOAuthError(
        parsed.redirectUri,
        "invalid_request",
        parsed.state,
      );
    }
    return errorPage(parsed.message);
  }

  if (form.get("decision") !== "approve") {
    return redirectWithOAuthError(
      parsed.value.redirectUri,
      "access_denied",
      parsed.value.state,
    );
  }

  const code = await storeAuthorizationCode({
    clientId: parsed.value.clientId,
    redirectUri: parsed.value.redirectUri,
    codeChallenge: parsed.value.codeChallenge,
  });

  const target = new URL(parsed.value.redirectUri);
  target.searchParams.set("code", code);
  if (parsed.value.state) target.searchParams.set("state", parsed.value.state);
  return NextResponse.redirect(target, 302);
}
