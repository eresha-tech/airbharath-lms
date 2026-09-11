import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { videos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const WEBHOOK_SECRET = process.env.AWS_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    if (WEBHOOK_SECRET) {
      const secretHeader = req.headers.get("x-aws-webhook-secret");
      if (secretHeader !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: "Forbidden: Invalid webhook secret" }, { status: 403 });
      }
    }

    const payload = await req.json();
    const detail = payload.detail;

    if (!detail) {
      return NextResponse.json({ error: "Missing detail object in payload" }, { status: 400 });
    }

    const status = detail.status; // 'COMPLETE' | 'ERROR'
    const videoId = detail.userMetadata?.videoId;
    const courseId = detail.userMetadata?.courseId;

    if (!videoId) {
      return NextResponse.json({ message: "No videoId in userMetadata, skipped" });
    }

    if (status === "COMPLETE") {
      const processedPrefix = `${courseId}/${videoId}/`;
      // Extract duration in seconds if available
      const durationSeconds = detail.outputGroupDetails?.[0]?.outputDetails?.[0]?.durationInMs
        ? Math.round(detail.outputGroupDetails[0].outputDetails[0].durationInMs / 1000)
        : null;

      const updatedRows = await db
        .update(videos)
        .set({
          status: "ready",
          processedS3Prefix: processedPrefix,
          durationSeconds: durationSeconds || undefined,
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(videos.id, videoId))
        .returning({
          id: videos.id,
          status: videos.status,
        });

      console.log("Database update result:", updatedRows);

      if (updatedRows.length === 0) {
        console.error(
          `No video found in database for videoId: ${videoId}`
        );

        return NextResponse.json(
          {
            error: "Video not found",
            videoId,
          },
          { status: 404 }
        );
      }
    } else if (status === "ERROR") {
      const errorMsg = detail.errorMessage || "MediaConvert job failed";
      await db
        .update(videos)
        .set({
          status: "failed",
          errorMessage: errorMsg,
          updatedAt: new Date(),
        })
        .where(eq(videos.id, videoId));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error handling MediaConvert transcoded webhook:", error);
    return NextResponse.json({ error: error.message || "Webhook processing error" }, { status: 500 });
  }
}
