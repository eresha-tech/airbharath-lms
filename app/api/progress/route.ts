import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { progress } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCertificateEligibility } from '@/lib/certificate-service';

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

    // Evaluate derived progress & certificate eligibility if courseId provided
    let eligibilityInfo: any = null;
    if (courseId) {
      try {
        eligibilityInfo = await getCertificateEligibility(session.id, courseId);
      } catch (err) {
        console.warn("Progress eligibility calc notice:", err);
      }
    }

    return NextResponse.json({
      success: true,
      isCompleted: newStatus,
      progressPercent: eligibilityInfo?.progressPercent ?? null,
      isEligible: eligibilityInfo?.isEligible ?? false,
      certificateStatus: eligibilityInfo?.status ?? null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update progress" }, { status: 500 });
  }
}
