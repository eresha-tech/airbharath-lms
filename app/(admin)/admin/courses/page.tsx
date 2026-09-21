import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import CoursesListClient, { FormattedCourseListItem } from "@/components/admin/CoursesListClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Course Catalog Management | AirBharath LMS Admin",
  description: "Manage technical curriculum, syllabus modules, video lectures, and live course publishing.",
};

export default async function AdminCourses() {
  const coursesList = await db.query.courses.findMany({
    with: {
      instructor: true,
      enrollments: true,
      modules: {
        with: {
          lessons: true,
        },
      },
    },
    orderBy: [desc(courses.createdAt)],
  });

  const formattedCourses: FormattedCourseListItem[] = coursesList.map((course: any) => {
    const modules = course.modules || [];
    let lessonCount = 0;
    modules.forEach((m: any) => {
      lessonCount += m.lessons?.length || 0;
    });

    return {
      id: course.id,
      title: course.title,
      slug: course.slug || null,
      description: course.description || null,
      thumbnailUrl: course.thumbnailUrl || null,
      price: Number(course.price || 0),
      accessDays: course.accessDays ?? null,
      isPublished: !!course.isPublished,
      createdAt: course.createdAt ? new Date(course.createdAt).toISOString() : new Date().toISOString(),
      studentCount: course.enrollments?.length || 0,
      moduleCount: modules.length,
      lessonCount,
      instructorName: course.instructor?.fullName || null,
    };
  });

  return <CoursesListClient initialCourses={formattedCourses} />;
}
