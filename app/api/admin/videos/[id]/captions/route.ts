import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { videos, videoCaptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { uploadCaptionToS3, deleteCaptionFromS3 } from "@/lib/aws-video";
import { WebVTTParser } from "webvtt-parser";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: videoId } = await params;
    const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
    if (!video) {
      return NextResponse.json({ error: "Video asset not found" }, { status: 404 });
    }

    const captions = await db
      .select({
        id: videoCaptions.id,
        videoId: videoCaptions.videoId,
        languageCode: videoCaptions.languageCode,
        label: videoCaptions.label,
        status: videoCaptions.status,
        createdAt: videoCaptions.createdAt,
        updatedAt: videoCaptions.updatedAt,
      })
      .from(videoCaptions)
      .where(eq(videoCaptions.videoId, videoId));

    return NextResponse.json({ captions });
  } catch (error: any) {
    console.error("Error fetching video captions:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch captions" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: videoId } = await params;
    const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
    if (!video) {
      return NextResponse.json({ error: "Video asset not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const languageCode = (formData.get("languageCode") as string | null) || "en";
    const label = (formData.get("label") as string | null) || "English";

    if (!file) {
      return NextResponse.json({ error: "No caption file provided." }, { status: 400 });
    }

    // 1. Validate File Extension
    const fileName = file.name || "";
    if (!fileName.toLowerCase().endsWith(".vtt")) {
      return NextResponse.json(
        { error: "Invalid file format. Only WebVTT (.vtt) files are supported." },
        { status: 400 }
      );
    }

    // 2. Validate Maximum Size (2 MB)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Caption file exceeds maximum allowable size of 2 MB." },
        { status: 400 }
      );
    }

    // 3. Read and Validate WebVTT Format via parser
    const vttText = await file.text();
    const parser = new WebVTTParser();
    const parseResult = parser.parse(vttText);

    if (parseResult.errors && parseResult.errors.length > 0) {
      const firstError = parseResult.errors[0];
      const errorDetail = firstError.message || "Invalid WebVTT syntax";
      const lineInfo = firstError.line ? ` (Line ${firstError.line})` : "";
      return NextResponse.json(
        { error: `WebVTT Validation Failed: ${errorDetail}${lineInfo}` },
        { status: 400 }
      );
    }

    if (!parseResult.cues || parseResult.cues.length === 0) {
      return NextResponse.json(
        { error: "WebVTT Validation Failed: File contains no valid subtitle cues." },
        { status: 400 }
      );
    }

    // 4. Upload to Private S3 Processed Bucket: {courseId}/{videoId}/captions/{languageCode}.vtt
    const s3Key = await uploadCaptionToS3(video.courseId, video.id, languageCode, vttText);

    // 5. Upsert Caption Record in Database
    const [existingCaption] = await db
      .select()
      .from(videoCaptions)
      .where(and(eq(videoCaptions.videoId, video.id), eq(videoCaptions.languageCode, languageCode)));

    let captionRecord;
    if (existingCaption) {
      const [updated] = await db
        .update(videoCaptions)
        .set({
          label,
          s3Key,
          status: "ready",
          updatedAt: new Date(),
        })
        .where(eq(videoCaptions.id, existingCaption.id))
        .returning();
      captionRecord = updated;
    } else {
      const [inserted] = await db
        .insert(videoCaptions)
        .values({
          videoId: video.id,
          languageCode,
          label,
          s3Key,
          status: "ready",
        })
        .returning();
      captionRecord = inserted;
    }

    return NextResponse.json({
      success: true,
      caption: {
        id: captionRecord.id,
        videoId: captionRecord.videoId,
        languageCode: captionRecord.languageCode,
        label: captionRecord.label,
        status: captionRecord.status,
        updatedAt: captionRecord.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error saving caption:", error);
    return NextResponse.json({ error: error.message || "Failed to process caption upload" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: videoId } = await params;
    const { searchParams } = new URL(req.url);
    const languageCode = searchParams.get("language") || "en";

    const [existingCaption] = await db
      .select()
      .from(videoCaptions)
      .where(and(eq(videoCaptions.videoId, videoId), eq(videoCaptions.languageCode, languageCode)));

    if (!existingCaption) {
      return NextResponse.json({ error: "Caption track not found" }, { status: 404 });
    }

    // 1. Delete S3 object
    await deleteCaptionFromS3(existingCaption.s3Key);

    // 2. Delete DB record
    await db.delete(videoCaptions).where(eq(videoCaptions.id, existingCaption.id));

    return NextResponse.json({
      success: true,
      message: `Deleted ${existingCaption.label} caption successfully.`,
    });
  } catch (error: any) {
    console.error("Error deleting caption:", error);
    return NextResponse.json({ error: error.message || "Failed to delete caption" }, { status: 500 });
  }
}
