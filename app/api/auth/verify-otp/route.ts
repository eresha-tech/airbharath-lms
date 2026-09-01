import { NextResponse } from 'next/server';
import { verifyOTP, setSessionCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { phone, otp } = await req.json();
    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and OTP are required' }, { status: 400 });
    }

    const res = await verifyOTP(phone, otp);
    if (!res.success || !res.user) {
      return NextResponse.json({ error: res.message || 'Verification failed' }, { status: 400 });
    }

    await setSessionCookie({
      id: res.user.id,
      phone: res.user.phone,
      fullName: res.user.fullName,
      email: res.user.email,
      role: res.user.role || 'student',
    });

    return NextResponse.json({
      success: true,
      user: res.user,
      isNewUser: res.isNewUser || !res.user.fullName,
    });
  } catch (error: any) {
    console.error('Verify OTP route error:', error);
    return NextResponse.json({ error: error.message || 'OTP verification error' }, { status: 500 });
  }
}
