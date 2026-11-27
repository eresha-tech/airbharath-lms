import type { MediaJob } from './service';
export type OutputEntry = { name: string; size: number; etag: string };
export type VerificationProgress = {
  phase: 'listing' | 'verifying' | 'complete'; inventory: OutputEntry[]; continuation: string | null;
  verified: NonNullable<MediaJob['manifest']>;
};
export type VerificationCheckpoint = VerificationProgress & { version: number; providerJobId: string; sourceVersion: string };
export type VerificationPass = {
  checkpoint: VerificationCheckpoint | null; signal: AbortSignal;
  save(progress: VerificationProgress): Promise<void>;
};
export const VERIFICATION_OBJECTS_PER_PASS = 128;
export const VERIFICATION_BYTES_PER_PASS = 512 * 1024 ** 2;
export const VERIFICATION_PASS_MS = 45_000;
