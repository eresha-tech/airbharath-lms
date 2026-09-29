import { NextResponse } from "next/server";
import { getAuthorizedAdminSession } from "@/lib/admin-authorization";
import { db } from "@/lib/db";
import { videos, lessons, modules, courses, videoCaptions } from "@/lib/db/schema";
import { eq, desc, or, inArray } from "drizzle-orm";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, rawBucket, processedBucket, deleteS3Folder } from "@/lib/aws-video";

export async function GET(req: Request) {
  try {
    const session = await getAuthorizedAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const videoList = await db
      .select({
        id: videos.id,
        courseId: videos.courseId,
        lessonId: videos.lessonId,
        title: videos.title,
        status: videos.status,
        rawS3Key: videos.rawS3Key,
        processedS3Prefix: videos.processedS3Prefix,
        durationSeconds: videos.durationSeconds,
        errorMessage: videos.errorMessage,
        createdAt: videos.createdAt,
        updatedAt: videos.updatedAt,
        courseTitle: courses.title,
      })
      .from(videos)
      .leftJoin(courses, eq(videos.courseId, courses.id))
      .orderBy(desc(videos.createdAt));

    // Fetch all captions
    const allCaptions = await db.select().from(videoCaptions);

    // Fetch all lessons referencing any video
    const referencingLessons = await db
      .select({
        lessonId: lessons.id,
        lessonTitle: lessons.title,
        videoUrl: lessons.videoUrl,
        moduleId: lessons.moduleId,
        courseId: modules.courseId,
        courseTitle: courses.title,
      })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .innerJoin(courses, eq(modules.courseId, courses.id));

    // Map usage and captions onto each video
    const enrichedVideos = videoList.map((video) => {
      const usages = referencingLessons.filter(
        (l) => l.videoUrl === video.id || (video.lessonId && l.lessonId === video.lessonId)
      );
      const captions = allCaptions.filter((c) => c.videoId === video.id);
      return {
        ...video,
        usageCount: usages.length,
        usedIn: usages.map((u) => ({
          lessonId: u.lessonId,
          lessonTitle: u.lessonTitle,
          courseId: u.courseId,
          courseTitle: u.courseTitle,
        })),
        captions: captions.map((c) => ({
          id: c.id,
          languageCode: c.languageCode,
          label: c.label,
          status: c.status,
          updatedAt: c.updatedAt,
        })),
      };
    });

    return NextResponse.json({ videos: enrichedVideos });
  } catch (error: any) {
    console.error("Error listing videos:", error);
    return NextResponse.json({ error: error.message || "Failed to list videos" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getAuthorizedAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("id");
    const force = searchParams.get("force") === "true";

    if (!videoId) {
      return NextResponse.json({ error: "Missing video ID parameter" }, { status: 400 });
    }

    const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Check usage across lessons
    const referencingLessons = await db
      .select({
        id: lessons.id,
        title: lessons.title,
      })
      .from(lessons)
      .where(or(eq(lessons.videoUrl, videoId), video.lessonId ? eq(lessons.id, video.lessonId) : undefined));

    if (referencingLessons.length > 0 && !force) {
      return NextResponse.json(
        {
          error: `Cannot delete video: referenced by ${referencingLessons.length} lesson(s) (${referencingLessons.map((l) => `"${l.title}"`).join(", ")}). Unlink from lessons first or confirm force deletion.`,
          usageCount: referencingLessons.length,
          referencingLessons,
        },
        { status: 400 }
      );
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

    // 4. Delete associated caption records
    await db.delete(videoCaptions).where(eq(videoCaptions.videoId, videoId));

    // 5. Delete record from videos table
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

