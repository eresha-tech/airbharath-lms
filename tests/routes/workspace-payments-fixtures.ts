import { randomUUID } from 'node:crypto';
import { vi } from 'vitest';
import { readMembershipQuote } from '@/lib/workspace/membership/service';
import { createWorkspacePaymentService } from '@/lib/workspace/payments/service';
import { digest, type ProviderOrder, type ProviderPayment, type ProviderContext } from '@/lib/workspace/payments/model';
import type { WorkspaceProvider } from '@/lib/workspace/payments/provider';
import type { FinanceStore, FinanceTransaction, Order, Redemption, Payment, InboxEvent, NewOrder } from '@/lib/workspace/payments/repository';
import { plans, definition } from './workspace-membership-fixtures';
import { setting, policy } from './workspace-eligibility-fixtures';
export const financeNow = new Date('2026-10-06T12:00:00.000Z');
export const testContext: ProviderContext = { accountId: 'acc_TESTACCOUNT15A', mode: 'test' };
export const callbackSecret = 'synthetic-workspace-callback-secret-only';
export function financialHarness() {
  const state = { orders: [] as Order[], redemptions: [] as Redemption[], payments: [] as Payment[], events: [] as InboxEvent[] };
  let locked = false, tail = Promise.resolve(), failAt = '', failureCount = 0;
  const now = { value: financeNow }, offer = { value: { ...definition, id: randomUUID(), status: 'active', version: 1, usageLimit: 1 as number | null, createdBy: randomUUID(), createdAt: financeNow, updatedAt: financeNow, startsAt: null as Date | null, expiresAt: null as Date | null } };
  const catalog = structuredClone(plans), settings = { ...structuredClone(setting), configurationHash: digest(setting.config) }, currentPolicy = { ...structuredClone(policy), contentHash: digest(policy.declarations) }, eligibleUntil = { value: new Date('2026-11-30T12:00:00.000Z') };
  async function quote(userId: string, input: { planCode: string; planVersionId: string; couponCode?: string }, clock = () => now.value) {
    const tx = { query: {
      users: { findFirst: async () => ({ id: userId }) }, workspaceEligibilityAttempts: { findFirst: async () => ({ id: userId, userId, result: 'eligible', eligibleUntil: eligibleUntil.value, policyId: policy.id, decidedAt: financeNow, reapplyAt: null, reasons: [] }) },
      workspaceMembershipPlans: { findFirst: async () => catalog.find(p => p.code === input.planCode) }, workspaceEligibilitySettings: { findFirst: async () => settings }, workspacePolicyVersions: { findFirst: async () => currentPolicy },
      workspaceCoupons: { findFirst: async () => input.couponCode?.toUpperCase() === offer.value.code ? offer.value : undefined }, workspaceCouponPlans: { findMany: async () => offer.value.planCodes.map(planCode => ({ planCode })) },
    } } as unknown as Parameters<typeof readMembershipQuote>[0];
    return readMembershipQuote(tx, userId, input as Parameters<typeof readMembershipQuote>[2], clock);
  }
  function fault(operation: string) { if (failAt === operation && failureCount++ === 0) throw new Error('synthetic rollback'); }
  const tx: FinanceTransaction = {
    findRequest: async (u, k) => state.orders.find(o => o.userId === u && o.requestKey === k),
    findUnresolved: async u => state.orders.find(o => o.userId === u && (o.providerSetupState !== 'closed' || o.financialState === 'captured')),
    readQuote: quote,
    couponUse: async (c, u) => state.redemptions.find(r => r.couponId === c && r.userId === u && r.status !== 'released'),
    occupancy: async c => state.redemptions.filter(r => r.couponId === c && r.status !== 'released').length,
    async insertOrder(v: NewOrder) {
      fault('insertOrder'); const row: Order = { ...v, id: v.id || randomUUID(), currency: v.currency || 'INR', purchaseKind: v.purchaseKind || 'initial', createdAt: v.createdAt || now.value, provider: 'razorpay', providerMode: 'test', providerSetupState: 'creating', providerCreateStartedAt: null, providerRequestCount: 0, providerOrderId: null, providerOrderCreatedAt: null, providerRecoveryCheckedAt: null, providerRecoveryReason: null, providerCreateFailureHash: null, financialState: 'unpaid', activationState: 'pending_activation', winningPaymentId: null, paidAt: null, refundEligibleUntil: null, reviewReason: null, closedAt: null, closeReason: null, version: 1, couponId: v.couponId || null, couponCode: v.couponCode || null, couponSnapshot: v.couponSnapshot || null }; state.orders.push(row); return row;
    },
    getOrder: async id => state.orders.find(o => o.id === id),
    async patchOrder(id, p) { fault('patchOrder'); const o = state.orders.find(o => o.id === id)!; Object.assign(o, p, { version: o.version + 1 }); return o; },
    async insertRedemption(v) { fault('insertRedemption'); const r: Redemption = { ...v, id: v.id || randomUUID(), status: 'reserved', reservedAt: v.reservedAt || now.value, holdPolicyVersion: 'conservative-v1', redeemedAt: null, releasedAt: null, releaseReason: null, releaseEvidenceHash: null, releaseSource: null }; state.redemptions.push(r); return r; },
    getRedemption: async id => state.redemptions.find(r => r.membershipOrderId === id),
    async patchRedemption(id, p) { fault('patchRedemption'); const r = state.redemptions.find(r => r.id === id)!; Object.assign(r, p); return r; },
    getPayment: async (c, id) => state.payments.find(p => p.providerAccountId === c.accountId && p.providerMode === c.mode && p.providerPaymentId === id),
    async insertPayment(v) { fault('insertPayment'); const p: Payment = { ...v, id: v.id || randomUUID(), winner: v.winner || false, observedAt: v.observedAt || now.value, capturedAt: v.capturedAt || null, captureTimeSource: v.captureTimeSource || null, refundedPaise: v.refundedPaise || 0 }; state.payments.push(p); return p; },
    async patchPayment(id, p) { fault('patchPayment'); const row = state.payments.find(p => p.id === id)!; Object.assign(row, p); return row; },
    async finishEvent(id, status, at, orderId, error) { fault('finishEvent'); const e = state.events.find(e => e.id === id)!; Object.assign(e, { processingState: e.anomalyHash ? 'needs_review' : status, processedAt: at, membershipOrderId: orderId, lastErrorCode: error || null, leaseUntil: null }); },
  };
  const store: FinanceStore = {
    async transaction(_locks, fn) { const previous = tail; let release!: () => void; tail = new Promise(r => release = r); await previous; const snapshot = structuredClone(state); locked = true;
      try { return await fn(tx); } catch (e) { Object.assign(state, snapshot); throw e; } finally { locked = false; release(); }
    },
    readOrder: async (id, userId) => state.orders.find(o => o.id === id && (!userId || o.userId === userId)),
    matchOrder: async (c, id, receipt) => state.orders.find(o => o.providerAccountId === c.accountId && o.providerMode === c.mode && ((id && o.providerOrderId === id) || (receipt && o.providerReceipt === receipt))),
    async receiveEvent(c, e, at) {
      const old = state.events.find(x => x.providerAccountId === c.accountId && x.providerMode === c.mode && x.eventId === e.eventId);
      if (old) { if (old.payloadHash !== e.hash) Object.assign(old, { anomalyHash: e.hash, processingState: 'needs_review', processedAt: at }); return { event: old, anomaly: !!old.anomalyHash }; }
      const row: InboxEvent = { id: randomUUID(), providerAccountId: c.accountId, providerMode: c.mode, eventId: e.eventId, eventType: e.type, payloadHash: e.hash, evidence: e.evidence, receivedAt: at, processingState: 'pending', processedAt: null, leaseUntil: null, nextAttemptAt: null, attemptCount: 0, lastErrorCode: null, anomalyHash: null, membershipOrderId: null }; state.events.push(row); return { event: row, anomaly: false };
    },
    async claimEvent(id, at, context) { const e = state.events.find(e => e.id === id); if (!e || e.providerAccountId !== context.accountId || e.providerMode !== context.mode || ['processed', 'ignored', 'needs_review'].includes(e.processingState) || (e.leaseUntil && e.leaseUntil > at) || (e.nextAttemptAt && e.nextAttemptAt > at)) return undefined; Object.assign(e, { processingState: 'processing', attemptCount: e.attemptCount + 1, leaseUntil: new Date(at.getTime() + 60000) }); return e; },
    async retryEvent(id, at) { const e = state.events.find(e => e.id === id)!; if (!e.anomalyHash) Object.assign(e, { processingState: 'retry', processedAt: null, leaseUntil: null, nextAttemptAt: new Date(at.getTime() + 60000) }); },
    async finishUnmatchedEvent(id, at, status, reason) { Object.assign(state.events.find(e => e.id === id)!, { processingState: status, processedAt: at, leaseUntil: null, lastErrorCode: reason || null }); },
    pendingEvents: async (_now, limit, context) => state.events.filter(e => e.providerAccountId === context.accountId && e.providerMode === context.mode && !['processed', 'ignored', 'needs_review'].includes(e.processingState)).slice(0, limit), recoveryOrders: async (limit, context) => state.orders.filter(o => o.providerAccountId === context.accountId && o.providerMode === context.mode && o.providerSetupState !== 'closed').slice(0, limit),
  };
  const externalOrders: ProviderOrder[] = [], observations: ProviderPayment[] = [];
  const provider: WorkspaceProvider = { context: testContext,
    createOrder: vi.fn(async input => { if (locked) throw new Error('HTTP under database lock'); const o: ProviderOrder = { ...testContext, id: 'order_'+randomUUID().replaceAll('-', ''), receipt: input.receipt, amountPaise: input.amountPaise, currency: input.currency, status: 'created', createdAt: now.value }; externalOrders.push(o); return o; }),
    findOrders: vi.fn(async receipt => { if (locked) throw new Error('HTTP under database lock'); return externalOrders.filter(o => o.receipt === receipt); }),
    fetchOrder: vi.fn(async id => externalOrders.find(o => o.id === id)!),
    fetchPayment: vi.fn(async id => { if (locked) throw new Error('HTTP under database lock'); return observations.find(p => p.id === id)!; }),
    fetchOrderPayments: vi.fn(async id => observations.filter(p => p.orderId === id)),
  };
  const service = createWorkspacePaymentService(store, provider, () => now.value);
  async function input(userId: string = randomUUID(), coupon = true) { const identifiers = { planCode: 'quarterly' as const, planVersionId: plans[0].id, ...(coupon ? { couponCode: offer.value.code } : {}) }; const selection = await quote(userId, identifiers); return { userId, request: { ...identifiers, quoteHash: selection.quote.quoteHash, requestKey: randomUUID() } }; }
  async function ready(coupon = true) { const i = await input(randomUUID(), coupon); const order = await service.acceptOrder(i.userId, i.request); await service.ensureProviderOrder(i.userId, order.id); return order; }
  function captured(order: Order, patch: Partial<ProviderPayment> = {}) { const p: ProviderPayment = { ...testContext, id: 'pay_'+randomUUID().replaceAll('-', ''), orderId: order.providerOrderId!, amountPaise: order.totalPaise, currency: 'INR', state: 'captured', providerCreatedAt: financeNow, capturedAt: now.value, captureTimeSource: 'test_authoritative', refundedPaise: 0, ...patch }; observations.push(p); return p; }
  return { state, store, provider, service, offer, catalog, settings, currentPolicy, eligibleUntil, input, ready, captured, observations, externalOrders, now, locked: () => locked, fail: (at: string) => { failAt = at; failureCount = 0; }, hash: digest };
}
