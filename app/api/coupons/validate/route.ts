import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { code, amount } = await req.json();
    const supabase = await createClient();

    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }

    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .single();

    if (!coupon) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 });
    }

    const now = new Date();
    const isExpired = coupon.expiry_date ? new Date(coupon.expiry_date) < now : false;
    const isLimitReached = coupon.usage_limit ? coupon.used_count >= coupon.usage_limit : false;

    if (isExpired) {
      return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 });
    }

    if (isLimitReached) {
      return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 });
    }

    let discount = 0;
    let finalAmount = Number(amount);

    if (coupon.discount_type === 'percentage') {
      discount = Math.round(finalAmount * (Number(coupon.discount_value) / 100));
    } else if (coupon.discount_type === 'flat') {
      discount = Math.round(Number(coupon.discount_value));
    }

    finalAmount = Math.round(finalAmount - discount);
    if (finalAmount < 0) finalAmount = 0;

    return NextResponse.json({
      valid: true,
      discount,
      finalAmount,
      code: coupon.code,
    });
  } catch (error) {
    console.error('COUPON_VALIDATE_ERROR', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
