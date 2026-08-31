/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get("lessonId");
    if (!lessonId) {
      return NextResponse.json({ error: "Missing lessonId" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data: comments, error } = await adminSupabase
      .from("lesson_comments")
      .select(`
        id,
        lesson_id,
        user_id,
        content,
        parent_id,
        created_at,
        users (
          full_name,
          email,
          role
        )
      `)
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const formattedComments = (comments || []).map((comment: any) => ({
      id: comment.id,
      lesson_id: comment.lesson_id,
      user_id: comment.user_id,
      content: comment.content,
      parent_id: comment.parent_id || null,
      created_at: comment.created_at,
      user_name: comment.users?.full_name || comment.users?.email || "Student",
      user_role: comment.users?.role || "student"
    }));

    return NextResponse.json({ comments: formattedComments });
  } catch (error) {
    console.error("COMMENTS_GET_ERROR", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lessonId, content, parentId } = await req.json();
    if (!lessonId || !content) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const { data: comment, error } = await supabase
      .from("lesson_comments")
      .insert({
        lesson_id: lessonId,
        user_id: user.id,
        content,
        parent_id: parentId || null
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

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

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete comment ensuring ownership
    const { error } = await supabase
      .from("lesson_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("COMMENTS_DELETE_ERROR", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
