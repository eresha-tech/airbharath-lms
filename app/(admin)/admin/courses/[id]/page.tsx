import { db } from "@/lib/db";
import { courses, modules, lessons } from "@/lib/db/schema";
import { eq, inArray, asc } from "drizzle-orm";
import CourseEditor from "@/components/admin/CourseEditor";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const courseObj = await db.query.courses.findFirst({
    where: eq(courses.id, id),
  });

  if (!courseObj) {
    notFound();
  }

  const modulesList = await db.query.modules.findMany({
    where: eq(modules.courseId, id),
    orderBy: [asc(modules.orderIndex)],
  });

  const moduleIds = modulesList.map((m: any) => m.id);

  let lessonsList: any[] = [];
  if (moduleIds.length > 0) {
    lessonsList = await db.query.lessons.findMany({
      where: inArray(lessons.moduleId, moduleIds),
      orderBy: [asc(lessons.orderIndex)],
    });
  }

  const formattedModules = modulesList.map((m: any) => ({
    id: m.id,
    course_id: m.courseId,
    title: m.title,
    order_index: m.orderIndex,
  }));

  const formattedLessons = lessonsList.map((l: any) => ({
    id: l.id,
    module_id: l.moduleId,
    title: l.title,
    content: l.content,
    video_url: l.videoUrl,
    order_index: l.orderIndex,
    is_free_preview: l.isFreePreview,
  }));

  return (
    <CourseEditor 
      course={{
        id: courseObj.id,
        title: courseObj.title,
        description: courseObj.description,
        price: Number(courseObj.price),
        thumbnail_url: courseObj.thumbnailUrl,
        is_published: courseObj.isPublished,
        access_days: courseObj.accessDays,
      }} 
      initialModules={formattedModules} 
      initialLessons={formattedLessons} 
    />
  );
}
