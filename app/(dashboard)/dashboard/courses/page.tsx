/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { CourseCard } from "@/components/CourseCard";
import { calculateCourseProgress } from "@/lib/courseProgress";

export default async function MyCoursesDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const adminSupabase = createAdminClient();

  // Fetch enrolled courses with modules and lessons using admin client to bypass RLS on instructors/courses
  const { data: enrollments } = await adminSupabase
    .from("enrollments")
    .select(`
      course_id,
      courses (
        id,
        title,
        description,
        thumbnail_url,
        price,
        instructor:users!instructor_id (
          full_name,
          avatar_url
        ),
        modules (
          id,
          lessons (
            id
          )
        )
      )
    `)
    .eq("user_id", user.id);

  const enrolledCourses = enrollments?.map(e => e.courses).filter(Boolean) || [];

  // Fetch progress for all completed lessons for this user using admin client
  const { data: progressData } = await adminSupabase
    .from("progress")
    .select("lesson_id")
    .eq("user_id", user.id)
    .eq("is_completed", true);

  const completedLessonIds = progressData?.map(p => p.lesson_id) || [];

  const coursesWithProgress = enrolledCourses.map((course: any) => {
    const progress = calculateCourseProgress(course.modules, completedLessonIds);
    return {
      course,
      progress
    };
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <GraduationCap className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">My Courses</h1>
          <p className="text-muted-foreground text-sm mt-1">All courses you are currently enrolled in.</p>
        </div>
      </div>

      {enrolledCourses.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border/80 rounded-3xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-foreground mb-4">No enrolled courses yet</h2>
          <p className="text-muted-foreground text-sm mb-8 max-w-md mx-auto">
            You haven&apos;t enrolled in any courses yet. Browse our curriculum to get started!
          </p>
          <Link
            href="/search/courses"
            className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-bold bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md"
          >
            Browse Curriculum
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {coursesWithProgress.map((item) => {
            if (!item || !item.course) return null;

            return (
              <CourseCard
                key={item.course.id}
                course={item.course}
                progress={item.progress}
                href={`/dashboard/courses/${item.course.id}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
