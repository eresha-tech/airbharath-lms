import { normalizedIndianMobile } from '@/lib/phone-number';
import { localUatOtpMode, localUatRequestAllowed } from '@/lib/local-uat-otp';
import { NextResponse } from 'next/server';
import { formatPhoneNumber, verifyOTP, setSessionCookie } from '@/lib/auth';
import { sessionRoleFromPersistedRole } from '@/lib/auth-policy';
import { consumeOtpRateLimit } from '@/lib/otp-rate-limit';

export async function POST(req: Request) {
  try {
    const { phone, otp } = await req.json();
    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and OTP are required' }, { status: 400 });
    }

    if (!normalizedIndianMobile(phone)) return NextResponse.json({ error:'Valid 10-digit mobile number required' }, { status:400 });

    if (localUatOtpMode() !== 'off' && !localUatRequestAllowed(req)) return NextResponse.json({ error:'OTP service is temporarily unavailable' }, { status:503 });

    const limit = await consumeOtpRateLimit('verify', formatPhoneNumber(phone));
    if (limit.status === 'unavailable') {
      return NextResponse.json({ error: 'OTP service is temporarily unavailable' }, { status: 503 });
    }
    if (limit.status === 'limited') {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
      );
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
      role: sessionRoleFromPersistedRole(res.user.role),
    });

    return NextResponse.json({
      success: true,
      user: res.user,
      isNewUser: res.isNewUser || !res.user.fullName,
    });
  } catch (error) {
    console.error('OTP_VERIFY_ROUTE_ERROR', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'OTP verification error' }, { status: 500 });
  }
}
