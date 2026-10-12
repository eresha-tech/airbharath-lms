import { randomUUID } from 'node:crypto';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ db: { transaction: mocks.transaction } }));
import { postgresRefundPolicyStore, readCurrentRefundPolicyAcceptance } from '@/lib/workspace/refund-policy/repository';
import { currentRefundPolicy } from '@/lib/workspace/refund-policy/model';
import { workspaceRefundPolicyAcceptances, users, workspaceRefundPolicyVersions } from '@/lib/db/schema';
import type { RefundPolicyAcceptance } from '@/lib/workspace/refund-policy/model';
const userId = randomUUID(), now = new Date('2026-10-12T12:00:00.000Z');
let rows: RefundPolicyAcceptance[], hasUser: boolean, current: boolean;
let locks: string[];
beforeEach(() => {
  rows = []; hasUser = true; current = true; locks = [];
  mocks.transaction.mockImplementation(async work => work({
    select: () => ({ from: (table: unknown) => ({ where: () => ({ for: async (mode: string) => {
      if (table === users) { locks.push(`user:${mode}`); return hasUser ? [{ id: userId }] : []; }
      expect(table).toBe(workspaceRefundPolicyVersions); locks.push(`terms:${mode}`);
      return current ? [{ policyVersion: currentRefundPolicy().version, contentHash: currentRefundPolicy().contentHash, effectiveAt: new Date(currentRefundPolicy().effectiveAt) }] : [];
    } }) }) }),
    insert: (table: unknown) => ({ values: (values: Omit<RefundPolicyAcceptance, 'id'>) => ({ onConflictDoNothing: async (options: { target: unknown[] }) => {
      expect(table).toBe(workspaceRefundPolicyAcceptances); expect(options.target).toHaveLength(2);
      if (!rows.some(row => row.userId === values.userId && row.policyVersion === values.policyVersion)) rows.push({ ...values, id: randomUUID() });
    } }) }),
    query: { workspaceRefundPolicyAcceptances: { findFirst: async () => rows[0] } },
  }));
});
it('persists server evidence, locks owner then current document, and converges on retries', async () => {
  const first = await postgresRefundPolicyStore.accept(userId, currentRefundPolicy(), now);
  const repeated = await postgresRefundPolicyStore.accept(userId, currentRefundPolicy(), new Date(now.getTime() + 1000));
  expect(first).toEqual(repeated); expect(rows).toHaveLength(1);
  expect(first).toMatchObject({ userId, policyVersion: currentRefundPolicy().version, policyContentHash: currentRefundPolicy().contentHash, acceptedAt: now, createdAt: now });
  expect(locks).toEqual(['user:update', 'terms:share', 'user:update', 'terms:share']);
});
it('missing persisted user or unavailable current catalogue cannot record acceptance', async () => {
  hasUser = false; await expect(postgresRefundPolicyStore.accept(userId, currentRefundPolicy(), now)).rejects.toMatchObject({ code: 'authentication' });
  hasUser = true; current = false; await expect(postgresRefundPolicyStore.accept(userId, currentRefundPolicy(), now)).rejects.toMatchObject({ code: 'unavailable' }); expect(rows).toHaveLength(0);
});
it('reload projection reads authoritative current evidence without writing or exposing owner/acceptance IDs', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-12T12:01:00.000Z'));
  try {
    expect(await readCurrentRefundPolicyAcceptance(userId)).toBeNull();
    await postgresRefundPolicyStore.accept(userId, currentRefundPolicy(), now);
    const receipt = await readCurrentRefundPolicyAcceptance(userId);
    expect(receipt).toEqual({ policyVersion: currentRefundPolicy().version, policyContentHash: currentRefundPolicy().contentHash, acceptedAt: now.toISOString() });
    expect(rows).toHaveLength(1); expect(receipt).not.toHaveProperty('userId'); expect(receipt).not.toHaveProperty('id');
    current = false; await expect(readCurrentRefundPolicyAcceptance(userId)).rejects.toMatchObject({ code: 'unavailable' });
  } finally { vi.useRealTimers(); }
});
