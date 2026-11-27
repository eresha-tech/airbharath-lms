import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { academyEntitlementSources as sources, academyEntitlementEvents as events, coursePaymentChecks as checks, orders, users } from '@/lib/db/schema';
import { CommerceError } from '@/lib/commerce/model';
import { type PaymentFact, paise } from '@/lib/creator-payments/model';
import { appendAccessEvent } from './repository';
import { ACADEMY_POLICY } from './model';

export type RefundReader = (paymentId: string, page: { count: number; skip: number }) => Promise<{ items: unknown[] }>;
// One bounded page per worker step; the existing check row owns durable continuation.
export async function reconcileAcademyRefunds(database: typeof db, payment: PaymentFact, scope: string, read: RefundReader | undefined) {
  const source = await database.query.academyEntitlementSources.findFirst({ where: and(eq(sources.providerPaymentId, payment.id), eq(sources.scope, scope)), with: { events: true } });
  if (!source || source.policy !== ACADEMY_POLICY || source.events.some(event => event.kind === 'full_refund')) return;
  const check = await database.query.coursePaymentChecks.findFirst({ where: eq(checks.orderId, source.orderId!) });
  if (!payment.amount_refunded && !check?.refundScanSkip) return;
  if (!read || !check) throw new CommerceError(503, 'Successful refund evidence is still being checked.');
  const observedAt = new Date(), skip = check.refundScanSkip, count = 10;
  const page = await read(payment.id, { count, skip });
  if (!page || !Array.isArray(page.items) || page.items.length > count) throw new CommerceError(409, 'Refund evidence page requires review.');
  const parsed = page.items.map(raw => {
    const refund = raw as { id?: unknown; payment_id?: unknown; currency?: unknown; status?: unknown; amount?: unknown };
    if (!refund || typeof refund.id !== 'string' || !/^rfnd_[A-Za-z0-9_]{6,100}$/.test(refund.id) || refund.payment_id !== payment.id || refund.currency !== 'INR' || !['pending', 'processed', 'failed'].includes(String(refund.status))) throw new CommerceError(409, 'Refund identity requires review.');
    const amount = paise(refund.amount, payment.amount); if (!amount) throw new CommerceError(409, 'Refund amount requires review.');
    return { id: refund.id, status: String(refund.status), amount };
  });
  await database.transaction(async tx => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, source.userId)).for('update');
    const [order] = await tx.select().from(orders).where(eq(orders.id, source.orderId!)).for('update');
    if (order.razorpayOrderId !== payment.order_id || order.razorpayPaymentId !== payment.id || Math.round(Number(order.amount) * 100) !== payment.amount) throw new CommerceError(409, 'Refund purchase identity requires review.');
    const current = await tx.query.coursePaymentChecks.findFirst({ where: eq(checks.orderId, order.id) });
    if (!current || current.scope !== scope || current.refundScanSkip !== skip) return; // Another invocation advanced this exact page.
    for (const refund of parsed) if (refund.status === 'processed') await appendAccessEvent(tx, source, { kind: 'refund_processed', providerId: refund.id, status: refund.status, amountPaise: refund.amount, observedAt, evidence: { ...refund, paymentId: payment.id, scope } });
    const confirmed = await tx.select().from(events).where(and(eq(events.sourceId, source.id), eq(events.kind, 'refund_processed')));
    const total = confirmed.reduce((sum, event) => sum + event.amountPaise, 0);
    if (total === source.amountPaise && payment.amount_refunded === source.amountPaise) await appendAccessEvent(tx, source, { kind: 'full_refund', providerId: payment.id, status: 'processed', amountPaise: total, observedAt, evidence: { payment, refundIds: confirmed.map(event => event.providerId).sort(), scope } });
    const more = page.items.length === count;
    await tx.update(checks).set({ refundScanSkip: more ? skip + count : 0, ...(more ? { nextCheckAt: new Date() } : {}) }).where(eq(checks.orderId, order.id));
  });
}
