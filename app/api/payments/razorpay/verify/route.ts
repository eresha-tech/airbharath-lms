import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { orders, enrollments, courses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateAndSaveInvoice } from '@/lib/invoice-generator';
import { serverTrack } from '@/lib/analytics-server';

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (secret) {
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    // Find order in DB
    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.razorpayOrderId, razorpay_order_id),
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update order status to paid
    await db
      .update(orders)
      .set({
        status: 'paid',
        razorpayPaymentId: razorpay_payment_id,
      })
      .where(eq(orders.id, existingOrder.id));

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
    console.error('RAZORPAY_VERIFY_ERROR', error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}
