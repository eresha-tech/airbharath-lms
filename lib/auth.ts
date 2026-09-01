import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users, otps } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'airbharath-lms-super-secret-jwt-key-2026'
);

const SESSION_COOKIE_NAME = 'ab_session';

export interface UserSession {
  id: string;
  phone: string;
  fullName?: string | null;
  email?: string | null;
  role: string;
}

export async function createSessionToken(user: UserSession): Promise<string> {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserSession;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

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

function checkVerificationSuccess(data: any): boolean {
  if (!data) return false;
  if (data.status) {
    const statusStr = String(data.status).toLowerCase();
    if (statusStr === 'success') return true;
  }
  if (typeof data.verified === 'boolean') {
    return data.verified;
  }
  if (data.type === 'success') {
    return true;
  }
  if (data.message) {
    const msg = String(data.message).toLowerCase();
    const successMessages = ['otp verified', 'verification successful', 'success'];
    if (successMessages.some(s => msg.includes(s))) return true;
  }
  return false;
}

/**
 * Sends OTP via MSG91 API (or generates local OTP if MSG91_AUTH_KEY is not configured)
 */
export async function sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
  const formattedPhone = formatPhoneNumber(phone);
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  const authKey = process.env.OTP_PROVIDER_AUTHKEY || process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID || '682b2260d6fc0574074a8cc6';
  const otpServiceUrl = process.env.OTP_PROVIDER_URL || 'https://control.msg91.com';

  if (authKey && templateId) {
    try {
      const params = new URLSearchParams({
        otp_expiry: '10',
        template_id: templateId,
        mobile: formattedPhone,
        authkey: authKey,
        otp: otpCode,
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
        console.error(`MSG91 OTP send failed for ${formattedPhone}: ${res.status}`, data);
      } else {
        console.log(`MSG91 OTP sent successfully to ${formattedPhone}`);
      }
    } catch (err: any) {
      const reason = err.name === 'AbortError' ? 'Timeout (10s)' : (err?.cause?.code || err.message);
      console.warn(`[MSG91 Warning] Network issue (${reason}). Local OTP for ${formattedPhone}: ${otpCode}`);
    }
  } else {
    console.log(`[DEVELOPMENT] MSG91 OTP for ${formattedPhone}: ${otpCode}`);
  }

  // Save to DB otps table
  await db.insert(otps).values({
    phone: formattedPhone,
    otp: otpCode,
    expiresAt: expiresAt,
    verified: false,
  });

  return { success: true, message: 'OTP sent successfully' };
}

/**
 * Resends OTP via MSG91 API
 */
export async function resendOTP(phone: string, retryType: 'text' | 'voice' = 'text'): Promise<{ success: boolean; message: string }> {
  const formattedPhone = formatPhoneNumber(phone);
  const authKey = process.env.OTP_PROVIDER_AUTHKEY || process.env.MSG91_AUTH_KEY;
  const otpServiceUrl = process.env.OTP_PROVIDER_URL || 'https://control.msg91.com';

  if (authKey) {
    try {
      const params = new URLSearchParams({
        authkey: authKey,
        retrytype: retryType,
        mobile: formattedPhone,
      });

      const res = await fetch(`${otpServiceUrl}/api/v5/otp/retry?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (res.status === 200) {
        return { success: true, message: 'OTP resent successfully' };
      }
      console.error(`MSG91 OTP resend failed: ${res.status}`, data);
    } catch (err: any) {
      console.error('MSG91 OTP Resend Error:', err);
    }
  }

  return sendOTP(phone);
}

/**
 * Verifies OTP via MSG91 API / DB record / Master OTP
 */
export async function verifyOTP(phone: string, otp: string): Promise<{ success: boolean; user?: any; isNewUser?: boolean; message?: string }> {
  const formattedPhone = formatPhoneNumber(phone);
  const authKey = process.env.OTP_PROVIDER_AUTHKEY || process.env.MSG91_AUTH_KEY;
  const otpServiceUrl = process.env.OTP_PROVIDER_URL || 'https://control.msg91.com';

  let isVerified = false;

  // 1. Check Master OTP in dev
  const isMasterOtp = process.env.NODE_ENV !== 'production' && otp === '123456';
  if (isMasterOtp) {
    isVerified = true;
  }

  // 2. Check local DB record
  const record = await db.query.otps.findFirst({
    where: and(
      eq(otps.phone, formattedPhone),
      eq(otps.otp, otp),
      eq(otps.verified, false),
      gt(otps.expiresAt, new Date())
    ),
    orderBy: (otpsRecord: any, { desc }: any) => [desc(otpsRecord.createdAt)],
  });

  if (record) {
    isVerified = true;
    await db.update(otps).set({ verified: true }).where(eq(otps.id, record.id));
  }

  // 3. Check via MSG91 verify API if not verified locally
  if (!isVerified && authKey) {
    try {
      const params = new URLSearchParams({ otp, mobile: formattedPhone });
      const res = await fetch(`${otpServiceUrl}/api/v5/otp/verify?${params.toString()}`, {
        headers: { authkey: authKey },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 200 && checkVerificationSuccess(data)) {
        isVerified = true;
      }
    } catch (err: any) {
      console.error('MSG91 verify API error:', err);
    }
  }

  if (!isVerified) {
    return { success: false, message: 'Invalid or expired OTP' };
  }

  let user = await db.query.users.findFirst({
    where: eq(users.phone, formattedPhone),
  });

  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    const [inserted] = await db.insert(users).values({
      phone: formattedPhone,
      fullName: '',
      role: 'student',
    }).returning();
    user = inserted;
  }

  return { success: true, user, isNewUser };
}
