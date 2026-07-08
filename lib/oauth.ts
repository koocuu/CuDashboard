import crypto from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  oauthAuthorizationCodes,
  oauthAuthorizations,
  oauthClients,
  type OAuthClient,
} from "@/lib/db/schema";
import { hashToken } from "@/lib/auth/tokens";

export const OAUTH_SCOPES = ["read", "write"] as const;
export const OAUTH_SCOPE = OAUTH_SCOPES.join(" ");
export const OAUTH_PUBLIC_SCOPES = [...OAUTH_SCOPES, "offline_access"];
export const OAUTH_TOOL_PERMISSIONS = [
  "读取画像",
  "检索工作/持仓/条目",
  "提交画像修改提案",
] as const;

const CODE_TTL_MS = 10 * 60 * 1000;
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const OAUTH_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function publicOrigin(req: Request) {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0].trim();
    const proto = forwardedProto?.split(",")[0].trim() || "https";
    return `${proto}://${host}`;
  }
  return new URL(req.url).origin;
}

export function authorizationServerMetadata(req: Request) {
  const origin = publicOrigin(req);
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: OAUTH_PUBLIC_SCOPES,
  };
}

export function protectedResourceMetadata(req: Request) {
  const origin = publicOrigin(req);
  return {
    resource: `${origin}/api/mcp`,
    resource_name: "Console MCP",
    authorization_servers: [origin],
    scopes_supported: OAUTH_PUBLIC_SCOPES,
    bearer_methods_supported: ["header"],
  };
}

export function oauthJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...OAUTH_CORS_HEADERS,
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}

export function oauthOptions() {
  return new Response(null, {
    status: 200,
    headers: OAUTH_CORS_HEADERS,
  });
}

export function oauthError(
  error: string,
  description?: string,
  status = 400,
) {
  return oauthJson(
    description ? { error, error_description: description } : { error },
    status,
  );
}

function randomSecret(prefix: string) {
  return `${prefix}${crypto.randomBytes(32).toString("base64url")}`;
}

export function createClientId() {
  return randomSecret("cns_oauth_client_");
}

export function createCode() {
  return randomSecret("cns_oauth_code_");
}

export function createAccessToken() {
  return randomSecret("cns_oauth_access_");
}

export function createRefreshToken() {
  return randomSecret("cns_oauth_refresh_");
}

export async function createOAuthClient(input: {
  clientName: string;
  redirectUris: string[];
}) {
  const clientId = createClientId();
  const [client] = await db
    .insert(oauthClients)
    .values({
      clientId,
      clientName: input.clientName || "OAuth Client",
      redirectUris: input.redirectUris,
      scope: OAUTH_SCOPE,
      tokenEndpointAuthMethod: "none",
    })
    .returning();
  return client;
}

export async function getOAuthClient(clientId: string) {
  const [client] = await db
    .select()
    .from(oauthClients)
    .where(and(eq(oauthClients.clientId, clientId), isNull(oauthClients.revokedAt)))
    .limit(1);
  return client ?? null;
}

export function validRedirectUri(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    if (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function sameLoopbackIgnoringPort(registered: URL, requested: URL) {
  const loopback =
    requested.protocol === "http:" &&
    registered.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(requested.hostname) &&
    ["localhost", "127.0.0.1"].includes(registered.hostname);
  return (
    loopback &&
    registered.hostname === requested.hostname &&
    registered.pathname === requested.pathname &&
    registered.search === requested.search
  );
}

export function redirectUriMatches(client: OAuthClient, redirectUri: string) {
  if (!validRedirectUri(redirectUri)) return false;
  return client.redirectUris.some((registered) => {
    if (registered === redirectUri) return true;
    try {
      return sameLoopbackIgnoringPort(new URL(registered), new URL(redirectUri));
    } catch {
      return false;
    }
  });
}

export async function storeAuthorizationCode(input: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
}) {
  const code = createCode();
  await db.insert(oauthAuthorizationCodes).values({
    codeHash: hashToken(code),
    clientId: input.clientId,
    redirectUri: input.redirectUri,
    scope: OAUTH_SCOPE,
    codeChallenge: input.codeChallenge,
    codeChallengeMethod: "S256",
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });
  return code;
}

function pkceChallenge(verifier: string) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

async function issueTokens(input: {
  clientId: string;
  clientName: string;
}) {
  const accessToken = createAccessToken();
  const refreshToken = createRefreshToken();
  const accessExpiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const [authorization] = await db
    .insert(oauthAuthorizations)
    .values({
      clientId: input.clientId,
      clientName: input.clientName,
      scope: OAUTH_SCOPE,
      accessTokenHash: hashToken(accessToken),
      refreshTokenHash: hashToken(refreshToken),
      accessExpiresAt,
      refreshExpiresAt,
      lastUsedAt: new Date(),
    })
    .returning();

  return {
    authorization,
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
}

export async function exchangeAuthorizationCode(input: {
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  const client = await getOAuthClient(input.clientId);
  if (!client || !redirectUriMatches(client, input.redirectUri)) {
    return null;
  }

  const [storedCode] = await db
    .select()
    .from(oauthAuthorizationCodes)
    .where(eq(oauthAuthorizationCodes.codeHash, hashToken(input.code)))
    .limit(1);

  if (
    !storedCode ||
    storedCode.clientId !== input.clientId ||
    storedCode.redirectUri !== input.redirectUri ||
    storedCode.usedAt ||
    storedCode.expiresAt <= new Date() ||
    storedCode.codeChallengeMethod !== "S256" ||
    !safeEqual(pkceChallenge(input.codeVerifier), storedCode.codeChallenge)
  ) {
    return null;
  }

  const [usedCode] = await db
    .update(oauthAuthorizationCodes)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(oauthAuthorizationCodes.id, storedCode.id),
        isNull(oauthAuthorizationCodes.usedAt),
      ),
    )
    .returning();
  if (!usedCode) {
    return null;
  }

  return issueTokens({
    clientId: client.clientId,
    clientName: client.clientName,
  });
}

export async function refreshOAuthTokens(input: {
  clientId: string;
  refreshToken: string;
}) {
  const refreshTokenHash = hashToken(input.refreshToken);
  const [authorization] = await db
    .select()
    .from(oauthAuthorizations)
    .where(
      and(
        eq(oauthAuthorizations.refreshTokenHash, refreshTokenHash),
        isNull(oauthAuthorizations.revokedAt),
      ),
    )
    .limit(1);

  if (
    !authorization ||
    authorization.clientId !== input.clientId ||
    authorization.refreshExpiresAt <= new Date()
  ) {
    return null;
  }

  const accessToken = createAccessToken();
  const refreshToken = createRefreshToken();
  const accessExpiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const [updated] = await db
    .update(oauthAuthorizations)
    .set({
      accessTokenHash: hashToken(accessToken),
      refreshTokenHash: hashToken(refreshToken),
      accessExpiresAt,
      refreshExpiresAt,
      lastUsedAt: new Date(),
    })
    .where(
      and(
        eq(oauthAuthorizations.id, authorization.id),
        eq(oauthAuthorizations.refreshTokenHash, refreshTokenHash),
      ),
    )
    .returning();
  if (!updated) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    authorization: updated,
  };
}

export async function verifyOAuthAccessToken(token: string) {
  const [authorization] = await db
    .select()
    .from(oauthAuthorizations)
    .where(
      and(
        eq(oauthAuthorizations.accessTokenHash, hashToken(token)),
        isNull(oauthAuthorizations.revokedAt),
      ),
    )
    .limit(1);

  if (!authorization || authorization.accessExpiresAt <= new Date()) {
    return null;
  }

  db.update(oauthAuthorizations)
    .set({ lastUsedAt: new Date() })
    .where(eq(oauthAuthorizations.id, authorization.id))
    .catch(() => {});

  return {
    id: authorization.id,
    clientId: authorization.clientId,
    name: authorization.clientName,
    scopes: OAUTH_SCOPES.slice(),
  };
}
