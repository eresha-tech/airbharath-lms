import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { videos, lessons } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, rawBucket, processedBucket, deleteS3Folder } from "@/lib/aws-video";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const videoList = await db.select().from(videos).orderBy(desc(videos.createdAt));
    return NextResponse.json({ videos: videoList });
  } catch (error: any) {
    console.error("Error listing videos:", error);
    return NextResponse.json({ error: error.message || "Failed to list videos" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("id");

    if (!videoId) {
      return NextResponse.json({ error: "Missing video ID parameter" }, { status: 400 });
    }

    const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Determine target S3 keys/prefixes with canonical fallbacks
    const rawKey = video.rawS3Key || `raw-uploads/${video.courseId}/${video.id}.mp4`;
    const processedPrefix = video.processedS3Prefix || `${video.courseId}/${video.id}/`;

    // 1. Delete raw S3 object
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: rawBucket,
          Key: rawKey,
        })
      );
    } catch (s3RawError: any) {
      console.error(`Failed to delete raw S3 object (${rawKey}) for video ${videoId}:`, s3RawError);
      return NextResponse.json(
        { error: "Failed to delete raw video file from storage. Database record preserved for retry." },
        { status: 500 }
      );
    }

    // 2. Delete complete processed HLS folder with pagination handling
    try {
      await deleteS3Folder(processedBucket, processedPrefix);
    } catch (s3ProcessedError: any) {
      console.error(`Failed to delete processed S3 folder (${processedPrefix}) for video ${videoId}:`, s3ProcessedError);
      return NextResponse.json(
        { error: "Failed to delete processed HLS files from storage. Database record preserved for retry." },
        { status: 500 }
      );
    }

    // 3. Clear lesson videoUrl pointer if any lesson references this video
    try {
      await db
        .update(lessons)
        .set({ videoUrl: null })
        .where(eq(lessons.videoUrl, videoId));
    } catch (lessonClearError: any) {
      console.error(`Failed to clear videoUrl in lessons for video ${videoId}:`, lessonClearError);
      return NextResponse.json(
        { error: "Failed to unlink video from lessons. Database record preserved for retry." },
        { status: 500 }
      );
    }

    // 4. Delete record from videos table
    await db.delete(videos).where(eq(videos.id, videoId));

    return NextResponse.json({
      success: true,
      message: "Video and associated storage files deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting video:", error);
    return NextResponse.json({ error: error.message || "Failed to delete video" }, { status: 500 });
  }
}

