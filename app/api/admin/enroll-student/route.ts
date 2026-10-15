import { NextResponse } from 'next/server';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { db } from '@/lib/db';
import { enrollments, courses, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const session = await getAuthorizedAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, courseId, customAccessDays } = await req.json();
    if (!userId || !courseId) {
      return NextResponse.json({ error: 'User ID and Course ID are required' }, { status: 400 });
    }

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const days = customAccessDays ? Number(customAccessDays) : (course.accessDays || null);
    const expiresAt = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

    const existing = await db.query.enrollments.findFirst({
      where: and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)),
    });

    if (existing) {
      const [updated] = await db
        .update(enrollments)
        .set({
          status: 'active',
          expiresAt: expiresAt,
        })
        .where(eq(enrollments.id, existing.id))
        .returning();
      return NextResponse.json({ success: true, enrollment: updated, message: 'Student enrollment updated' });
    }

    const [inserted] = await db
      .insert(enrollments)
      .values({
        userId,
        courseId,
        expiresAt,
        status: 'active',
      })
      .returning();

    return NextResponse.json({ success: true, enrollment: inserted, message: 'Student enrolled successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Enrollment failed' }, { status: 500 });
  }
}
