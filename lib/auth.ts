import { localUatOtpMode } from './local-uat-otp';
import { localUatOtpProvider } from './local-uat-otp-provider';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  hasConfiguredValue,
  isOtpVerificationSuccessful,
  newUserValues,
} from '@/lib/auth-policy';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production.');
    }
    throw new Error('JWT_SECRET environment variable is not configured. Please set JWT_SECRET in your .env file.');
  }
  return new TextEncoder().encode(secret);
}

const SESSION_COOKIE_NAME = 'ab_session';

export interface UserSession {
  id: string;
  phone: string;
  fullName?: string | null;
  email?: string | null;
  role: string;
}

export async function createSessionToken(user: UserSession): Promise<string> {
  const secret = getJwtSecret();
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as UserSession;
  } catch {
    return null;
  }
}

import { cache } from 'react';

export const getSession = cache(async (): Promise<UserSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
});

export async function setSessionCookie(user: UserSession) {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = '91' + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Sends OTP via MSG91 API
 */
export async function sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
  const formattedPhone = formatPhoneNumber(phone);
  if (localUatOtpMode() !== 'off') {
    const provider = await localUatOtpProvider(formattedPhone);
    return provider?.send(formattedPhone) ? { success:true, message:'Local UAT verification ready' } : { success:false, message:'OTP service is unavailable' };
  }
  const authKey = process.env.OTP_PROVIDER_AUTHKEY || process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const otpServiceUrl = process.env.OTP_PROVIDER_URL || 'https://control.msg91.com';

  if (!hasConfiguredValue(authKey) || !hasConfiguredValue(templateId)) {
    return { success: false, message: 'OTP service is unavailable' };
  }

  try {
    const params = new URLSearchParams({
      otp_expiry: '10',
      template_id: templateId,
      mobile: formattedPhone,
      authkey: authKey,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${otpServiceUrl}/api/v5/otp?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));
    if (res.status !== 200 || data.type === 'error') {
      console.error('MSG91_OTP_SEND_FAILED');
      return { success: false, message: 'Failed to send OTP' };
    }

    return { success: true, message: 'OTP sent successfully' };
  } catch {
    console.error('MSG91_OTP_SEND_FAILED');
    return { success: false, message: 'Failed to send OTP' };
  }
}

/**
 * Resends OTP via MSG91 API
 */
export async function resendOTP(phone: string, retryType: 'text' | 'voice' = 'text'): Promise<{ success: boolean; message: string }> {
  const formattedPhone = formatPhoneNumber(phone);
  if (localUatOtpMode() !== 'off') {
    const { consumeOtpRateLimit } = await import('./otp-rate-limit');
    const limit = await consumeOtpRateLimit('send',formattedPhone);
    if (limit.status !== 'allowed') return { success:false, message:'Please wait before requesting another OTP' };
    const provider = await localUatOtpProvider(formattedPhone);
    return provider?.send(formattedPhone) ? { success:true, message:'Local UAT verification ready' } : { success:false, message:'OTP service is unavailable' };
  }
  const authKey = process.env.OTP_PROVIDER_AUTHKEY || process.env.MSG91_AUTH_KEY;
  const otpServiceUrl = process.env.OTP_PROVIDER_URL || 'https://control.msg91.com';

  if (!hasConfiguredValue(authKey)) {
    return { success: false, message: 'OTP service is unavailable' };
  }

  try {
    const params = new URLSearchParams({
      authkey: authKey,
      retrytype: retryType,
      mobile: formattedPhone,
    });

    const res = await fetch(`${otpServiceUrl}/api/v5/otp/retry?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (res.status === 200 && data.type !== 'error') {
      return { success: true, message: 'OTP resent successfully' };
    }
  } catch {
    // Return the same fail-closed response for provider and network failures.
  }

  console.error('MSG91_OTP_RESEND_FAILED');
  return { success: false, message: 'Failed to resend OTP' };
}

/**
 * Verifies OTP via MSG91 API
 */
export async function verifyOTP(phone: string, otp: string): Promise<{ success: boolean; user?: any; isNewUser?: boolean; message?: string }> {
  const formattedPhone = formatPhoneNumber(phone);
  if (localUatOtpMode() !== 'off') {
    const provider = await localUatOtpProvider(formattedPhone);
    if (!provider?.verify(formattedPhone,otp)) return { success:false, message:'Invalid or expired OTP' };
  } else {
  const authKey = process.env.OTP_PROVIDER_AUTHKEY || process.env.MSG91_AUTH_KEY;
  const otpServiceUrl = process.env.OTP_PROVIDER_URL || 'https://control.msg91.com';

  if (!hasConfiguredValue(authKey)) {
    return { success: false, message: 'OTP service is unavailable' };
  }

  let isVerified = false;
  try {
    const params = new URLSearchParams({ otp, mobile: formattedPhone });
    const res = await fetch(`${otpServiceUrl}/api/v5/otp/verify?${params.toString()}`, {
      headers: { authkey: authKey },
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 200 && isOtpVerificationSuccessful(data)) {
      isVerified = true;
    }
  } catch {
    console.error('MSG91_OTP_VERIFY_FAILED');
  }

  if (!isVerified) {
    return { success: false, message: 'Invalid or expired OTP' };
  }

  }

  let user = await db.query.users.findFirst({
    where: eq(users.phone, formattedPhone),
  });

  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    const [inserted] = await db.insert(users).values(newUserValues(formattedPhone)).returning();
    user = inserted;
  }

  if (localUatOtpMode() !== 'off' && user.role !== 'student') return { success:false, message:'OTP service is unavailable' };
  return { success: true, user, isNewUser };
}
