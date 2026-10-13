import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, workspaceInfluencers as influencers } from '@/lib/db/schema';
import { object, UUID } from '../eligibility/model';
import { MembershipError } from './service';

export function influencerDefinition(raw: unknown) {
  if (!object(raw) || Object.keys(raw).some(k => !['displayName', 'description', 'status'].includes(k)) || typeof raw.displayName !== 'string' || !raw.displayName.trim() || raw.displayName.length > 120 || !['active', 'inactive'].includes(String(raw.status))) return null;
  if (raw.description !== null && (typeof raw.description !== 'string' || !raw.description.trim() || raw.description.length > 500)) return null;
  if (/[\u0000-\u001f\u007f]/.test(raw.displayName + (raw.description || ''))) return null;
  return { displayName: raw.displayName.trim(), description: raw.description === null ? null : (raw.description as string).trim(), status: raw.status as 'active' | 'inactive' };
}
export async function listInfluencers(actorId: string) {
  return db.transaction(async tx => {
    const [actor] = await tx.select({ role: users.role }).from(users).where(eq(users.id, actorId)).for('share');
    if (actor?.role !== 'admin') throw new MembershipError('forbidden');
    return tx.select({ id: influencers.id, displayName: influencers.displayName, description: influencers.description, status: influencers.status, version: influencers.version }).from(influencers).orderBy(desc(influencers.createdAt), desc(influencers.id)).limit(500);
  });
}
export async function saveInfluencer(actorId: string, id: string, raw: unknown, expectedVersion?: number) {
  const definition = influencerDefinition(raw);
  if (!definition || !UUID.test(id) || (expectedVersion !== undefined && (!Number.isInteger(expectedVersion) || expectedVersion < 1 || expectedVersion >= 2147483647))) throw new MembershipError('validation');
  return db.transaction(async tx => {
    const [actor] = await tx.select({ role: users.role }).from(users).where(eq(users.id, actorId)).for('share');
    if (actor?.role !== 'admin') throw new MembershipError('forbidden');
    if (expectedVersion === undefined) {
      const [created] = await tx.insert(influencers).values({ id, ...definition, createdBy: actorId, updatedBy: actorId }).onConflictDoNothing().returning();
      if (created) return created;
      const [prior] = await tx.select().from(influencers).where(eq(influencers.id, id));
      if (prior?.createdBy === actorId && prior.version === 1 && prior.displayName === definition.displayName && prior.description === definition.description && prior.status === definition.status) return prior;
      throw new MembershipError('conflict');
    }
    const [changed] = await tx.update(influencers).set({ ...definition, updatedBy: actorId, version: expectedVersion + 1, updatedAt: sql`greatest(clock_timestamp(), ${influencers.updatedAt} + interval '1 millisecond')` }).where(and(eq(influencers.id, id), eq(influencers.version, expectedVersion))).returning();
    if (!changed) throw new MembershipError('conflict');
    return changed;
  });
}
