import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    const adminSupabase = createAdminClient();

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Update order status using admin client
      const { data: order, error: updateError } = await adminSupabase
        .from('orders')
        .update({ status: 'paid', razorpay_payment_id })
        .eq('razorpay_order_id', razorpay_order_id)
        .select()
        .single();

      if (updateError || !order) {
        console.error('VERIFY_ORDER_UPDATE_ERROR', updateError || 'Order not found in DB');
        return NextResponse.json({ error: 'Order update failed' }, { status: 400 });
      }

      // Enroll user in course using admin client
      const { error: enrollError } = await adminSupabase.from('enrollments').insert({
        user_id: order.user_id,
        course_id: order.course_id,
      });

      if (enrollError) {
        // Code 23505 is PostgreSQL unique_violation (user already enrolled)
        if (enrollError.code === '23505') {
          console.log('User already enrolled, ignoring duplicate enrollment insert');
        } else {
          console.error('VERIFY_ENROLLMENT_ERROR', enrollError);
          return NextResponse.json({ error: 'Enrollment failed' }, { status: 500 });
        }
      }

      return NextResponse.json({ message: 'Success' });
    } else {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  } catch (error) {
    console.error('RAZORPAY_VERIFY_ERROR', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
