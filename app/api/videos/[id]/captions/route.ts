import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPersistedAdminRole } from "@/lib/admin-authorization";
import { db } from "@/lib/db";
import { lessons, modules, videoCaptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { hasCourseAccess } from "@/lib/course-access";
import { getLessonAvailability } from "@/lib/lesson-availability";
import { getCaptionFromS3 } from "@/lib/aws-video";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: videoId } = await params;
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const lessonId = searchParams.get("lessonId");
    const languageCode = searchParams.get("language") || "en";

    if (!courseId || !lessonId) {
      return NextResponse.json(
        { error: "Missing required context: courseId and lessonId are required." },
        { status: 400 }
      );
    }

    // 1. Fetch lesson
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }

    // 2. Verify lesson references the requested video
    if (lesson.videoUrl !== videoId && lesson.id !== videoId) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    // 3. Verify lesson belongs to the requested course
    const [module] = await db.select().from(modules).where(eq(modules.id, lesson.moduleId));
    if (!module || module.courseId !== courseId) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    // 4. Verify scheduled release
    const isAdmin = await hasPersistedAdminRole(session);
    const availability = getLessonAvailability(lesson);
    if (!isAdmin && availability.isLocked) {
      return NextResponse.json(
        { error: "Lesson is locked until scheduled release time." },
        { status: 403 }
      );
    }

    // 5. Verify enrollment/course access
    if (!lesson.isFreePreview && !isAdmin) {
      const accessResult = await hasCourseAccess(session.id, courseId, session.role);
      if (!accessResult.hasAccess) {
        return NextResponse.json(
          { error: "Course enrollment required to access video captions." },
          { status: 403 }
        );
      }
    }

    // 6. Fetch caption metadata
    const [caption] = await db
      .select()
      .from(videoCaptions)
      .where(
        and(
          eq(videoCaptions.videoId, videoId),
          eq(videoCaptions.languageCode, languageCode),
          eq(videoCaptions.status, "ready")
        )
      );

    if (!caption) {
      return NextResponse.json({ error: "Caption track not available." }, { status: 404 });
    }

    // 7. Retrieve VTT content from private S3 processed bucket
    const vttContent = await getCaptionFromS3(caption.s3Key);
    if (!vttContent) {
      return NextResponse.json({ error: "Caption file not found in storage." }, { status: 404 });
    }

    // 8. Return text/vtt with strict security headers
    return new Response(vttContent, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    console.error("Error serving video caption:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
