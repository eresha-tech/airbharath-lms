import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, enrollments, courses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateAndSaveInvoice } from '@/lib/invoice-generator';
import { serverTrack } from '@/lib/analytics-server';
import { verifyRazorpaySignature } from '@/lib/razorpay-signature';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid payment verification request' }, { status: 400 });
    }

    const body = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : {};

    const verification = verifyRazorpaySignature(
      body.razorpay_order_id,
      body.razorpay_payment_id,
      body.razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET,
    );

    if (!verification.ok) {
      if (verification.reason === 'configuration') {
        console.error('RAZORPAY_VERIFY_CONFIGURATION_ERROR');
        return NextResponse.json(
          { error: 'Payment verification is temporarily unavailable' },
          { status: 503 },
        );
      }

      const error = verification.reason === 'malformed'
        ? 'Invalid payment verification request'
        : 'Payment verification failed';
      return NextResponse.json({ error }, { status: 400 });
    }

    // Find order in DB
    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.razorpayOrderId, verification.orderId),
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Payment order not found' }, { status: 404 });
    }

    if (existingOrder.userId !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (existingOrder.status === 'paid') {
      if (existingOrder.razorpayPaymentId !== verification.paymentId) {
        return NextResponse.json({ error: 'Payment cannot be verified' }, { status: 409 });
      }

      return NextResponse.json({
        success: true,
        message: 'Payment already verified',
        alreadyVerified: true,
      });
    }

    if (existingOrder.status !== 'pending') {
      return NextResponse.json({ error: 'Payment cannot be verified' }, { status: 409 });
    }

    // Only one concurrent request may transition this order and execute side effects.
    const [paidOrder] = await db
      .update(orders)
      .set({
        status: 'paid',
        razorpayPaymentId: verification.paymentId,
      })
      .where(and(eq(orders.id, existingOrder.id), eq(orders.status, 'pending')))
      .returning({ id: orders.id });

    if (!paidOrder) {
      const latestOrder = await db.query.orders.findFirst({
        where: eq(orders.id, existingOrder.id),
      });

      if (
        latestOrder?.status === 'paid' &&
        latestOrder.razorpayPaymentId === verification.paymentId
      ) {
        return NextResponse.json({
          success: true,
          message: 'Payment already verified',
          alreadyVerified: true,
        });
      }

      return NextResponse.json({ error: 'Payment cannot be verified' }, { status: 409 });
    }

    // Determine course access duration
    let expiresAt: Date | null = null;
    if (existingOrder.courseId) {
      const course = await db.query.courses.findFirst({
        where: eq(courses.id, existingOrder.courseId),
      });
      if (course?.accessDays) {
        expiresAt = new Date(Date.now() + course.accessDays * 24 * 60 * 60 * 1000);
      }
    }

    // Create or update enrollment
    if (existingOrder.userId && existingOrder.courseId) {
      const existingEnrollment = await db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.userId, existingOrder.userId),
          eq(enrollments.courseId, existingOrder.courseId)
        ),
      });

      if (existingEnrollment) {
        await db
          .update(enrollments)
          .set({
            status: 'active',
            expiresAt: expiresAt || existingEnrollment.expiresAt,
          })
          .where(eq(enrollments.id, existingEnrollment.id));
      } else {
        await db.insert(enrollments).values({
          userId: existingOrder.userId,
          courseId: existingOrder.courseId,
          expiresAt: expiresAt,
          status: 'active',
        });
      }

      // Track authoritative server-side payment success and enrollment completion
      await serverTrack(existingOrder.userId, 'payment_succeeded', {
        order_id: existingOrder.id,
        razorpay_order_id: existingOrder.razorpayOrderId,
        course_id: existingOrder.courseId,
        amount: Number(existingOrder.amount) || 0,
      });

      await serverTrack(existingOrder.userId, 'enrollment_completed', {
        course_id: existingOrder.courseId,
        order_id: existingOrder.id,
        is_free: false,
        amount: Number(existingOrder.amount) || 0,
      });
    }

    // Generate automatic invoice
    try {
      await generateAndSaveInvoice(existingOrder.id);
    } catch (invErr) {
      console.error('Auto invoice generation error:', invErr);
    }

    return NextResponse.json({ success: true, message: 'Payment verified and enrolled successfully' });
  } catch (error: any) {
    console.error('RAZORPAY_VERIFY_ERROR', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 });
  }
}
