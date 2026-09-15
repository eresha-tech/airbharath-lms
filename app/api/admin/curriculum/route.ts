import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { modules, lessons, videos } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, rawBucket, processedBucket, deleteS3Folder } from "@/lib/aws-video";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { type, courseId, moduleId, title, content, videoUrl, orderIndex, isFreePreview, lessonId } = await req.json();

    if (type === "module") {
      const [newModule] = await db
        .insert(modules)
        .values({
          courseId,
          title,
          orderIndex: orderIndex || 1,
        })
        .returning();
      return NextResponse.json({ module: newModule });
    }

    if (type === "lesson") {
      if (lessonId) {
        const [updatedLesson] = await db
          .update(lessons)
          .set({
            title,
            content,
            videoUrl,
            orderIndex: orderIndex || 1,
            isFreePreview: isFreePreview ?? false,
          })
          .where(eq(lessons.id, lessonId))
          .returning();
        return NextResponse.json({ lesson: updatedLesson });
      } else {
        const [newLesson] = await db
          .insert(lessons)
          .values({
            moduleId,
            title,
            content,
            videoUrl,
            orderIndex: orderIndex || 1,
            isFreePreview: isFreePreview ?? false,
          })
          .returning();
        return NextResponse.json({ lesson: newLesson });
      }
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    if (type === "module") {
      await db.delete(modules).where(eq(modules.id, id));
    } else if (type === "lesson") {
      // Find the lesson first to get any referenced videoUrl
      const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
      if (lesson) {
        // Query videos matching lessonId or videoUrl
        const associatedVideos = await db
          .select()
          .from(videos)
          .where(
            lesson.videoUrl
              ? or(eq(videos.lessonId, id), eq(videos.id, lesson.videoUrl))
              : eq(videos.lessonId, id)
          );

        for (const video of associatedVideos) {
          const rawKey = video.rawS3Key || `raw-uploads/${video.courseId}/${video.id}.mp4`;
          const processedPrefix = video.processedS3Prefix || `${video.courseId}/${video.id}/`;

          // Clean raw S3 object
          try {
            await s3Client.send(
              new DeleteObjectCommand({
                Bucket: rawBucket,
                Key: rawKey,
              })
            );
          } catch (rawErr) {
            console.error(`Failed to delete raw S3 key (${rawKey}) during lesson ${id} deletion:`, rawErr);
            return NextResponse.json(
              { error: "Failed to delete associated raw video files from storage. Lesson not deleted." },
              { status: 500 }
            );
          }

          // Clean processed S3 folder
          try {
            await deleteS3Folder(processedBucket, processedPrefix);
          } catch (procErr) {
            console.error(`Failed to delete processed S3 folder (${processedPrefix}) during lesson ${id} deletion:`, procErr);
            return NextResponse.json(
              { error: "Failed to delete associated processed video files from storage. Lesson not deleted." },
              { status: 500 }
            );
          }

          // Delete video row from DB
          await db.delete(videos).where(eq(videos.id, video.id));
        }
      }

      await db.delete(lessons).where(eq(lessons.id, id));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in curriculum DELETE:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

