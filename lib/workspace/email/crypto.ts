import 'server-only';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
export function requireOtpSecret(secret: string) { if (secret.length < 32) throw new Error('email_verification_unavailable'); return secret; }
export const generateEmailCode = () => String(randomInt(0,1_000_000)).padStart(6,'0');
export const emailDigest = (secret: string, purpose: string, values: string[]) => createHmac('sha256',requireOtpSecret(secret)).update(JSON.stringify([purpose,...values])).digest('hex');
export const codeDigest = (secret: string, id: string, userId: string, email: string, code: string) => emailDigest(secret,'workspace-email-otp-v1',[id,userId,email,code]);
export function codeMatches(a: string,b: string) { return /^[a-f0-9]{64}$/.test(a) && /^[a-f0-9]{64}$/.test(b) && timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex')); }
