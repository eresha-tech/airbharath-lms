import { randomUUID } from 'node:crypto';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ db: { transaction: mocks.transaction } }));
import { postgresCreatorTermsStore } from '@/lib/workspace/terms/repository';
import { currentCreatorTerms } from '@/lib/workspace/terms/model';
import { workspaceCreatorTermsAcceptances, users, workspaceCreatorTermsVersions } from '@/lib/db/schema';
import type { CreatorTermsAcceptance } from '@/lib/workspace/terms/model';
const userId = randomUUID(), now = new Date('2026-10-12T12:00:00.000Z');
let rows: CreatorTermsAcceptance[], hasUser: boolean, current: boolean;
let locks: string[];
beforeEach(() => {
  rows = []; hasUser = true; current = true; locks = [];
  mocks.transaction.mockImplementation(async work => work({
    select: () => ({ from: (table: unknown) => ({ where: () => ({ for: async (mode: string) => {
      if (table === users) { locks.push(`user:${mode}`); return hasUser ? [{ id: userId }] : []; }
      expect(table).toBe(workspaceCreatorTermsVersions); locks.push(`terms:${mode}`);
      return current ? [{ termsVersion: currentCreatorTerms().version, contentHash: currentCreatorTerms().contentHash, effectiveAt: new Date(currentCreatorTerms().effectiveAt) }] : [];
    } }) }) }),
    insert: (table: unknown) => ({ values: (values: Omit<CreatorTermsAcceptance, 'id'>) => ({ onConflictDoNothing: async (options: { target: unknown[] }) => {
      expect(table).toBe(workspaceCreatorTermsAcceptances); expect(options.target).toHaveLength(2);
      if (!rows.some(row => row.userId === values.userId && row.termsVersion === values.termsVersion)) rows.push({ ...values, id: randomUUID() });
    } }) }),
    query: { workspaceCreatorTermsAcceptances: { findFirst: async () => rows[0] } },
  }));
});
it('persists server evidence, locks owner then current document, and converges on retries', async () => {
  const first = await postgresCreatorTermsStore.accept(userId, currentCreatorTerms(), now);
  const repeated = await postgresCreatorTermsStore.accept(userId, currentCreatorTerms(), new Date(now.getTime() + 1000));
  expect(first).toEqual(repeated); expect(rows).toHaveLength(1);
  expect(first).toMatchObject({ userId, termsVersion: currentCreatorTerms().version, termsContentHash: currentCreatorTerms().contentHash, acceptedAt: now, createdAt: now });
  expect(locks).toEqual(['user:update', 'terms:share', 'user:update', 'terms:share']);
});
it('missing persisted user or unavailable current catalogue cannot record acceptance', async () => {
  hasUser = false; await expect(postgresCreatorTermsStore.accept(userId, currentCreatorTerms(), now)).rejects.toMatchObject({ code: 'authentication' });
  hasUser = true; current = false; await expect(postgresCreatorTermsStore.accept(userId, currentCreatorTerms(), now)).rejects.toMatchObject({ code: 'unavailable' }); expect(rows).toHaveLength(0);
});
