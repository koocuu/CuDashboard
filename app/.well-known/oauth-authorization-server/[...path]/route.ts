import { NextRequest } from "next/server";
import {
  authorizationServerMetadata,
  oauthJson,
  oauthOptions,
} from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** RFC 8414 path-inserted AS metadata：/.well-known/oauth-authorization-server/api/mcp */
export function GET(req: NextRequest) {
  return oauthJson(authorizationServerMetadata(req));
}

export const OPTIONS = oauthOptions;
