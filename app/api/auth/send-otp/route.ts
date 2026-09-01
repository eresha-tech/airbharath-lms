import { NextResponse } from 'next/server';
import { sendOTP } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: 'Valid 10-digit mobile number required' }, { status: 400 });
    }

    const result = await sendOTP(phone);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Send OTP route error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send OTP' }, { status: 500 });
  }
}
