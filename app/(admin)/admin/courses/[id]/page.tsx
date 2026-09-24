import { db } from "@/lib/db";
import { courses, courseSections, modules, lessons, videos, lessonMaterials, courseAuthors } from "@/lib/db/schema";
import { eq, inArray, asc } from "drizzle-orm";
import CourseEditor from "@/components/admin/CourseEditor";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Course Curriculum Editor | AirBharath LMS Admin",
  description: "Edit syllabus structure, video lectures, lesson notes, and course publishing properties.",
};

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

  let sectionsList: any[] = [];
  try {
    sectionsList = await db
      .select()
      .from(courseSections)
      .where(eq(courseSections.courseId, courseObj.id))
      .orderBy(asc(courseSections.orderIndex));
  } catch (err) {
    console.error("Error fetching course sections in EditCoursePage:", err);
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
  const videoStatusByLessonId: Record<string, { id: string; status: string }> = {};
  if (lessonIds.length > 0) {
    try {
      const videoRows = await db
        .select({ id: videos.id, lessonId: videos.lessonId, status: videos.status })
        .from(videos)
        .where(inArray(videos.lessonId, lessonIds));
      for (const v of videoRows) {
        if (v.lessonId) videoStatusByLessonId[v.lessonId] = { id: v.id, status: v.status };
      }
    } catch (err) {
      console.error("Error fetching video statuses in EditCoursePage:", err);
    }
  }

  // Fetch lesson materials for each lesson
  const materialsByLessonId: Record<string, any[]> = {};
  if (lessonIds.length > 0) {
    try {
      const materialsRows = await db
        .select()
        .from(lessonMaterials)
        .where(inArray(lessonMaterials.lessonId, lessonIds));
      for (const mat of materialsRows) {
        if (!materialsByLessonId[mat.lessonId]) materialsByLessonId[mat.lessonId] = [];
        materialsByLessonId[mat.lessonId].push({
          id: mat.id,
          title: mat.title,
          file_url: mat.fileUrl,
          file_type: mat.fileType,
          file_size: mat.fileSize,
        });
      }
    } catch (err) {
      console.error("Error fetching lesson materials in EditCoursePage:", err);
    }
  }

  // Fetch authors for the course
  let authorsList: any[] = [];
  try {
    authorsList = await db
      .select()
      .from(courseAuthors)
      .where(eq(courseAuthors.courseId, courseObj.id))
      .orderBy(asc(courseAuthors.orderIndex), asc(courseAuthors.createdAt));
  } catch (err) {
    console.error("Error fetching course authors in EditCoursePage:", err);
  }

  const formattedSections = sectionsList.map((s: any) => ({
    id: s.id,
    course_id: s.courseId,
    title: s.title,
    description: s.description || "",
    order_index: s.orderIndex,
  }));

  const formattedModules = modulesList.map((m: any) => ({
    id: m.id,
    course_id: m.courseId,
    section_id: m.sectionId || null,
    title: m.title,
    description: m.description || "",
    practical_task: m.practicalTask || "",
    order_index: m.orderIndex,
  }));

  const formattedLessons = lessonsList.map((l: any) => ({
    id: l.id,
    module_id: l.moduleId,
    title: l.title,
    summary: l.summary || null,
    content: l.content || null,
    formulas: l.formulas || null,
    video_url: l.videoUrl,
    video_id: videoStatusByLessonId[l.id]?.id || (l.videoUrl && UUID_REGEX.test(l.videoUrl) ? l.videoUrl : null),
    video_status: videoStatusByLessonId[l.id]?.status || null,
    order_index: l.orderIndex,
    is_free_preview: l.isFreePreview,
    delivery_type: l.deliveryType || 'recorded',
    scheduled_at: l.scheduledAt ? new Date(l.scheduledAt).toISOString() : null,
    release_at: l.releaseAt ? new Date(l.releaseAt).toISOString() : null,
    duration_minutes: l.durationMinutes || null,
    meeting_url: l.meetingUrl || null,
    materials: materialsByLessonId[l.id] || [],
  }));

  const formattedAuthors = authorsList.map((a: any) => ({
    id: a.id,
    course_id: a.courseId,
    name: a.name,
    photo_url: a.photoUrl || "",
    designation: a.designation || "",
    bio: a.bio || "",
    profile_url: a.profileUrl || "",
    order_index: a.orderIndex,
  }));

  return (
    <CourseEditor
      course={{
        id: courseObj.id,
        title: courseObj.title,
        slug: courseObj.slug || null,
        description: courseObj.description || "",
        short_description: courseObj.shortDescription || "",
        about_course: courseObj.aboutCourse || "",
        what_you_will_learn: courseObj.whatYouWillLearn || "",
        who_is_this_for: courseObj.whoIsThisFor || "",
        prerequisites: courseObj.prerequisites || "",
        content_overview: courseObj.contentOverview || "",
        seo_title: courseObj.seoTitle || "",
        seo_description: courseObj.seoDescription || "",
        price: Number(courseObj.price || 0),
        thumbnail_url: courseObj.thumbnailUrl || "",
        is_published: !!courseObj.isPublished,
        is_bundle: !!courseObj.isBundle,
        access_days: courseObj.accessDays ?? null,
        certificate_status: courseObj.certificateStatus || "disabled",
        certificate_activated_at: courseObj.certificateActivatedAt ? new Date(courseObj.certificateActivatedAt).toISOString() : null,
        certificate_activated_by: courseObj.certificateActivatedBy || null,
      }}
      initialSections={formattedSections}
      initialModules={formattedModules}
      initialLessons={formattedLessons}
      initialAuthors={formattedAuthors}
    />
  );
}
