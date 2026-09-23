import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { queryPostHogBehavioralMetrics } from "@/lib/posthog-query";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const rangeParam = searchParams.get("range") || "30d";
    const validRanges = ["7d", "30d", "90d", "1y", "all"] as const;
    const dateRange = validRanges.includes(rangeParam as any)
      ? (rangeParam as "7d" | "30d" | "90d" | "1y" | "all")
      : "30d";

    const metrics = await queryPostHogBehavioralMetrics(dateRange);

    return NextResponse.json({ success: true, metrics });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to query behavioral analytics" },
      { status: 500 }
    );
  }
}
