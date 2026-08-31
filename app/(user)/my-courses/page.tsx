/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { CourseCard } from "@/components/CourseCard";
import { calculateCourseProgress } from "@/lib/courseProgress";

export default async function MyCoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/");
  }

  const adminSupabase = createAdminClient();

  // Fetch enrolled courses with modules and lessons using admin client to bypass RLS on instructors/courses
  const { data: enrollments } = await adminSupabase
    .from('enrollments')
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
    .eq('user_id', user.id);

  const enrolledCourses = enrollments?.map(e => e.courses).filter(Boolean) || [];

  // Fetch progress for all completed lessons for this user using admin client
  const { data: progressData } = await adminSupabase
    .from('progress')
    .select('lesson_id')
    .eq('user_id', user.id)
    .eq('is_completed', true);

  const completedLessonIds = progressData?.map(p => p.lesson_id) || [];

  const coursesWithProgress = enrolledCourses.map((course: any) => {
    const progress = calculateCourseProgress(course.modules, completedLessonIds);
    return {
      course,
      progress
    };
  });

  return (
    <div className="h-full pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <GraduationCap className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">My Courses</h1>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">No courses yet</h2>
            <p className="text-muted-foreground mb-8">
              You haven&apos;t enrolled in any courses yet. Browse our courses
              to get started!
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg px-6 py-3 font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Browse Courses
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
    </div>
  );
}
