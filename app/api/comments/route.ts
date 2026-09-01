import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { lessonComments, users } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get("lessonId");
    if (!lessonId) {
      return NextResponse.json({ error: "Missing lessonId" }, { status: 400 });
    }

    const comments = await db.query.lessonComments.findMany({
      where: eq(lessonComments.lessonId, lessonId),
      with: {
        user: true,
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
    }));

    return NextResponse.json({ comments: formattedComments });
  } catch (error) {
    console.error("COMMENTS_GET_ERROR", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lessonId, content, parentId } = await req.json();
    if (!lessonId || !content) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const [comment] = await db
      .insert(lessonComments)
      .values({
        lessonId,
        userId: session.id,
        content,
        parentId: parentId || null,
      })
      .returning();

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("COMMENTS_POST_ERROR", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");
    if (!commentId) {
      return NextResponse.json({ error: "Missing commentId" }, { status: 400 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role === "admin") {
      await db.delete(lessonComments).where(eq(lessonComments.id, commentId));
    } else {
      await db.delete(lessonComments).where(and(eq(lessonComments.id, commentId), eq(lessonComments.userId, session.id)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("COMMENTS_DELETE_ERROR", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
