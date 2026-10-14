import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { UUID } from '../eligibility/model';
import { EmailVerificationError, normalizeEmail } from './model';

export async function readContactEmail(userId: string) {
  if (!UUID.test(userId)) throw new EmailVerificationError('authentication');
  const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { email: true } });
  if (!user) throw new EmailVerificationError('authentication');
  return normalizeEmail(user.email);
}
export async function saveContactEmail(userId: string, input: unknown) {
  if (!UUID.test(userId)) throw new EmailVerificationError('authentication');
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || !('email' in input)) throw new EmailVerificationError('validation');
  const email = normalizeEmail(input.email);
  if (!email) throw new EmailVerificationError('validation');
  return db.transaction(async tx => {
    const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
    if (!user) throw new EmailVerificationError('authentication');
    // Serialize with order acceptance. The existing contact-change trigger revokes
    // stale proof; saving contact never creates or upgrades ownership evidence.
    await tx.update(users).set({ email }).where(eq(users.id, userId));
    return email;
  });
}
