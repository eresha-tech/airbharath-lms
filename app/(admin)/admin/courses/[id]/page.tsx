import { db } from "@/lib/db";
import { courses, modules, lessons, videos } from "@/lib/db/schema";
import { eq, inArray, asc } from "drizzle-orm";
import CourseEditor from "@/components/admin/CourseEditor";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const isUUID = UUID_REGEX.test(id);

  let courseObj: any = null;
  try {
    const courseRows = isUUID
      ? await db.select().from(courses).where(eq(courses.id, id)).limit(1)
      : await db.select().from(courses).where(eq(courses.slug, id)).limit(1);
    courseObj = courseRows[0] || null;
  } catch (err) {
    console.error("Error fetching course in EditCoursePage:", err);
  }

  if (!courseObj) {
    notFound();
  }

  let modulesList: any[] = [];
  try {
    modulesList = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, courseObj.id))
      .orderBy(asc(modules.orderIndex));
  } catch (err) {
    console.error("Error fetching modules in EditCoursePage:", err);
  }

  const moduleIds = modulesList.map((m: any) => m.id);

  let lessonsList: any[] = [];
  if (moduleIds.length > 0) {
    try {
      lessonsList = await db
        .select()
        .from(lessons)
        .where(inArray(lessons.moduleId, moduleIds))
        .orderBy(asc(lessons.orderIndex));
    } catch (err) {
      console.error("Error fetching lessons in EditCoursePage:", err);
    }
  }

  // Fetch video status for each lesson (keyed by lessonId)
  const lessonIds = lessonsList.map((l: any) => l.id);
  const videoStatusByLessonId: Record<string, string> = {};
  if (lessonIds.length > 0) {
    try {
      const videoRows = await db
        .select({ id: videos.id, lessonId: videos.lessonId, status: videos.status })
        .from(videos)
        .where(inArray(videos.lessonId, lessonIds));
      for (const v of videoRows) {
        if (v.lessonId) videoStatusByLessonId[v.lessonId] = v.status;
      }
    } catch (err) {
      console.error("Error fetching video statuses in EditCoursePage:", err);
    }
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
    video_status: videoStatusByLessonId[l.id] || null,
    order_index: l.orderIndex,
    is_free_preview: l.isFreePreview,
  }));

  return (
    <CourseEditor 
      course={{
        id: courseObj.id,
        title: courseObj.title,
        description: courseObj.description || "",
        price: Number(courseObj.price || 0),
        thumbnail_url: courseObj.thumbnailUrl || "",
        is_published: !!courseObj.isPublished,
        access_days: courseObj.accessDays ?? null,
      }} 
      initialModules={formattedModules} 
      initialLessons={formattedLessons} 
    />
  );
}
