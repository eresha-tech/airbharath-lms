import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { modules, lessons } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
      await db.delete(lessons).where(eq(lessons.id, id));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
