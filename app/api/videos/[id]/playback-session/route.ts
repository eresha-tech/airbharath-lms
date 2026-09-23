import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { videos, lessons, modules, enrollments, playbackSessions, videoCaptions } from "@/lib/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { hasCourseAccess } from "@/lib/course-access";
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

    // Optional context passed by caller (e.g. HlsPlayer)
    let requestedCourseId: string | undefined;
    let requestedLessonId: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body === "object") {
        if (typeof body.courseId === "string" && body.courseId.trim()) {
          requestedCourseId = body.courseId.trim();
        }
        if (typeof body.lessonId === "string" && body.lessonId.trim()) {
          requestedLessonId = body.lessonId.trim();
        }
      }
    } catch {
      // Empty or non-JSON body is acceptable
    }

    let isAuthorized = session.role === "admin";

    if (!isAuthorized) {
      const now = new Date();

      if (requestedLessonId) {
        // Specific lesson requested: authorize strictly against this specific lesson & its parent course
        const [targetLesson] = await db
          .select({
            lessonId: lessons.id,
            moduleId: lessons.moduleId,
            videoUrl: lessons.videoUrl,
            isFreePreview: lessons.isFreePreview,
            deliveryType: lessons.deliveryType,
            releaseAt: lessons.releaseAt,
            courseId: modules.courseId,
          })
          .from(lessons)
          .innerJoin(modules, eq(lessons.moduleId, modules.id))
          .where(eq(lessons.id, requestedLessonId));

        if (!targetLesson) {
          return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
        }

        // Verify that this lesson actually uses this video asset
        const referencesVideo =
          targetLesson.videoUrl === video.id ||
          (video.lessonId ? targetLesson.lessonId === video.lessonId : false);

        if (!referencesVideo) {
          return NextResponse.json(
            { error: "Video is not associated with the requested lesson" },
            { status: 403 }
          );
        }

        // If requestedCourseId was also provided, ensure it matches targetLesson.courseId
        if (requestedCourseId && requestedCourseId !== targetLesson.courseId) {
          return NextResponse.json(
            { error: "Lesson does not belong to the requested course" },
            { status: 403 }
          );
        }

        // Check if lesson is scheduled for future release
        const isNotYetReleased =
          targetLesson.deliveryType === "recorded" &&
          targetLesson.releaseAt &&
          new Date(targetLesson.releaseAt) > now;

        if (isNotYetReleased) {
          return NextResponse.json(
            { error: "Lesson is scheduled for future release" },
            { status: 403 }
          );
        }

        // 1. Free preview on this specific lesson
        if (targetLesson.isFreePreview) {
          isAuthorized = true;
        } else {
          // 2. Active enrollment / bundle entitlement in this specific course
          const access = await hasCourseAccess(session.id, targetLesson.courseId, session.role);
          if (access.hasAccess) {
            isAuthorized = true;
          }
        }
      } else if (requestedCourseId) {
        // Specific course requested without a specific lessonId:
        // Find lessons in this course that reference the video
        const courseLessons = await db
          .select({
            lessonId: lessons.id,
            isFreePreview: lessons.isFreePreview,
            deliveryType: lessons.deliveryType,
            releaseAt: lessons.releaseAt,
            courseId: modules.courseId,
          })
          .from(lessons)
          .innerJoin(modules, eq(lessons.moduleId, modules.id))
          .where(
            and(
              eq(modules.courseId, requestedCourseId),
              or(
                eq(lessons.videoUrl, video.id),
                video.lessonId ? eq(lessons.id, video.lessonId) : undefined
              )
            )
          );

        if (courseLessons.length === 0) {
          return NextResponse.json(
            { error: "Video is not associated with the requested course" },
            { status: 403 }
          );
        }

        // Check if any referencing lesson in this course is free preview
        const hasFreePreview = courseLessons.some(
          (l) =>
            l.isFreePreview &&
            !(l.deliveryType === "recorded" && l.releaseAt && new Date(l.releaseAt) > now)
        );

        if (hasFreePreview) {
          isAuthorized = true;
        } else {
          // Check active enrollment / bundle entitlement in THIS requested course
          const access = await hasCourseAccess(session.id, requestedCourseId, session.role);

          if (access.hasAccess) {
            // Also check that at least one referencing lesson in this course is released
            const hasReleasedLesson = courseLessons.some(
              (l) =>
                !(l.deliveryType === "recorded" && l.releaseAt && new Date(l.releaseAt) > now)
            );
            if (hasReleasedLesson) {
              isAuthorized = true;
            }
          }
        }
      } else {
        // Fallback when neither lessonId nor courseId is supplied (e.g. legacy direct video access)
        if (video.lessonId) {
          const [originLesson] = await db
            .select({
              isFreePreview: lessons.isFreePreview,
              deliveryType: lessons.deliveryType,
              releaseAt: lessons.releaseAt,
            })
            .from(lessons)
            .where(eq(lessons.id, video.lessonId));

          if (
            originLesson?.isFreePreview &&
            !(
              originLesson.deliveryType === "recorded" &&
              originLesson.releaseAt &&
              new Date(originLesson.releaseAt) > now
            )
          ) {
            isAuthorized = true;
          }
        }

        if (!isAuthorized) {
          const access = await hasCourseAccess(session.id, video.courseId, session.role);
          if (access.hasAccess) {
            isAuthorized = true;
          }
        }
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

    // 4. Check available video captions
    const captions = await db
      .select({
        languageCode: videoCaptions.languageCode,
        label: videoCaptions.label,
      })
      .from(videoCaptions)
      .where(and(eq(videoCaptions.videoId, video.id), eq(videoCaptions.status, "ready")));

    return NextResponse.json({
      playbackUrl,
      sessionId,
      title: video.title,
      durationSeconds: video.durationSeconds,
      hasCaptions: captions.length > 0,
      captions,
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
