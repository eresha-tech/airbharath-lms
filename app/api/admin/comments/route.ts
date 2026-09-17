import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { lessonComments, lessons, modules, courses, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [allComments, allLessons, allModules, allCourses, allUsers] = await Promise.all([
      db.select().from(lessonComments).orderBy(desc(lessonComments.createdAt)),
      db.select().from(lessons),
      db.select().from(modules),
      db.select().from(courses),
      db.select().from(users),
    ]);

    const courseById: Record<string, any> = {};
    allCourses.forEach((c) => {
      courseById[c.id] = c;
    });

    const moduleToCourse: Record<string, any> = {};
    allModules.forEach((m) => {
      moduleToCourse[m.id] = courseById[m.courseId] || null;
    });

    const lessonById: Record<string, any> = {};
    allLessons.forEach((l) => {
      const course = moduleToCourse[l.moduleId] || null;
      lessonById[l.id] = { ...l, course };
    });

    const userById: Record<string, any> = {};
    allUsers.forEach((u) => {
      userById[u.id] = u;
    });

    const formattedComments = allComments.map((comment: any) => {
      const u = userById[comment.userId];
      const l = lessonById[comment.lessonId];
      return {
        id: comment.id,
        lesson_id: comment.lessonId,
        user_id: comment.userId,
        content: comment.content,
        parent_id: comment.parentId || null,
        created_at: comment.createdAt,
        user_name: u?.fullName || u?.email || "Student",
        user_role: u?.role || "student",
        lesson_title: l?.title || "Lesson",
        course_title: l?.course?.title || "Airbharath Course",
        course_id: l?.course?.id || "",
      };
    });

    return NextResponse.json({ comments: formattedComments });
  } catch (error) {
    console.error("ADMIN_COMMENTS_GET_ERROR", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
