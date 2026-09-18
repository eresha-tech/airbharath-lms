import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { feedPosts, enrollments, courses, progress, certificates, jobs } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  StudentFeedView,
  FeedPostItem,
  SidebarCourseItem,
  SidebarJobItem,
} from "@/components/dashboard/StudentFeedView";

export const dynamic = "force-dynamic";

export default async function StudentFeedPage() {
  const session = await getSession();

  if (!session) {
    return redirect("/login");
  }

  // Fetch real posts, student enrollments, progress, certificates, and recent jobs in parallel
  const [postsData, userEnrollments, userProgress, userCertificates, recentJobsData] =
    await Promise.all([
      db.query.feedPosts.findMany({
        with: { author: true },
        orderBy: [desc(feedPosts.createdAt)],
      }),
      db.query.enrollments.findMany({
        where: eq(enrollments.userId, session.id),
        with: {
          course: {
            with: {
              modules: {
                orderBy: (m: any, { asc }: any) => [asc(m.orderIndex)],
                with: {
                  lessons: {
                    orderBy: (l: any, { asc }: any) => [asc(l.orderIndex)],
                  },
                },
              },
            },
          },
        },
        orderBy: [desc(enrollments.enrolledAt)],
      }),
      db.query.progress.findMany({
        where: eq(progress.userId, session.id),
      }),
      db.query.certificates.findMany({
        where: eq(certificates.userId, session.id),
      }),
      db.query.jobs.findMany({
        orderBy: [desc(jobs.createdAt)],
        limit: 3,
      }),
    ]);

  const completedLessonIds = new Set(
    userProgress.filter((p: any) => p.isCompleted).map((p: any) => p.lessonId)
  );

  // Determine earliest active in-progress course for the sidebar
  let activeCourse: SidebarCourseItem | null = null;

  for (const enrollment of userEnrollments as any[]) {
    const course = enrollment.course;
    if (!course) continue;

    let totalLessons = 0;
    let completedLessons = 0;
    const allLessons: Array<{ id: string; title: string }> = [];

    (course.modules as any[])?.forEach((m: any) => {
      m.lessons?.forEach((l: any) => {
        totalLessons++;
        allLessons.push({ id: l.id, title: l.title });
        if (completedLessonIds.has(l.id)) {
          completedLessons++;
        }
      });
    });

    const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    if (percent < 100) {
      const nextIncomplete = allLessons.find((l) => !completedLessonIds.has(l.id));
      const resumeLesson = nextIncomplete || allLessons[0] || null;

      activeCourse = {
        id: course.id,
        title: course.title,
        percent,
        totalLessons,
        completedLessons,
        resumeLessonId: resumeLesson ? resumeLesson.id : null,
      };
      break;
    }
  }

  // Format posts
  const posts: FeedPostItem[] = postsData.map((p: any) => ({
    id: p.id,
    content: p.content,
    imageUrl: p.imageUrl,
    createdAt: p.createdAt,
    author: p.author
      ? {
          id: p.author.id,
          fullName: p.author.fullName,
          avatarUrl: p.author.avatarUrl,
          role: p.author.role,
        }
      : null,
  }));

  // Format recent jobs
  const recentJobs: SidebarJobItem[] = recentJobsData.map((j: any) => ({
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    createdAt: j.createdAt,
  }));

  return (
    <StudentFeedView
      posts={posts}
      activeCourse={activeCourse}
      recentJobs={recentJobs}
      certificatesCount={userCertificates.length}
    />
  );
}
