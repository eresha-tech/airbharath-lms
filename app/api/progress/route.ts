import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { progress, courses, modules, certificates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateAndSaveCertificate } from '@/lib/certificate-generator';
import { sendMailercloudEmail } from '@/lib/mailercloud';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ isCompleted: false });
    }

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');

    if (!lessonId) {
      return NextResponse.json({ isCompleted: false });
    }

    const record = await db.query.progress.findFirst({
      where: and(eq(progress.userId, session.id), eq(progress.lessonId, lessonId)),
    });

    return NextResponse.json({ isCompleted: !!record?.isCompleted });
  } catch {
    return NextResponse.json({ isCompleted: false });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId, courseId } = body;

    if (!lessonId) {
      return NextResponse.json({ error: "Missing lessonId" }, { status: 400 });
    }

    // Check current progress
    const existing = await db.query.progress.findFirst({
      where: and(eq(progress.userId, session.id), eq(progress.lessonId, lessonId)),
    });

    const newStatus = !existing?.isCompleted;

    if (existing) {
      await db
        .update(progress)
        .set({ isCompleted: newStatus, updatedAt: new Date() })
        .where(eq(progress.id, existing.id));
    } else {
      await db.insert(progress).values({
        userId: session.id,
        lessonId,
        isCompleted: true,
      });
    }

    // Check course completion for certificate if newly completed
    if (newStatus && courseId) {
      try {
        const courseModules = await db.query.modules.findMany({
          where: eq(modules.courseId, courseId),
          with: { lessons: true },
        });

        const allLessons: any[] = [];
        courseModules.forEach((m: any) => {
          if (m.lessons) allLessons.push(...m.lessons);
        });

        const lessonIds = allLessons.map((l) => l.id);

        if (lessonIds.length > 0) {
          const userProgressRecords = await db.query.progress.findMany({
            where: and(eq(progress.userId, session.id), eq(progress.isCompleted, true)),
          });
          const completedSet = new Set(userProgressRecords.map((p: any) => p.lessonId));

          const isFullyCompleted = lessonIds.every((id) => completedSet.has(id));

          if (isFullyCompleted) {
            const existingCert = await db.query.certificates.findFirst({
              where: and(eq(certificates.userId, session.id), eq(certificates.courseId, courseId)),
            });

            if (!existingCert) {
              const cert = await generateAndSaveCertificate(session.id, courseId);

              const courseObj = await db.query.courses.findFirst({
                where: eq(courses.id, courseId),
              });

              if (session.email) {
                await sendMailercloudEmail({
                  to: session.email,
                  name: session.fullName || 'Student',
                  subject: `🎓 Your Airbharath LMS Certificate: ${courseObj?.title}`,
                  html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                      <h2 style="color: #6b3ba7;">Congratulations ${session.fullName || 'Student'}!</h2>
                      <p>You have successfully completed 100% of <strong>${courseObj?.title}</strong> on Airbharath LMS.</p>
                      <p>Your verified Certificate Code: <strong>${cert.certificateCode}</strong></p>
                      <p>You can view and verify your official certificate at:</p>
                      <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/verify-certificate/${cert.certificateCode}" style="color: #6b3ba7; font-weight: bold;">Verify Certificate</a></p>
                    </div>
                  `,
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("Auto cert gen error:", err);
      }
    }

    return NextResponse.json({ success: true, isCompleted: newStatus });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update progress" }, { status: 500 });
  }
}
