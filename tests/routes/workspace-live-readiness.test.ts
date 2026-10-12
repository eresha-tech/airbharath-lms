import { it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { workspaceFinancialReadiness, financialConfiguration } from '@/lib/workspace/payments/configuration';
import { createRazorpayAdapter, createRazorpayTestAdapter } from '@/lib/workspace/payments/provider';
import { classifyWorkspaceRuntime } from '@/lib/workspace/payments/classification';
import { createRefundService } from '@/lib/workspace/refunds/service';
import { refundHarness } from './workspace-refunds-fixtures';
import { activationReviewReason, resolveMembershipAccess } from '@/lib/workspace/activation/model';

import { liveEnv } from './workspace-live-fixtures';

it('recognizes coherent production only with server deployment and database evidence; exposes no secrets', () => {
  const r = workspaceFinancialReadiness(liveEnv);
  expect(r).toMatchObject({ runtime: 'production', liveModeSafe: true, checkoutReady: true, refundMutationReady: true, webhookReady: true, reconciliationReady: true, noticesReady: false });
  expect(JSON.stringify(r)).not.toContain(liveEnv.WORKSPACE_RAZORPAY_KEY_SECRET);
  expect(JSON.stringify(r)).not.toContain(liveEnv.WORKSPACE_RAZORPAY_WEBHOOK_SECRET);
  expect(JSON.stringify(r)).not.toContain(liveEnv.WORKSPACE_RAZORPAY_KEY_ID);
  expect(classifyWorkspaceRuntime({ NODE_ENV: 'production', DATABASE_ENV: 'production' })).toBe('unclassified');
});
it.each([
  { VERCEL_ENV: 'preview' }, { VERCEL: undefined }, { VERCEL_TARGET_ENV: 'staging' }, { DATABASE_ENV: 'development' }, { NODE_ENV: 'development' },
  { WORKSPACE_RAZORPAY_KEY_ID: 'rzp_test_SYNTHETIC001' }, { WORKSPACE_RAZORPAY_MODE: 'test' }, { WORKSPACE_RAZORPAY_KEY_SECRET: '' }, { WORKSPACE_RAZORPAY_WEBHOOK_SECRET: '' },
  { WORKSPACE_RAZORPAY_ACCOUNT_ID: '' }, { WORKSPACE_RAZORPAY_ACCOUNT_ID: 'malformed' }, { WORKSPACE_RAZORPAY_TEST_AUTHORIZED: 'true' },
])('refuses unsafe financial configuration before HTTP: %j', async patch => {
  const env = { ...liveEnv, ...patch }, http = vi.fn<typeof fetch>();
  expect(financialConfiguration('checkout', env)).toBeNull();
  expect(financialConfiguration('refund', env)).toBeNull();
  expect(() => createRazorpayAdapter(env, http)).toThrow();
  expect(http).not.toHaveBeenCalled();
});
it('charge kill switch preserves webhook, reconciliation and separately enabled refunds', () => {
  expect(workspaceFinancialReadiness({ ...liveEnv, WORKSPACE_PAYMENT_ENABLED: 'false' })).toMatchObject({ checkoutReady: false, webhookReady: true, reconciliationReady: true, refundMutationReady: true });
});
it('Live mutation authorization is independent from safe intake/GET authorization', () => {
  expect(workspaceFinancialReadiness({ ...liveEnv, WORKSPACE_RAZORPAY_LIVE_AUTHORIZED: 'false' })).toMatchObject({ checkoutReady: false, refundMutationReady: false, webhookReady: true, reconciliationReady: true });
});
it('disabled order/refund mutations make zero HTTP calls while existing provider GET remains available', async () => {
  const http = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: 'order_SYNTHETIC001', receipt: 'synthetic', amount: 589882, currency: 'INR', status: 'paid', created_at: 1791806400 }));
  const p = createRazorpayAdapter({ ...liveEnv, WORKSPACE_PAYMENT_ENABLED: 'false', WORKSPACE_REFUND_ENABLED: 'false' }, http);
  await expect(p.createOrder({ amountPaise: 589882, currency: 'INR', receipt: 'synthetic' })).rejects.toMatchObject({ code: 'disabled' });
  await expect(p.createRefund({ paymentId: 'pay_SYNTHETIC001', amountPaise: 589882, requestId: randomUUID(), attemptId: randomUUID() })).rejects.toMatchObject({ code: 'disabled' });
  expect(http).not.toHaveBeenCalled();
  await expect(p.fetchOrder('order_SYNTHETIC001')).resolves.toMatchObject({ mode: 'live', accountId: liveEnv.WORKSPACE_RAZORPAY_ACCOUNT_ID });
  expect(http).toHaveBeenCalledTimes(1);
  expect(http.mock.calls[0][1]?.method).toBe('GET');
});
it('everything disabled has no provider access; LMS credentials never participate', () => {
  expect(() => createRazorpayAdapter({ ...liveEnv, WORKSPACE_PAYMENT_ENABLED: 'false', WORKSPACE_REFUND_ENABLED: 'false', WORKSPACE_RAZORPAY_WEBHOOK_ENABLED: 'false', WORKSPACE_RAZORPAY_RECONCILIATION_ENABLED: 'false' }, vi.fn())).toThrow();
  expect(financialConfiguration('checkout', { ...liveEnv, WORKSPACE_RAZORPAY_KEY_SECRET: undefined, RAZORPAY_KEY_SECRET: 'synthetic-fallback-must-not-work' })).toBeNull();
});
it('an injected HTTP fake cannot bypass explicit Test authorization; the compatibility adapter rejects Live', async () => {
  const http = vi.fn<typeof fetch>();
  const config = { mode: 'test' as const, accountId: 'acc_SYNTHETIC001', keyId: 'rzp_test_SYNTHETIC001', keySecret: 'synthetic-api-secret-only', webhookSecret: 'synthetic-hook-secret-only' };
  await expect(createRazorpayTestAdapter(config, http).createOrder({ amountPaise: 1, currency: 'INR', receipt: 'synthetic' })).rejects.toMatchObject({ code: 'disabled' });
  expect(() => createRazorpayTestAdapter({ ...config, mode: 'live', keyId: liveEnv.WORKSPACE_RAZORPAY_KEY_ID }, http)).toThrow();
  expect(http).not.toHaveBeenCalled();
});
it('normal persisted-admin refund workflow operates with charging disabled using only fake provider HTTP', async () => {
  const h = await refundHarness();
  h.order.providerMode = 'live'; h.order.commercialPolicyVersion = 'workspace-live-commercial-v1';
  const env = { ...liveEnv, WORKSPACE_PAYMENT_ENABLED: 'false', WORKSPACE_RAZORPAY_ACCOUNT_ID: h.order.providerAccountId };
  const responses: Record<string, unknown>[] = [];
  const http = vi.fn<typeof fetch>(async (url, init) => {
    const path = String(url);
    if (init?.method === 'POST') {
      expect(h.state.attempt?.state).toBe('uncertain');
      const refund = { entity: 'refund', id: 'rfnd_SYNTHETICLIVE001', payment_id: h.payment.id, amount: h.order.totalPaise, currency: 'INR', status: 'pending', created_at: 1791806400 };
      responses.push(refund); return Response.json(refund);
    }
    if (path.includes('/refunds?')) return Response.json({ items: responses });
    return Response.json({ entity: 'payment', id: h.payment.id, order_id: h.order.providerOrderId, amount: h.order.totalPaise, currency: 'INR', status: 'captured', captured: true, amount_refunded: 0, refund_status: null, created_at: 1791806400 });
  });
  const service = createRefundService(h.store, createRazorpayAdapter(env, http));
  await service.request(h.order.userId, h.order.id, h.command);
  await service.decide(h.adminId, h.order.id, { action: 'approve', confirmed: true });
  expect(h.state.request?.decision).toBe('approved');
  expect(http.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  expect(h.state.completion).toBeNull();
  await service.decide(h.adminId, h.order.id, { action: 'approve', confirmed: true });
  expect(http.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
});
it('a reconciliation-only provider cannot initiate approval, consume a prepared intent or blind-retry', async () => {
  const h = await refundHarness(), env = { ...liveEnv, WORKSPACE_PAYMENT_ENABLED: 'false', WORKSPACE_REFUND_ENABLED: 'false', WORKSPACE_RAZORPAY_ACCOUNT_ID: h.order.providerAccountId };
  h.order.providerMode = 'live'; await h.requested();
  const http = vi.fn<typeof fetch>(), service = createRefundService(h.store, createRazorpayAdapter(env, http));
  await expect(service.decide(h.adminId, h.order.id, { action: 'approve', confirmed: true })).rejects.toMatchObject({ code: 'unavailable' });
  expect(h.state.request?.decision).toBe('requested'); expect(h.state.attempt).toBeNull(); expect(http).not.toHaveBeenCalled();
});
it('Live activation refuses synthetic Test-authoritative capture and mode/policy cross-pairing', async () => {
  const h = await refundHarness(); h.order.providerMode = 'live'; h.order.commercialPolicyVersion = 'workspace-live-commercial-v1'; h.order.activationState = 'pending_activation'; h.order.fulfilledAt = null; h.payment.mode = 'live';
  const stored = { ...h.finance.state.payments[0], providerMode: 'live' };
  expect(activationReviewReason(h.order, stored, h.finance.state.redemptions[0], h.clock.value)).toBe('activation_payment_inconsistent');
  const evidence = { profileStatus: 'enabled' as const, providerMode: 'live', commercialPolicyVersion: 'workspace-live-commercial-v1', activationState: 'fulfilled' as const, membership: { startsAt: new Date('2026-11-08T18:30:00Z'), endsAt: new Date('2027-02-08T18:30:00Z'), fulfilledAt: h.clock.value, accessGrantedAt: h.clock.value } };
  expect(resolveMembershipAccess(evidence, h.clock.value, 'production').hasPaidEntitlement).toBe(true);
  expect(resolveMembershipAccess({ ...evidence, providerMode: 'test' }, h.clock.value, 'production').hasPaidEntitlement).toBe(false);
  expect(resolveMembershipAccess(evidence, h.clock.value, 'development').hasPaidEntitlement).toBe(false);
});
it('additive SQL admits mode-specific Live records without rewriting historical migrations or allowing Test capture evidence in Live', () => {
  const sql = readFileSync('drizzle/0021_workspace_live_financial_modes.sql', 'utf8');
  expect(sql).toContain('workspace-live-commercial-v1'); expect(sql).toContain("provider_mode='live' AND p.capture_time_source IS DISTINCT FROM 'razorpay_payment_captured_event_v1'");
  expect(sql).not.toMatch(/UPDATE\s+workspace_/i); expect(sql).not.toContain('DISABLE TRIGGER');
});
it('refuses reusing API/LMS signing secrets as the Workspace webhook secret', () => {
  for (const env of [{ ...liveEnv, WORKSPACE_RAZORPAY_WEBHOOK_SECRET: liveEnv.WORKSPACE_RAZORPAY_KEY_SECRET }, { ...liveEnv, RAZORPAY_WEBHOOK_SECRET: liveEnv.WORKSPACE_RAZORPAY_WEBHOOK_SECRET }]) expect(workspaceFinancialReadiness(env)).toMatchObject({ webhookReady: false, checkoutReady: false, reasons: expect.arrayContaining(['workspace_webhook_secret_not_distinct']) });
});
it('refund mutation pause leaves a prepared approved intent untouched while a read-only reconciliation observes no refund', async () => {
  const h = await refundHarness(); await h.requested();
  await h.store.transaction(h.order.id, h.adminId, async tx => {
    await tx.patchRequest({ decision: 'approved', decidedBy: h.adminId, decidedAt: h.clock.value, rejectionReason: null });
    await tx.createAttempt({ id: randomUUID(), requestId: tx.request!.id, membershipOrderId: h.order.id, userId: h.order.userId, providerAccountId: h.order.providerAccountId, providerMode: h.order.providerMode, providerPaymentId: h.order.winningPaymentId!, amountPaise: h.order.totalPaise, currency: h.order.currency });
  });
  const provider = { ...h.provider, refundMutationAllowed: () => false }, service = createRefundService(h.store, provider);
  await service.execute(h.order.id, h.state.attempt!.id); expect(h.state.attempt?.state).toBe('prepared');
  await service.reconcile(h.order.id); expect(h.state.attempt?.state).toBe('prepared'); expect(h.state.completion).toBeNull(); expect(h.provider.createRefund).not.toHaveBeenCalled();
});
