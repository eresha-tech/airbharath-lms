import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, workspaceRefundPolicyVersions as versions, workspaceRefundPolicyAcceptances as acceptances } from '@/lib/db/schema';
import { acceptanceMatches, RefundPolicyError, currentRefundPolicy } from './model';
import type { RefundPolicyStore } from './service';

export const postgresRefundPolicyStore: RefundPolicyStore = {
  async accept(userId, terms, now) {
    return db.transaction(async tx => {
      const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
      if (!user) throw new RefundPolicyError('authentication');
      const [version] = await tx.select().from(versions).where(and(eq(versions.policyVersion, terms.version), eq(versions.contentHash, terms.contentHash), eq(versions.isCurrent, true))).for('share');
      if (!version || version.effectiveAt.toISOString() !== terms.effectiveAt || version.effectiveAt > now) throw new RefundPolicyError('unavailable');
      await tx.insert(acceptances).values({ userId, policyVersion: terms.version, policyContentHash: terms.contentHash, acceptedAt: now, createdAt: now }).onConflictDoNothing({ target: [acceptances.userId, acceptances.policyVersion] });
      const row = await tx.query.workspaceRefundPolicyAcceptances.findFirst({ where: and(eq(acceptances.userId, userId), eq(acceptances.policyVersion, terms.version), eq(acceptances.policyContentHash, terms.contentHash)) });
      if (!row) throw new RefundPolicyError('unavailable');
      return row;
    });
  },
};

// Private page projection only; purchase authorization still rechecks inside its transaction.
export async function readCurrentRefundPolicyAcceptance(userId: string) {
  const terms = currentRefundPolicy(), now = new Date();
  return db.transaction(async tx => {
    const [version] = await tx.select().from(versions).where(eq(versions.isCurrent, true)).for('share');
    if (!version || version.policyVersion !== terms.version || version.contentHash !== terms.contentHash || version.effectiveAt.toISOString() !== terms.effectiveAt || version.effectiveAt > now) throw new RefundPolicyError('unavailable');
    const row = await tx.query.workspaceRefundPolicyAcceptances.findFirst({ where: and(eq(acceptances.userId, userId), eq(acceptances.policyVersion, terms.version), eq(acceptances.policyContentHash, terms.contentHash)) });
    if (row && !acceptanceMatches(row, userId, terms, now)) throw new RefundPolicyError('unavailable');
    return row ? { policyVersion: row.policyVersion, policyContentHash: row.policyContentHash, acceptedAt: row.acceptedAt.toISOString() } : null;
  });
}
