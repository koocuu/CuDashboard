import { NextRequest } from "next/server";
import {
  OAUTH_SCOPE,
  exchangeAuthorizationCode,
  getOAuthClient,
  oauthError,
  oauthJson,
  oauthOptions,
  publicOrigin,
  refreshOAuthTokens,
} from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokenResponse(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}) {
  return oauthJson({
    access_token: tokens.accessToken,
    token_type: "Bearer",
    expires_in: tokens.expiresIn,
    refresh_token: tokens.refreshToken,
    scope: OAUTH_SCOPE,
  });
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return oauthError("invalid_request", "Expected form-urlencoded body");
  }

  const grantType = String(form.get("grant_type") ?? "");
  const clientId = String(form.get("client_id") ?? "");
  const resource = String(form.get("resource") ?? "");
  if (resource && resource !== `${publicOrigin(req)}/api/mcp`) {
    return oauthError("invalid_target", "resource must point to this server's /api/mcp");
  }
  if (!clientId || !(await getOAuthClient(clientId))) {
    return oauthError("invalid_client", "Unknown client_id", 401);
  }

  if (grantType === "authorization_code") {
    const code = String(form.get("code") ?? "");
    const redirectUri = String(form.get("redirect_uri") ?? "");
    const codeVerifier = String(form.get("code_verifier") ?? "");
    if (!code || !redirectUri || !codeVerifier) {
      return oauthError("invalid_request", "code, redirect_uri and code_verifier are required");
    }

    const tokens = await exchangeAuthorizationCode({
      clientId,
      code,
      redirectUri,
      codeVerifier,
    });
    if (!tokens) {
      return oauthError("invalid_grant", "Authorization code is invalid or expired");
    }

    return tokenResponse(tokens);
  }

  if (grantType === "refresh_token") {
    const refreshToken = String(form.get("refresh_token") ?? "");
    if (!refreshToken) {
      return oauthError("invalid_request", "refresh_token is required");
    }

    const tokens = await refreshOAuthTokens({ clientId, refreshToken });
    if (!tokens) {
      return oauthError("invalid_grant", "Refresh token is invalid or expired");
    }

    return tokenResponse(tokens);
  }

  return oauthError("unsupported_grant_type", "Unsupported grant_type");
}

export const OPTIONS = oauthOptions;
