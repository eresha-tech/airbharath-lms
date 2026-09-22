import { NextResponse } from "next/server";
import { getAppVersionInfo } from "@/lib/app-version";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * Public, Cache-Safe Version Endpoint
 * 
 * Returns non-sensitive application version metadata for health and deployment verification.
 * Does NOT leak any environment secrets, API keys, or infrastructure details.
 */
export async function GET() {
  const versionInfo = getAppVersionInfo();

  return NextResponse.json(versionInfo, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
