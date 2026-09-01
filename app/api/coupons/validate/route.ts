import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { coupons } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { code, amount } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }

    const couponObj = await db.query.coupons.findFirst({
      where: eq(coupons.code, code.toUpperCase().trim()),
    });

    if (!couponObj) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 });
    }

    const now = new Date();
    const isExpired = couponObj.expiryDate ? new Date(couponObj.expiryDate) < now : false;
    const isLimitReached = couponObj.usageLimit ? (couponObj.usedCount || 0) >= couponObj.usageLimit : false;

    if (isExpired) {
      return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 });
    }

    if (isLimitReached) {
      return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 });
    }

    let discount = 0;
    let finalAmount = Number(amount);

    if (couponObj.discountType === 'percentage') {
      discount = Math.round(finalAmount * (Number(couponObj.discountValue) / 100));
    } else if (couponObj.discountType === 'flat') {
      discount = Math.round(Number(couponObj.discountValue));
    }

    finalAmount = Math.round(finalAmount - discount);
    if (finalAmount < 0) finalAmount = 0;

    return NextResponse.json({
      valid: true,
      discount,
      finalAmount,
      code: couponObj.code,
    });
  } catch (error) {
    console.error('COUPON_VALIDATE_ERROR', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
