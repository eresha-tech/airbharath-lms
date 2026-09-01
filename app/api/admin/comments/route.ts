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

    const comments = await db.query.lessonComments.findMany({
      with: {
        user: true,
        lesson: {
          with: {
            module: {
              with: {
                course: true,
              },
            },
          },
        },
      },
      orderBy: [desc(lessonComments.createdAt)],
    });

    const formattedComments = comments.map((comment: any) => ({
      id: comment.id,
      lesson_id: comment.lessonId,
      user_id: comment.userId,
      content: comment.content,
      parent_id: comment.parentId || null,
      created_at: comment.createdAt,
      user_name: comment.user?.fullName || comment.user?.email || "Student",
      user_role: comment.user?.role || "student",
      lesson_title: comment.lesson?.title || "Lesson",
      course_title: comment.lesson?.module?.course?.title || "Airbharath Course",
      course_id: comment.lesson?.module?.course?.id || "",
    }));

    return NextResponse.json({ comments: formattedComments });
  } catch (error) {
    console.error("ADMIN_COMMENTS_GET_ERROR", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
