/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Sidebar } from "@/components/dashboard/Sidebar";

interface CourseLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    courseId: string;
  }>;
}

export default async function CourseLayout({
  children,
  params,
}: CourseLayoutProps) {
  const { courseId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Check enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single();

  if (!enrollment) {
    return redirect(`/courses/${courseId}`);
  }

  // Fetch course data for sidebar
  const { data: course } = await supabase
    .from('courses')
    .select(`
      id,
      title,
      modules (
        id,
        title,
        order_index,
        lessons (
          id,
          title,
          order_index
        )
      )
    `)
    .eq('id', courseId)
    .single();

  if (!course) {
    return redirect("/my-courses");
  }

  // Sort modules and lessons for sidebar
  const sortedModules = course.modules?.sort((a: any, b: any) => a.order_index - b.order_index).map((module: any) => ({
    ...module,
    lessons: module.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || []
  })) || [];

  course.modules = sortedModules;

  // Fetch progress
  const { data: progress } = await supabase
    .from('progress')
    .select('lesson_id')
    .eq('user_id', user.id)
    .eq('is_completed', true);

  const completedLessonIds = progress?.map(p => p.lesson_id) || [];

  return (
    <div className="h-full">
      <Sidebar course={course as any} completedLessons={completedLessonIds} />
      <main className="h-full lg:pt-[64px] pl-20 lg:pl-96">{children}</main>
    </div>
  );
}
