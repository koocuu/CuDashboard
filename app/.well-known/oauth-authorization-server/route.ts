import { NextRequest } from "next/server";
import {
  authorizationServerMetadata,
  oauthJson,
  oauthOptions,
} from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return oauthJson(authorizationServerMetadata(req));
}

export const OPTIONS = oauthOptions;
