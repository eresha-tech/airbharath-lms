import { normalizedIndianMobile } from '@/lib/phone-number';
import { localUatOtpMode, localUatRequestAllowed } from '@/lib/local-uat-otp';
import { NextResponse } from 'next/server';
import { formatPhoneNumber, sendOTP } from '@/lib/auth';
import { consumeOtpRateLimit } from '@/lib/otp-rate-limit';

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    if (!normalizedIndianMobile(phone)) {
      return NextResponse.json({ error: 'Valid 10-digit mobile number required' }, { status: 400 });
    }

    if (localUatOtpMode() !== 'off' && !localUatRequestAllowed(req)) return NextResponse.json({ error:'OTP service is temporarily unavailable' }, { status:503 });

    const limit = await consumeOtpRateLimit('send', formatPhoneNumber(phone));
    if (limit.status === 'unavailable') {
      return NextResponse.json({ error: 'OTP service is temporarily unavailable' }, { status: 503 });
    }
    if (limit.status === 'limited') {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
      );
    }

    const result = await sendOTP(phone);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 503 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('OTP_SEND_ROUTE_ERROR', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
