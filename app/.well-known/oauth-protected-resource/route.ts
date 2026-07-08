import { NextRequest } from "next/server";
import {
  oauthJson,
  oauthOptions,
  protectedResourceMetadata,
} from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return oauthJson(protectedResourceMetadata(req));
}

export const OPTIONS = oauthOptions;
