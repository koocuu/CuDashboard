import { NextRequest } from "next/server";
import {
  oauthJson,
  oauthOptions,
  protectedResourceMetadata,
} from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** RFC 9728 path-based PRM：/.well-known/oauth-protected-resource/api/mcp */
export function GET(req: NextRequest) {
  return oauthJson(protectedResourceMetadata(req));
}

export const OPTIONS = oauthOptions;
