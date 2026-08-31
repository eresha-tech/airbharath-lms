/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is Admin
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all comments joining user, lesson, module, course using Admin client to bypass RLS on users
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
        ),
        lessons (
          title,
          modules (
            title,
            courses (
              id,
              title
            )
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array (fallback mode)
      if (error.code === "PGRST204" || error.message?.includes("relation") || error.message?.includes("cache")) {
        return NextResponse.json({ comments: [], fallback: true });
      }
      throw error;
    }

    const formattedComments = (comments || []).map((comment: any) => {
      // Handle potential array or object format defensively for joins
      const lessonsVal = Array.isArray(comment.lessons) ? comment.lessons[0] : comment.lessons;
      const modulesVal = Array.isArray(lessonsVal?.modules) ? lessonsVal?.modules[0] : lessonsVal?.modules;
      const coursesVal = Array.isArray(modulesVal?.courses) ? modulesVal?.courses[0] : modulesVal?.courses;

      return {
        id: comment.id,
        lesson_id: comment.lesson_id,
        user_id: comment.user_id,
        content: comment.content,
        parent_id: comment.parent_id || null,
        created_at: comment.created_at,
        user_name: comment.users?.full_name || comment.users?.email || "Student",
        user_role: comment.users?.role || "student",
        lesson_title: lessonsVal?.title || "Unknown Lesson",
        course_title: coursesVal?.title || "Unknown Course",
        course_id: coursesVal?.id || ""
      };
    });

    return NextResponse.json({ comments: formattedComments });
  } catch (error) {
    console.error("ADMIN_COMMENTS_GET_ERROR", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
