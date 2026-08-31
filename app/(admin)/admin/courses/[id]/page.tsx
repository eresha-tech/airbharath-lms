/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase-server";
import CourseEditor from "@/components/admin/CourseEditor";
import { notFound } from "next/navigation";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;

  // 1. Fetch Course details
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (!course) {
    notFound();
  }

  // 2. Fetch Modules
  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", id)
    .order("order_index", { ascending: true });

  // 3. Fetch Lessons
  let lessons: any[] = [];
  if (modules && modules.length > 0) {
    const moduleIds = modules.map((m) => m.id);
    const { data: fetchedLessons } = await supabase
      .from("lessons")
      .select("*")
      .in("module_id", moduleIds)
      .order("order_index", { ascending: true });
    
    if (fetchedLessons) {
      lessons = fetchedLessons;
    }
  }

  return (
    <CourseEditor 
      course={course} 
      initialModules={modules || []} 
      initialLessons={lessons} 
    />
  );
}
