import { validNoticeEmail } from '../refund-notifications/configuration-core.mjs';
export const EMAIL_TTL_MS = 10 * 60_000;
export const EMAIL_COOLDOWN_MS = 60_000;
export const EMAIL_MAX_ATTEMPTS = 5;
export type EmailStatus = { email: string | null; verified: boolean; verifiedAt: string | null; resendAt?: string | null; challenge: { id: string; expiresAt: string; resendAt: string; state: string } | null };
export type EmailProof = { id: string; userId: string; email: string; verifiedAt: Date; active: boolean; challengeId: string };
export type EmailCode = 'validation' | 'authentication' | 'invalid_code' | 'limited' | 'unavailable';
export class EmailVerificationError extends Error { constructor(public code: EmailCode, public retryAfter?: number) { super(code); } }
export function normalizeEmail(value: unknown): string | null { if (typeof value !== 'string') return null; const email = value.trim().toLowerCase(); return validNoticeEmail(email) ? email : null; }
export function currentEmailProof(email: unknown, proof: EmailProof | null | undefined, userId: string, now: Date) { return !!proof && proof.userId === userId && proof.active && proof.email === normalizeEmail(email) && Number.isFinite(proof.verifiedAt.getTime()) && proof.verifiedAt <= now; }
