import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { certificates, courses, progress, users } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import {
  CertificatesView,
  EarnedCertificateData,
  InProgressTrackData,
} from "@/components/dashboard/CertificatesView";
import { getUserAccessSummary } from "@/lib/course-access";

export const dynamic = "force-dynamic";

export default async function StudentCertificatesPage() {
  const session = await getSession();

  if (!session) {
    return redirect("/login");
  }

  // 1. Get access summary for all accessible courses (direct + bundle entitlements)
  const accessSummary = await getUserAccessSummary(session.id);
  const targetCourseIds = accessSummary.effectiveCourseIds;

  // 2. Fetch student certificates, progress, profile, and accessible courses in parallel
  const [studentCertificates, allAccessibleCourses, userProgress, userProfile] = await Promise.all([
    db.query.certificates.findMany({
      where: eq(certificates.userId, session.id),
      with: {
        course: true,
      },
      orderBy: [desc(certificates.issuedAt)],
    }),
    targetCourseIds.length > 0
      ? db.query.courses.findMany({
          where: inArray(courses.id, targetCourseIds),
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
        })
      : Promise.resolve([]),
    db.query.progress.findMany({
      where: eq(progress.userId, session.id),
    }),
    db.query.users.findFirst({
      where: eq(users.id, session.id),
    }),
  ]);

  const completedLessonIds = new Set(
    userProgress.filter((p: any) => p.isCompleted).map((p: any) => p.lessonId)
  );

  const studentName = session.fullName || userProfile?.fullName || "AirBharath Student";

  // Map earned certificates with real data
  const earnedCertificates: EarnedCertificateData[] = studentCertificates.map((cert: any) => ({
    id: cert.id,
    courseId: cert.courseId,
    courseTitle: cert.course?.title || "Technical Training Program",
    courseSlug: cert.course?.slug ?? null,
    thumbnailUrl: cert.course?.thumbnailUrl ?? null,
    certificateCode: cert.certificateCode,
    studentName,
    issuedAt: cert.issuedAt,
    pdfUrl: cert.pdfUrl,
  }));

  const earnedCourseIds = new Set(earnedCertificates.map((c) => c.courseId));

  // Map accessible courses that are still in progress towards a certificate
  const inProgressTracks: InProgressTrackData[] = [];

  for (const course of allAccessibleCourses as any[]) {
    // Bundles are access containers; certificates are attached strictly to included learning courses
    if (course.isBundle || accessSummary.bundleCourseIds.includes(course.id)) {
      continue;
    }

    // If student already earned the certificate for this course, don't show under in-progress
    if (earnedCourseIds.has(course.id)) continue;

    let totalLessons = 0;
    let completedLessons = 0;
    const allLessons: Array<{ id: string; title: string }> = [];

    (course.modules || []).forEach((m: any) => {
      m.lessons?.forEach((l: any) => {
        totalLessons++;
        allLessons.push({ id: l.id, title: l.title });
        if (completedLessonIds.has(l.id)) {
          completedLessons++;
        }
      });
    });

    const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const is100Percent = totalLessons > 0 && completedLessons >= totalLessons;
    const courseCertStatus = (course.certificateStatus as 'disabled' | 'active' | 'paused') || 'disabled';

    let trackCertStatus: 'in_progress' | 'completed_pending' | 'completed_paused' | 'eligible' = 'in_progress';
    let isEligible = false;

    if (is100Percent) {
      if (courseCertStatus === 'active') {
        trackCertStatus = 'eligible';
        isEligible = true;
      } else if (courseCertStatus === 'paused') {
        trackCertStatus = 'completed_paused';
      } else {
        trackCertStatus = 'completed_pending';
      }
    }

    // Find resume lesson
    const nextIncomplete = allLessons.find((l) => !completedLessonIds.has(l.id));
    const resumeLesson = nextIncomplete || allLessons[0] || null;

    inProgressTracks.push({
      courseId: course.id,
      courseTitle: course.title,
      courseSlug: course.slug ?? null,
      thumbnailUrl: course.thumbnailUrl ?? null,
      percent,
      completedLessons,
      totalLessons,
      resumeLessonId: resumeLesson ? resumeLesson.id : "",
      resumeLessonTitle: resumeLesson ? resumeLesson.title : undefined,
      courseCertificateStatus: courseCertStatus,
      certificateStatus: trackCertStatus,
      isEligible,
    });
  }

  return (
    <CertificatesView
      earnedCertificates={earnedCertificates}
      inProgressTracks={inProgressTracks}
      totalEnrolledCount={targetCourseIds.length}
      studentName={studentName}
    />
  );
}
