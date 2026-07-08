import { NextRequest } from "next/server";
import {
  OAUTH_SCOPE,
  createOAuthClient,
  oauthError,
  oauthJson,
  oauthOptions,
  validRedirectUri,
} from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter(
        (uri: unknown): uri is string =>
          typeof uri === "string" && validRedirectUri(uri),
      )
    : [];

  if (redirectUris.length === 0) {
    return oauthError("invalid_redirect_uri", "redirect_uris is required");
  }

  const tokenEndpointAuthMethod =
    typeof body.token_endpoint_auth_method === "string"
      ? body.token_endpoint_auth_method
      : "none";
  if (tokenEndpointAuthMethod !== "none") {
    return oauthError(
      "invalid_client_metadata",
      "Only public clients with token_endpoint_auth_method=none are supported",
    );
  }

  const clientName =
    typeof body.client_name === "string" && body.client_name.trim()
      ? body.client_name.trim()
      : "Claude";

  const client = await createOAuthClient({
    clientName,
    redirectUris,
  });

  return oauthJson(
    {
      client_id: client.clientId,
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: OAUTH_SCOPE,
    },
    201,
  );
}

export const OPTIONS = oauthOptions;
