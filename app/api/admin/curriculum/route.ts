import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { courseSections, modules, lessons, videos } from "@/lib/db/schema";
import { eq, or, and, ne } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      type,
      courseId,
      sectionId,
      moduleId,
      title,
      description,
      content,
      videoUrl,
      orderIndex,
      isFreePreview,
      lessonId,
      deliveryType,
      scheduledAt,
      releaseAt,
      durationMinutes,
      meetingUrl,
      itemType,
      items,
    } = body;

    // 1. SECTION CRUD
    if (type === "section") {
      if (!title || !title.trim()) {
        return NextResponse.json({ error: "Section title is required." }, { status: 400 });
      }

      if (sectionId) {
        const [updatedSection] = await db
          .update(courseSections)
          .set({
            title: title.trim(),
            description: description?.trim() || null,
            orderIndex: orderIndex || 1,
            updatedAt: new Date(),
          })
          .where(eq(courseSections.id, sectionId))
          .returning();
        return NextResponse.json({ section: updatedSection });
      } else {
        if (!courseId) {
          return NextResponse.json({ error: "courseId is required for new section." }, { status: 400 });
        }
        const [newSection] = await db
          .insert(courseSections)
          .values({
            courseId,
            title: title.trim(),
            description: description?.trim() || null,
            orderIndex: orderIndex || 1,
          })
          .returning();
        return NextResponse.json({ section: newSection });
      }
    }

    // 2. MODULE CRUD
    if (type === "module") {
      if (!title || !title.trim()) {
        return NextResponse.json({ error: "Module title is required." }, { status: 400 });
      }

      if (moduleId) {
        const [updatedModule] = await db
          .update(modules)
          .set({
            title: title.trim(),
            sectionId: sectionId || null,
            orderIndex: orderIndex || 1,
          })
          .where(eq(modules.id, moduleId))
          .returning();
        return NextResponse.json({ module: updatedModule });
      } else {
        if (!courseId) {
          return NextResponse.json({ error: "courseId is required for new module." }, { status: 400 });
        }
        const [newModule] = await db
          .insert(modules)
          .values({
            courseId,
            sectionId: sectionId || null,
            title: title.trim(),
            orderIndex: orderIndex || 1,
          })
          .returning();
        return NextResponse.json({ module: newModule });
      }
    }

    // 3. REORDER BATCH
    if (type === "reorder") {
      if (Array.isArray(items)) {
        for (const item of items) {
          if (itemType === "section") {
            await db
              .update(courseSections)
              .set({ orderIndex: item.orderIndex, updatedAt: new Date() })
              .where(eq(courseSections.id, item.id));
          } else if (itemType === "module") {
            const updateVals: any = { orderIndex: item.orderIndex };
            if (item.sectionId !== undefined) {
              updateVals.sectionId = item.sectionId || null;
            }
            await db.update(modules).set(updateVals).where(eq(modules.id, item.id));
          } else if (itemType === "lesson") {
            const updateVals: any = { orderIndex: item.orderIndex };
            if (item.moduleId !== undefined) {
              updateVals.moduleId = item.moduleId;
            }
            await db.update(lessons).set(updateVals).where(eq(lessons.id, item.id));
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    // 4. LESSON CRUD
    if (type === "lesson") {
      if (!title || !title.trim()) {
        return NextResponse.json({ error: "Lesson title is required." }, { status: 400 });
      }

      const effectiveDeliveryType = deliveryType === "live" ? "live" : "recorded";

      let parsedScheduledAt: Date | null = null;
      let parsedReleaseAt: Date | null = null;
      let parsedDuration: number | null = null;
      let sanitizedMeetingUrl: string | null = null;

      if (effectiveDeliveryType === "live") {
        if (!scheduledAt) {
          return NextResponse.json(
            { error: "Scheduled date & time is required for live lessons." },
            { status: 400 }
          );
        }
        parsedScheduledAt = new Date(scheduledAt);
        if (isNaN(parsedScheduledAt.getTime())) {
          return NextResponse.json(
            { error: "Invalid scheduled date & time." },
            { status: 400 }
          );
        }

        if (durationMinutes !== undefined && durationMinutes !== null && durationMinutes !== "") {
          parsedDuration = parseInt(String(durationMinutes), 10);
          if (isNaN(parsedDuration) || parsedDuration <= 0) {
            return NextResponse.json(
              { error: "Duration must be a positive number of minutes." },
              { status: 400 }
            );
          }
        }

        if (meetingUrl && typeof meetingUrl === "string" && meetingUrl.trim()) {
          const trimmed = meetingUrl.trim();
          try {
            const urlObj = new URL(trimmed);
            if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
              return NextResponse.json(
                { error: "Meeting URL must start with http:// or https://" },
                { status: 400 }
              );
            }
            sanitizedMeetingUrl = trimmed;
          } catch {
            return NextResponse.json(
              { error: "Meeting URL must be a valid URL." },
              { status: 400 }
            );
          }
        }
      } else {
        // Recorded lesson
        if (releaseAt !== undefined && releaseAt !== null && releaseAt !== "") {
          parsedReleaseAt = new Date(releaseAt);
          if (isNaN(parsedReleaseAt.getTime())) {
            return NextResponse.json(
              { error: "Invalid release date & time format." },
              { status: 400 }
            );
          }
        }
      }

      const lessonValues = {
        title: title.trim(),
        content: content || null,
        videoUrl: videoUrl || null,
        orderIndex: orderIndex || 1,
        isFreePreview: isFreePreview ?? false,
        deliveryType: effectiveDeliveryType,
        scheduledAt: parsedScheduledAt,
        releaseAt: parsedReleaseAt,
        durationMinutes: parsedDuration,
        meetingUrl: sanitizedMeetingUrl,
      };

      if (lessonId) {
        const [updatedLesson] = await db
          .update(lessons)
          .set(lessonValues)
          .where(eq(lessons.id, lessonId))
          .returning();
        return NextResponse.json({ lesson: updatedLesson });
      } else {
        if (!moduleId) {
          return NextResponse.json({ error: "moduleId is required for new lesson." }, { status: 400 });
        }
        const [newLesson] = await db
          .insert(lessons)
          .values({
            moduleId,
            ...lessonValues,
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

    if (type === "section") {
      // Deleting a section will set section_id = null on its modules (preserving modules)
      await db.delete(courseSections).where(eq(courseSections.id, id));
      return NextResponse.json({ success: true, message: "Section deleted. Modules unlinked." });
    }

    if (type === "module") {
      await db.delete(modules).where(eq(modules.id, id));
      return NextResponse.json({ success: true, message: "Module and its lessons deleted." });
    }

    if (type === "lesson") {
      // Safe lesson deletion: Delete the lesson record.
      // Reusable video library assets remain safe in the library even after lesson deletion.
      await db.delete(lessons).where(eq(lessons.id, id));
      return NextResponse.json({ success: true, message: "Lesson deleted successfully." });
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in curriculum DELETE:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

