import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { videos, lessons, enrollments, playbackSessions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  getCloudFrontSignedPlaybackUrl,
  acquirePlaybackSession,
  releasePlaybackSession,
} from "@/lib/aws-video";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    let [video] = await db.select().from(videos).where(eq(videos.id, id));

    if (!video) {
      const [byLesson] = await db.select().from(videos).where(eq(videos.lessonId, id));
      if (byLesson) video = byLesson;
    }

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (video.status === "failed") {
      return NextResponse.json({ error: "Video processing failed" }, { status: 400 });
    }

    let isAuthorized = session.role === "admin";

    // Check free preview
    if (!isAuthorized && video.lessonId) {
      const [lesson] = await db.select().from(lessons).where(eq(lessons.id, video.lessonId));
      if (lesson && lesson.isFreePreview) {
        isAuthorized = true;
      }
    }

    // Check course enrollment
    if (!isAuthorized) {
      const [enrollment] = await db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, session.id),
            eq(enrollments.courseId, video.courseId),
            eq(enrollments.status, "active")
          )
        );
      if (enrollment) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied. Enrollment required." }, { status: 403 });
    }

    // 1. Generate CloudFront Custom Policy Signed Playback URL
    const ttlSeconds = 7200; // 2 hours
    const playbackUrl = getCloudFrontSignedPlaybackUrl(video.courseId, video.id, ttlSeconds);

    // 2. Lock concurrent session in Redis
    const { sessionId } = await acquirePlaybackSession(session.id, video.id, ttlSeconds);

    // 3. Record session in Neon DB
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await db.insert(playbackSessions).values({
      userId: session.id,
      videoId: video.id,
      startedAt: new Date(),
      expiresAt,
      active: true,
    });

    return NextResponse.json({
      playbackUrl,
      sessionId,
      title: video.title,
      durationSeconds: video.durationSeconds,
    });
  } catch (error: any) {
    console.error("Error creating playback session:", error);
    return NextResponse.json({ error: error.message || "Failed to create playback session" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (session) {
      await releasePlaybackSession(session.id);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to release playback session" }, { status: 500 });
  }
}
