import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, workspaceCreatorTermsVersions as versions, workspaceCreatorTermsAcceptances as acceptances } from '@/lib/db/schema';
import { CreatorTermsError } from './model';
import type { CreatorTermsStore } from './service';

export const postgresCreatorTermsStore: CreatorTermsStore = {
  async accept(userId, terms, now) {
    return db.transaction(async tx => {
      const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
      if (!user) throw new CreatorTermsError('authentication');
      const [version] = await tx.select().from(versions).where(and(eq(versions.termsVersion, terms.version), eq(versions.contentHash, terms.contentHash), eq(versions.isCurrent, true))).for('share');
      if (!version || version.effectiveAt.toISOString() !== terms.effectiveAt || version.effectiveAt > now) throw new CreatorTermsError('unavailable');
      await tx.insert(acceptances).values({ userId, termsVersion: terms.version, termsContentHash: terms.contentHash, acceptedAt: now, createdAt: now }).onConflictDoNothing({ target: [acceptances.userId, acceptances.termsVersion] });
      const row = await tx.query.workspaceCreatorTermsAcceptances.findFirst({ where: and(eq(acceptances.userId, userId), eq(acceptances.termsVersion, terms.version), eq(acceptances.termsContentHash, terms.contentHash)) });
      if (!row) throw new CreatorTermsError('unavailable');
      return row;
    });
  },
};
