import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { courses, enrollments, users, certificates } from '@/lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getCertificateEligibility, getCourseLessonIds } from '@/lib/certificate-service';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { id: courseId } = await params;
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required.' }, { status: 400 });
    }

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
      with: {
        instructor: true,
      },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    // Get all enrolled students for this course
    const enrollmentsList = await db.query.enrollments.findMany({
      where: eq(enrollments.courseId, courseId),
      with: {
        user: true,
      },
      orderBy: [desc(enrollments.enrolledAt)],
    });

    const lessonIds = await getCourseLessonIds(courseId);
    const totalLessons = lessonIds.length;

    // Fetch existing certificates for this course in batch
    const existingCerts = await db.query.certificates.findMany({
      where: eq(certificates.courseId, courseId),
    });
    const certsByUserId = new Map(existingCerts.map((c) => [c.userId, c]));

    // Evaluate each enrolled student's progress and certificate status
    const studentList = [];
    let totalCompleted = 0;
    let totalEligible = 0;
    let totalIssued = 0;

    for (const enrollment of enrollmentsList) {
      const student = enrollment.user;
      if (!student) continue;

      const certRecord = certsByUserId.get(student.id);

      if (certRecord) {
        totalIssued++;
        studentList.push({
          userId: student.id,
          fullName: student.fullName || 'Student',
          email: student.email || '',
          phone: student.phone || '',
          enrolledAt: enrollment.enrolledAt,
          progressPercent: 100,
          completedLessons: totalLessons,
          totalLessons,
          isCompleted: true,
          status: certRecord.status === 'revoked' ? 'revoked' : 'issued',
          certificateCode: certRecord.certificateCode,
          certificateIssuedAt: certRecord.issuedAt,
          pdfUrl: certRecord.pdfUrl,
          issuedBy: certRecord.issuedBy,
        });
      } else {
        const eligibility = await getCertificateEligibility(student.id, courseId);
        if (eligibility.is100Percent) {
          totalCompleted++;
        }
        if (eligibility.isEligible) {
          totalEligible++;
        }

        studentList.push({
          userId: student.id,
          fullName: student.fullName || 'Student',
          email: student.email || '',
          phone: student.phone || '',
          enrolledAt: enrollment.enrolledAt,
          progressPercent: eligibility.progressPercent,
          completedLessons: eligibility.completedLessons,
          totalLessons: eligibility.totalLessons,
          isCompleted: eligibility.is100Percent,
          status: eligibility.status,
          certificateCode: null,
          certificateIssuedAt: null,
          pdfUrl: null,
          issuedBy: null,
        });
      }
    }

    // Activated by admin user lookup
    let activatedByAdmin = null;
    if (course.certificateActivatedBy) {
      const adminUser = await db.query.users.findFirst({
        where: eq(users.id, course.certificateActivatedBy),
      });
      if (adminUser) {
        activatedByAdmin = {
          id: adminUser.id,
          name: adminUser.fullName || adminUser.email || 'Admin',
        };
      }
    }

    return NextResponse.json({
      success: true,
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        certificateStatus: course.certificateStatus || 'disabled',
        certificateActivatedAt: course.certificateActivatedAt,
        certificateActivatedBy: activatedByAdmin,
        totalLessons,
      },
      stats: {
        totalEnrolled: enrollmentsList.length,
        totalCompleted,
        totalEligible,
        totalIssued,
        pendingEligibleCount: totalEligible,
      },
      students: studentList,
    });
  } catch (error: any) {
    console.error('GET_COURSE_CERTIFICATES_ERROR', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { id: courseId } = await params;
    const body = await req.json().catch(() => ({}));
    const { status } = body;

    if (!['disabled', 'active', 'paused'].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Allowed values: 'disabled', 'active', 'paused'" },
        { status: 400 }
      );
    }

    const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) });
    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    const updatePayload: any = {
      certificateStatus: status,
    };

    if (status === 'active' && course.certificateStatus !== 'active') {
      updatePayload.certificateActivatedAt = new Date();
      updatePayload.certificateActivatedBy = session.id;
    }

    const [updated] = await db
      .update(courses)
      .set(updatePayload)
      .where(eq(courses.id, courseId))
      .returning();

    return NextResponse.json({
      success: true,
      course: {
        id: updated.id,
        certificateStatus: updated.certificateStatus,
        certificateActivatedAt: updated.certificateActivatedAt,
        certificateActivatedBy: updated.certificateActivatedBy,
      },
    });
  } catch (error: any) {
    console.error('PATCH_COURSE_CERTIFICATE_STATUS_ERROR', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
