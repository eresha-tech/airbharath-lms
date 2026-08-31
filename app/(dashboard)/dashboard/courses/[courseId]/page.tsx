/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

interface CoursePageProps {
  params: Promise<{
    courseId: string;
  }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params;
  const supabase = await createClient();

  // Check enrollment first
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single();

  if (!enrollment) {
    return redirect(`/courses/${courseId}`);
  }

  // Fetch course with ordered modules and lessons
  const { data: course } = await supabase
    .from('courses')
    .select(`
      id,
      title,
      modules (
        id,
        order_index,
        lessons (
          id,
          order_index
        )
      )
    `)
    .eq('id', courseId)
    .single();

  if (!course) {
    return redirect("/");
  }

  // Redirect to the first lesson of the first module if available
  // Sort modules by order_index, then sort lessons within the first module
  const sortedModules = course.modules?.sort((a: any, b: any) => a.order_index - b.order_index) || [];
  if (sortedModules.length > 0) {
    const firstModule = sortedModules[0];
    const sortedLessons = firstModule.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || [];
    
    if (sortedLessons.length > 0) {
      return redirect(
        `/dashboard/courses/${courseId}/lessons/${sortedLessons[0].id}`
      );
    }
  }

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Welcome to {course.title}</h2>
        <p className="text-muted-foreground">
          This course has no content yet. Please check back later.
        </p>
      </div>
    </div>
  );
}
