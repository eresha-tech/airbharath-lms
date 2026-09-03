import { razorpay } from '@/lib/razorpay';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { courses, coupons, orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { courseId, couponCode } = await req.json();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    let finalAmount = Number(course.price) || 0;

    if (couponCode) {
      const cleanCode = couponCode.toUpperCase().trim();
      const coupon = await db.query.coupons.findFirst({
        where: eq(coupons.code, cleanCode),
      });

      if (coupon) {
        if (cleanCode === 'ABCOMBO' && course.slug !== 'combo-pack') {
          return NextResponse.json({ error: 'This coupon code is only valid for the Combo Pass' }, { status: 400 });
        }

        const now = new Date();
        const isExpired = coupon.expiryDate ? new Date(coupon.expiryDate) < now : false;
        const isLimitReached = coupon.usageLimit ? coupon.usedCount >= coupon.usageLimit : false;

        if (!isExpired && !isLimitReached) {
          if (coupon.discountType === 'percentage') {
            finalAmount = finalAmount - (finalAmount * (Number(coupon.discountValue) / 100));
          } else if (coupon.discountType === 'flat' || coupon.discountType === 'fixed') {
            finalAmount = finalAmount - Number(coupon.discountValue);
          }
          finalAmount = Math.round(finalAmount);
          if (finalAmount < 0) finalAmount = 0;
        }
      }
    }

    const options = {
      amount: Math.round(finalAmount * 100),
      currency: 'INR',
      receipt: `rcpt_${courseId.slice(0, 8)}_${Date.now().toString().slice(-8)}`,
      notes: {
        courseId: courseId,
        courseTitle: course.title,
        studentEmail: session.email || '',
        studentPhone: session.phone || '',
      },
    };

    const order = await razorpay.orders.create(options);

    await db.insert(orders).values({
      userId: session.id,
      courseId: courseId,
      razorpayOrderId: order.id,
      amount: finalAmount.toString(),
      status: 'pending',
    });

    return NextResponse.json({
      ...order,
      discountedAmount: finalAmount,
    });
  } catch (error: any) {
    console.error('RAZORPAY_ORDER_ERROR', error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}
