import 'server-only';
import { createHash } from 'node:crypto';
import { and, eq, or, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { academyEntitlementSources as sources, academyEntitlementEvents as events, enrollments, users, courses, orders } from '@/lib/db/schema';
import { CommerceError } from '@/lib/commerce/model';
import { ACADEMY_POLICY, effectiveEnrollment } from './model';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Order = typeof orders.$inferSelect;
// Access needs final causes only; refund-page audit history is not loaded into every lesson request.
export const sourceRelations = { academySources: { with: { events: { where: or(eq(events.kind, 'full_refund'), and(eq(events.kind, 'dispute'), inArray(events.status, ['won', 'lost']))) } } } } as const;
const hash = (input: unknown) => createHash('sha256').update(JSON.stringify(input)).digest('hex');
const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[1-5][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;

export function isProspectiveAcademyOrder(order: Order) {
  const policy = order.purchaseEvidence?.academyEntitlementPolicy;
  return !order.creatorId && !order.purchaseEvidence?.projectId && policy?.version === ACADEMY_POLICY && Number.isFinite(Date.parse(policy.effectiveAt)) && order.createdAt >= new Date(policy.effectiveAt);
}

export async function createPurchaseSource(tx: Tx, order: Order, enrollmentId: string, scope: string, ownsEnrollment: boolean, startsAt: Date, endsAt: Date | null, legacyCapture = false) {
  if (!isProspectiveAcademyOrder(order) && !legacyCapture) return;
  await tx.insert(sources).values({ enrollmentId, userId: order.userId!, courseId: order.courseId!, kind: 'purchase', orderId: order.id, scope, providerPaymentId: order.razorpayPaymentId, amountPaise: Math.round(Number(order.amount) * 100), policy: legacyCapture ? 'legacy-capture-exempt-v1' : ACADEMY_POLICY, startsAt, endsAt, ownsEnrollment }).onConflictDoNothing({ target: sources.orderId });
}

// Only successful authoritative provider facts reach this function. No client event payload grants/revokes access.
export async function appendAccessEvent(tx: Tx, source: typeof sources.$inferSelect, fact: { kind: string; providerId: string; status: string; amountPaise: number; observedAt: Date; evidence: unknown }) {
  const identity = and(eq(events.sourceId, source.id), eq(events.kind, fact.kind), eq(events.providerId, fact.providerId), eq(events.status, fact.status));
  const prior = await tx.query.academyEntitlementEvents.findFirst({ where: identity });
  if (prior) {
    if (prior.amountPaise !== fact.amountPaise) throw new CommerceError(409, 'Conflicting entitlement evidence requires review.');
    return;
  }
  if (fact.kind === 'dispute') {
    const history = await tx.select().from(events).where(and(eq(events.sourceId, source.id), eq(events.kind, 'dispute'), eq(events.providerId, fact.providerId)));
    if (history.some(event => event.observedAt > fact.observedAt || (['won', 'lost'].includes(event.status) && !['won', 'lost'].includes(fact.status)))) return;
    if (history.some(event => event.amountPaise !== fact.amountPaise)) throw new CommerceError(409, 'Dispute amount changed; review required.');
  }
  await tx.insert(events).values({ sourceId: source.id, kind: fact.kind, providerId: fact.providerId, status: fact.status, amountPaise: fact.amountPaise, observedAt: fact.observedAt, evidenceHash: hash(fact.evidence) }).onConflictDoNothing();
}

export async function recordAcademyDispute(tx: Tx, order: Order, dispute: { id: string; status: string; amount: number }, scope: string, observedAt: Date) {
  if (!isProspectiveAcademyOrder(order)) return;
  const source = await tx.query.academyEntitlementSources.findFirst({ where: eq(sources.orderId, order.id) });
  if (!source || source.scope !== scope || source.providerPaymentId !== order.razorpayPaymentId) throw new CommerceError(409, 'Purchase access evidence needs review.');
  await appendAccessEvent(tx, source, { kind: 'dispute', providerId: dispute.id, status: dispute.status, amountPaise: dispute.amount, observedAt, evidence: dispute });
}

export type GrantInput = { requestKey: string; userId: string; courseId: string; days?: number; endsAt?: string; extend?: boolean };
export async function grantAcademyAccess(actorId: string, input: GrantInput, database = db) {
  if (![actorId, input.requestKey, input.userId, input.courseId].every(value => UUID.test(value)) || (input.days !== undefined && (!Number.isSafeInteger(input.days) || input.days < 1 || input.days > 36500)) || (input.endsAt !== undefined && !Number.isFinite(Date.parse(input.endsAt)))) throw new CommerceError(400, 'Check the access grant details.');
  const commandHash = hash(input);
  return database.transaction(async tx => {
    const [actor] = await tx.select({ role: users.role }).from(users).where(eq(users.id, actorId)).for('share');
    if (actor?.role !== 'admin') throw new CommerceError(403, 'Admin access required.');
    const [target] = await tx.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).for('update');
    const course = await tx.query.courses.findFirst({ where: eq(courses.id, input.courseId) });
    if (!target || !course || course.workspaceProjectId) throw new CommerceError(409, 'Academy grant target is unavailable.');
    const prior = await tx.query.academyEntitlementSources.findFirst({ where: eq(sources.requestKey, input.requestKey) });
    if (prior && (prior.actorId !== actorId || prior.commandHash !== commandHash)) throw new CommerceError(409, 'Grant request conflicts with its saved intent.');
    let enrollment = await tx.query.enrollments.findFirst({ where: and(eq(enrollments.userId, input.userId), eq(enrollments.courseId, input.courseId)), with: sourceRelations });
    if (!prior) {
      const now = new Date(), current = effectiveEnrollment(enrollment, now).enrollment;
      const base = input.extend && current?.expiresAt && current.expiresAt > now ? current.expiresAt : now;
      const endsAt = input.endsAt ? new Date(input.endsAt) : input.days ? new Date(base.getTime() + input.days * 86400000) : null;
      if (endsAt && endsAt <= now) throw new CommerceError(400, 'Grant expiration must be in the future.');
      const ownsEnrollment = !enrollment;
      if (!enrollment) {
        const [created] = await tx.insert(enrollments).values({ userId: input.userId, courseId: input.courseId, status: 'active', expiresAt: endsAt }).returning();
        enrollment = { ...created, academySources: [] };
      }
      await tx.insert(sources).values({ enrollmentId: enrollment.id, userId: input.userId, courseId: input.courseId, kind: 'admin_grant', policy: ACADEMY_POLICY, startsAt: now, endsAt, ownsEnrollment, actorId, requestKey: input.requestKey, commandHash });
    }
    const saved = await tx.query.enrollments.findFirst({ where: eq(enrollments.id, enrollment!.id), with: sourceRelations });
    const effective = effectiveEnrollment(saved).enrollment;
    if (!effective) throw new CommerceError(409, 'Access remains restricted; review the saved grant.');
    return { id: effective.id, userId: effective.userId, courseId: effective.courseId, enrolledAt: effective.enrolledAt, status: effective.status, expiresAt: effective.expiresAt };
  });
}
