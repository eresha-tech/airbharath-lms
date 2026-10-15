import { NextResponse } from "next/server";
import { getAuthorizedAdminSession } from "@/lib/admin-authorization";
import { db } from "@/lib/db";
import { videos, lessons } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getS3UploadPresignedUrl } from "@/lib/aws-video";

export async function POST(req: Request) {
  try {
    const session = await getAuthorizedAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId, lessonId, title, filename } = await req.json();

    if (!courseId || !title || !filename) {
      return NextResponse.json(
        { error: "Missing required fields: courseId, title, filename" },
        { status: 400 }
      );
    }

    // Insert initial video record with status = 'uploaded'
    const [video] = await db
      .insert(videos)
      .values({
        courseId,
        lessonId: lessonId || null,
        title,
        status: "uploaded",
        rawS3Key: `raw-uploads/${courseId}/pending`,
      })
      .returning();

    // Generate S3 presigned PUT URL — key: raw-uploads/{courseId}/{videoId}.ext
    const { uploadUrl, s3Key } = await getS3UploadPresignedUrl(courseId, video.id, filename);

    // Update the video record with the real S3 key
    await db
      .update(videos)
      .set({ rawS3Key: s3Key, updatedAt: new Date() })
      .where(eq(videos.id, video.id));

    // Associate the new video with the lesson by storing video.id in lessons.videoUrl
    if (lessonId) {
      await db
        .update(lessons)
        .set({ videoUrl: video.id })
        .where(eq(lessons.id, lessonId));
    }

    return NextResponse.json({
      videoId: video.id,
      uploadUrl,
      s3Key,
    });
  } catch (error: any) {
    console.error("Error generating video upload URL:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
