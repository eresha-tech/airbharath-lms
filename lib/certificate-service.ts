import { db } from '@/lib/db';
import { courses, modules, lessons, progress, certificates, users, enrollments } from '@/lib/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { generateAndSaveCertificate } from '@/lib/certificate-generator';
import { sendMailercloudEmail } from '@/lib/mailercloud';
import { hasCourseAccess } from '@/lib/course-access';

export type CertificateLifecycleStatus =
  | 'in_progress'
  | 'completed_pending'
  | 'completed_paused'
  | 'eligible'
  | 'issued'
  | 'revoked';

export interface StudentEligibilityResult {
  userId: string;
  courseId: string;
  courseTitle: string;
  courseCertificateStatus: 'disabled' | 'active' | 'paused';
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  is100Percent: boolean;
  isEligible: boolean; // True ONLY if 100% complete + active status + no existing cert
  status: CertificateLifecycleStatus;
  certificate: {
    id: string;
    certificateCode: string;
    issuedAt: Date | string;
    pdfUrl: string;
    status: string;
    issuedBy: string | null;
  } | null;
}

/**
 * Retrieves all lesson IDs belonging to a course
 */
export async function getCourseLessonIds(courseId: string): Promise<string[]> {
  const courseModules = await db.query.modules.findMany({
    where: eq(modules.courseId, courseId),
    with: { lessons: true },
  });

  const lessonIds: string[] = [];
  courseModules.forEach((m) => {
    if (m.lessons) {
      m.lessons.forEach((l) => lessonIds.push(l.id));
    }
  });

  return lessonIds;
}

/**
 * Authoritative Server-side Progress & Eligibility Calculation
 */
export async function getCertificateEligibility(
  userId: string,
  courseId: string
): Promise<StudentEligibilityResult> {
  const [course, existingCert] = await Promise.all([
    db.query.courses.findFirst({ where: eq(courses.id, courseId) }),
    db.query.certificates.findFirst({
      where: and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)),
    }),
  ]);

  if (!course) {
    throw new Error('Course not found');
  }

  // If a certificate is already issued/revoked, previous qualification stands
  if (existingCert) {
    const isRevoked = existingCert.status === 'revoked';
    return {
      userId,
      courseId,
      courseTitle: course.title,
      courseCertificateStatus: (course.certificateStatus as any) || 'disabled',
      totalLessons: 0,
      completedLessons: 0,
      progressPercent: 100,
      is100Percent: true,
      isEligible: false,
      status: isRevoked ? 'revoked' : 'issued',
      certificate: {
        id: existingCert.id,
        certificateCode: existingCert.certificateCode,
        issuedAt: existingCert.issuedAt,
        pdfUrl: existingCert.pdfUrl,
        status: existingCert.status,
        issuedBy: existingCert.issuedBy,
      },
    };
  }

  // Calculate against current course curriculum
  const lessonIds = await getCourseLessonIds(courseId);
  const totalLessons = lessonIds.length;

  let completedLessons = 0;
  if (totalLessons > 0) {
    const userCompletedRecords = await db.query.progress.findMany({
      where: and(
        eq(progress.userId, userId),
        eq(progress.isCompleted, true),
        inArray(progress.lessonId, lessonIds)
      ),
    });
    completedLessons = userCompletedRecords.length;
  }

  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const is100Percent = totalLessons > 0 && completedLessons >= totalLessons;
  const courseCertStatus = (course.certificateStatus as 'disabled' | 'active' | 'paused') || 'disabled';

  let status: CertificateLifecycleStatus = 'in_progress';
  let isEligible = false;

  if (!is100Percent) {
    status = 'in_progress';
  } else if (courseCertStatus === 'disabled') {
    status = 'completed_pending';
  } else if (courseCertStatus === 'paused') {
    status = 'completed_paused';
  } else if (courseCertStatus === 'active') {
    status = 'eligible';
    isEligible = true;
  }

  return {
    userId,
    courseId,
    courseTitle: course.title,
    courseCertificateStatus: courseCertStatus,
    totalLessons,
    completedLessons,
    progressPercent,
    is100Percent,
    isEligible,
    status,
    certificate: null,
  };
}

/**
 * Student Claim Certificate (Lazy Generation)
 */
export async function claimCertificate({
  userId,
  courseId,
  baseUrl,
}: {
  userId: string;
  courseId: string;
  baseUrl?: string;
}) {
  // 1. Verify active enrollment / bundle entitlement
  const access = await hasCourseAccess(userId, courseId);

  if (!access.hasAccess) {
    throw new Error('You are not enrolled in this course.');
  }

  // 2. Check eligibility from database
  const eligibility = await getCertificateEligibility(userId, courseId);

  // If already issued, return existing certificate (idempotent, no duplicate email)
  if (eligibility.status === 'issued' && eligibility.certificate) {
    return {
      success: true,
      alreadyExisted: true,
      certificate: eligibility.certificate,
    };
  }

  if (eligibility.status === 'completed_pending') {
    throw new Error(
      'Certificate issuance is not yet activated for this course. Your certificate will be available once activated by the academy.'
    );
  }

  if (eligibility.status === 'completed_paused') {
    throw new Error(
      'Certificate issuance for this course is temporarily paused for review.'
    );
  }

  if (eligibility.status === 'in_progress' || !eligibility.is100Percent) {
    throw new Error(
      `You must complete 100% of the course curriculum before claiming a certificate (${eligibility.completedLessons}/${eligibility.totalLessons} completed).`
    );
  }

  if (!eligibility.isEligible) {
    throw new Error('Course is not eligible for certificate issuance at this time.');
  }

  // 3. Generate and save certificate (issuedBy = null for student claim)
  const cert = await generateAndSaveCertificate(userId, courseId, {
    issuedBy: null,
    baseUrl,
  });

  // 4. Send notification email via Mailercloud (Non-fatal if email provider fails)
  const student = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (student?.email) {
    const domain = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'https://lms.airbharath.in';
    try {
      await sendMailercloudEmail({
        to: student.email,
        name: student.fullName || 'Student',
        subject: `🎓 Your AirBharath LMS Certificate: ${eligibility.courseTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #1e293b;">
            <h2 style="color: #014a62; margin-bottom: 12px;">Congratulations ${student.fullName || 'Student'}!</h2>
            <p>You have successfully completed 100% of <strong>${eligibility.courseTitle}</strong> and your official qualification has been registered on AirBharath LMS.</p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0; color: #166534; font-size: 14px;"><strong>Credential ID:</strong> <span style="font-family: monospace;">${cert.certificateCode}</span></p>
            </div>
            <p>You can view, download, and verify your official certificate at:</p>
            <p><a href="${domain}/verify-certificate/${cert.certificateCode}" style="display: inline-block; background-color: #014a62; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">Verify & View Certificate</a></p>
          </div>
        `,
      });
    } catch (emailErr: any) {
      console.warn(`[CLAIM CERTIFICATE EMAIL NON-FATAL] Email delivery failed for ${student.email}:`, emailErr?.message);
    }
  }

  return {
    success: true,
    alreadyExisted: false,
    certificate: {
      id: cert.id,
      certificateCode: cert.certificateCode,
      issuedAt: cert.issuedAt,
      pdfUrl: cert.pdfUrl,
      status: cert.status,
      issuedBy: cert.issuedBy,
    },
  };
}

/**
 * Admin Issue Certificate (Individual, Selected Bulk, or All Eligible)
 */
export async function adminIssueCertificates({
  courseId,
  studentIds,
  allEligible = false,
  adminId,
  baseUrl,
}: {
  courseId: string;
  studentIds?: string[];
  allEligible?: boolean;
  adminId: string;
  baseUrl?: string;
}) {
  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) });
  if (!course) throw new Error('Course not found');

  // Verify course certificate status is active
  if (course.certificateStatus !== 'active') {
    throw new Error(
      `Certificate issuance is currently ${course.certificateStatus || 'disabled'} for this course. Please activate certificate issuance before issuing certificates.`
    );
  }

  let targetUserIds: string[] = [];

  if (allEligible) {
    // Find all enrolled students
    const enrollmentsList = await db.query.enrollments.findMany({
      where: eq(enrollments.courseId, courseId),
    });
    targetUserIds = Array.from(new Set(enrollmentsList.map((e) => e.userId)));
  } else if (studentIds && studentIds.length > 0) {
    // Deduplicate studentIds to prevent duplicate processing
    targetUserIds = Array.from(new Set(studentIds.filter(Boolean)));
  } else {
    throw new Error('No students specified for certificate generation.');
  }

  const results = {
    totalProcessed: targetUserIds.length,
    issuedCount: 0,
    alreadyIssuedCount: 0,
    skippedCount: 0,
    errors: [] as Array<{ studentId: string; error: string }>,
  };

  const domain = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'https://lms.airbharath.in';

  for (const sId of targetUserIds) {
    try {
      // 1. Verify student exists
      const student = await db.query.users.findFirst({ where: eq(users.id, sId) });
      if (!student) {
        results.skippedCount++;
        results.errors.push({
          studentId: sId,
          error: 'Student account not found.',
        });
        continue;
      }

      // 2. Verify student has direct enrollment or bundle access to this course
      const access = await hasCourseAccess(sId, courseId);

      if (!access.hasAccess) {
        results.skippedCount++;
        results.errors.push({
          studentId: sId,
          error: 'Student is not enrolled in this course.',
        });
        continue;
      }

      // 3. Re-verify eligibility from database against current curriculum
      const eligibility = await getCertificateEligibility(sId, courseId);

      if (eligibility.status === 'issued') {
        results.alreadyIssuedCount++;
        continue;
      }

      if (!eligibility.is100Percent) {
        results.skippedCount++;
        results.errors.push({
          studentId: sId,
          error: `Student has not completed 100% of curriculum (${eligibility.completedLessons}/${eligibility.totalLessons})`,
        });
        continue;
      }

      // 4. Generate certificate with admin credit
      const cert = await generateAndSaveCertificate(sId, courseId, {
        issuedBy: adminId,
        baseUrl,
      });

      results.issuedCount++;

      // 5. Send email (Non-fatal if email provider fails)
      if (student.email) {
        try {
          await sendMailercloudEmail({
            to: student.email,
            name: student.fullName || 'Student',
            subject: `🎓 Your AirBharath LMS Certificate: ${course.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #1e293b;">
                <h2 style="color: #014a62; margin-bottom: 12px;">Congratulations ${student.fullName || 'Student'}!</h2>
                <p>Your official Certificate of Completion for <strong>${course.title}</strong> has been issued by the academy administration.</p>
                <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px; border-radius: 8px; margin: 16px 0;">
                  <p style="margin: 0; color: #166534; font-size: 14px;"><strong>Credential ID:</strong> <span style="font-family: monospace;">${cert.certificateCode}</span></p>
                </div>
                <p>You can view, download, and verify your official certificate at:</p>
                <p><a href="${domain}/verify-certificate/${cert.certificateCode}" style="display: inline-block; background-color: #014a62; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">Verify & View Certificate</a></p>
              </div>
            `,
          });
        } catch (emailErr: any) {
          console.warn(`[ADMIN ISSUE CERTIFICATE EMAIL NON-FATAL] Email delivery failed for ${student.email}:`, emailErr?.message);
        }
      }
    } catch (err: any) {
      results.errors.push({ studentId: sId, error: err.message || 'Issuance failed' });
    }
  }

  return results;
}
