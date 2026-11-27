import { NextResponse } from 'next/server';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { db } from '@/lib/db';
import { enrollments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { prospectiveAcademyPolicy } from '@/lib/academy-entitlements/model';
import { grantAcademyAccess, sourceRelations } from '@/lib/academy-entitlements/repository';
import { CommerceError } from '@/lib/commerce/model';

export async function POST(req: Request) {
  try {
    const session = await getAuthorizedAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { enrollmentId, additionalDays, newExpirationDate, requestKey } = await req.json();
    if (!enrollmentId) {
      return NextResponse.json({ error: 'Enrollment ID is required' }, { status: 400 });
    }

    const existing = await db.query.enrollments.findFirst({
      with: { ...sourceRelations, course: true },
      where: eq(enrollments.id, enrollmentId),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    if (!existing.course.workspaceProjectId && (existing.academySources.length || prospectiveAcademyPolicy())) {
      const enrollment = await grantAcademyAccess(session.id, { requestKey, userId: existing.userId, courseId: existing.courseId, extend: true, ...(newExpirationDate ? { endsAt: newExpirationDate } : additionalDays ? { days: Number(additionalDays) } : {}) });
      return NextResponse.json({ success: true, enrollment });
    }

    let nextExpiresAt: Date | null = null;

    if (newExpirationDate) {
      nextExpiresAt = new Date(newExpirationDate);
    } else if (additionalDays) {
      const baseDate = existing.expiresAt && new Date(existing.expiresAt) > new Date()
        ? new Date(existing.expiresAt)
        : new Date();
      nextExpiresAt = new Date(baseDate.getTime() + Number(additionalDays) * 24 * 60 * 60 * 1000);
    }

    const [updated] = await db
      .update(enrollments)
      .set({
        expiresAt: nextExpiresAt,
        status: 'active',
      })
      .where(eq(enrollments.id, enrollmentId))
      .returning();

    return NextResponse.json({ success: true, enrollment: updated, message: 'Course access extended successfully' });
  } catch (error: any) {
    if (error instanceof CommerceError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error.message || 'Failed to extend access' }, { status: 500 });
  }
}
