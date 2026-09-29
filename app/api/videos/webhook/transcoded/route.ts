import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { videos } from "@/lib/db/schema";
import { authenticateWebhook } from "@/lib/webhook-auth";
import { and, eq, ne } from "drizzle-orm";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const authentication = authenticateWebhook(
      req.headers.get("x-aws-webhook-secret"),
      process.env.AWS_WEBHOOK_SECRET,
    );

    if (!authentication.ok) {
      if (authentication.reason === "configuration") {
        console.error("AWS_VIDEO_WEBHOOK_CONFIGURATION_ERROR");
        return NextResponse.json(
          { error: "Webhook is temporarily unavailable" },
          { status: 503 },
        );
      }

      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid webhook request" }, { status: 400 });
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json({ error: "Invalid webhook request" }, { status: 400 });
    }

    const detail = (payload as Record<string, unknown>).detail;
    if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
      return NextResponse.json({ error: "Invalid webhook request" }, { status: 400 });
    }

    const detailRecord = detail as Record<string, unknown>;
    const metadata = detailRecord.userMetadata;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return NextResponse.json({ error: "Invalid webhook request" }, { status: 400 });
    }

    const status = detailRecord.status;
    const metadataRecord = metadata as Record<string, unknown>;
    const videoId = metadataRecord.videoId;
    const courseId = metadataRecord.courseId;

    if (
      (status !== "COMPLETE" && status !== "ERROR") ||
      typeof videoId !== "string" ||
      typeof courseId !== "string" ||
      !UUID_REGEX.test(videoId) ||
      !UUID_REGEX.test(courseId)
    ) {
      return NextResponse.json({ error: "Invalid webhook request" }, { status: 400 });
    }

    if (status === "COMPLETE") {
      const processedPrefix = `${courseId}/${videoId}/`;
      const outputGroups = Array.isArray(detailRecord.outputGroupDetails)
        ? detailRecord.outputGroupDetails
        : [];
      const firstGroup = outputGroups[0];
      const outputDetails = firstGroup && typeof firstGroup === "object" && !Array.isArray(firstGroup)
        && Array.isArray((firstGroup as Record<string, unknown>).outputDetails)
        ? (firstGroup as Record<string, unknown>).outputDetails as unknown[]
        : [];
      const firstOutput = outputDetails[0];
      const durationInMs = firstOutput && typeof firstOutput === "object" && !Array.isArray(firstOutput)
        ? (firstOutput as Record<string, unknown>).durationInMs
        : undefined;
      const durationSeconds = typeof durationInMs === "number" && Number.isFinite(durationInMs) && durationInMs > 0
        ? Math.round(durationInMs / 1000)
        : undefined;

      const updatedRows = await db
        .update(videos)
        .set({
          status: "ready",
          processedS3Prefix: processedPrefix,
          durationSeconds,
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(and(eq(videos.id, videoId), eq(videos.courseId, courseId)))
        .returning({
          id: videos.id,
          status: videos.status,
        });

      if (updatedRows.length === 0) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 });
      }
    } else if (status === "ERROR") {
      const errorMessage = typeof detailRecord.errorMessage === "string"
        && detailRecord.errorMessage.trim().length > 0
        ? detailRecord.errorMessage.slice(0, 2000)
        : "MediaConvert job failed";
      const updatedRows = await db
        .update(videos)
        .set({
          status: "failed",
          errorMessage,
          updatedAt: new Date(),
        })
        .where(and(
          eq(videos.id, videoId),
          eq(videos.courseId, courseId),
          ne(videos.status, "ready"),
        ))
        .returning({ id: videos.id });

      if (updatedRows.length === 0) {
        const existingVideo = await db.query.videos.findFirst({
          where: and(eq(videos.id, videoId), eq(videos.courseId, courseId)),
        });

        if (!existingVideo) {
          return NextResponse.json({ error: "Video not found" }, { status: 404 });
        }

        if (existingVideo.status === "ready") {
          return NextResponse.json({ success: true, ignored: true });
        }

        return NextResponse.json({ error: "Video state could not be updated" }, { status: 409 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(
      "AWS_VIDEO_WEBHOOK_ERROR",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
