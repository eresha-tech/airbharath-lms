import { randomUUID, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { financialHarness, callbackSecret } from './workspace-payments-fixtures';
import { calculatePrice, normalizeCouponCode, validateCouponDefinition } from '@/lib/workspace/membership/model';
import { definition } from './workspace-membership-fixtures';
import { refundHarness } from './workspace-refunds-fixtures';
import { ProviderFailure } from '@/lib/workspace/payments/provider';
const sign = (order: string, payment: string) => createHmac('sha256', callbackSecret).update(`${order}|${payment}`).digest('hex');
it('fake callback-first held capture keeps a reserved slot until authoritative capture, then redeems exactly once', async () => {
  const h = financialHarness(), o = await h.ready(), p = h.captured(o, { capturedAt: null, captureTimeSource: null });
  await h.service.confirmPayment(o.userId, o.id, p.id, sign(o.providerOrderId!, p.id), callbackSecret);
  expect(o).toMatchObject({ financialState: 'captured', activationState: 'held_for_review', paidAt: null });
  expect(h.state.redemptions[0].status).toBe('reserved');
  await expect(h.input()).rejects.toMatchObject({ code: 'capacity' });
  Object.assign(p, { capturedAt: h.now.value, captureTimeSource: 'test_authoritative' });
  await h.service.reconcileOrder(o.userId, o.id); await h.service.reconcileOrder(o.userId, o.id);
  expect(o.activationState).toBe('pending_activation'); expect(h.state.redemptions).toHaveLength(1); expect(h.state.redemptions[0].status).toBe('redeemed');
});
it('fake valid frozen order honors capture after pause; different coupon is independently previewable after paid use', async () => {
  const h = financialHarness(), o = await h.ready(); h.offer.value.status = 'paused'; h.captured(o);
  await h.service.reconcileOrder(o.userId, o.id); expect(h.state.redemptions[0].status).toBe('redeemed');
  h.offer.value.status = 'active'; await expect(h.input(o.userId)).rejects.toMatchObject({ code: 'coupon_used' });
  h.offer.value = { ...h.offer.value, id: randomUUID(), code: 'OTHER_E_TEST' };
  expect((await h.input(o.userId)).request.couponCode).toBe('OTHER_E_TEST');
  // Existing initial-membership gate still blocks overlapping purchases; this phase adds no renewals.
});
it('fake same-user concurrent keys cannot reserve twice; response loss/TTL keeps last slot', async () => {
  const h = financialHarness(), a = await h.input(), b = { ...a.request, requestKey: randomUUID() };
  const results = await Promise.allSettled([h.service.acceptOrder(a.userId, a.request), h.service.acceptOrder(a.userId, b)]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1); expect(h.state.redemptions).toHaveLength(1);
  const order = h.state.orders[0];
  vi.mocked(h.provider.createOrder).mockRejectedValueOnce(new ProviderFailure('ambiguous'));
  await h.service.ensureProviderOrder(order.userId, order.id); h.now.value = new Date(h.now.value.getTime() + 24 * 3600000);
  await h.service.recoverProviderOrder(order.userId, order.id);
  expect(h.state.redemptions[0].status).toBe('reserved'); await expect(h.input()).rejects.toMatchObject({ code: 'capacity' });
  expect(h.provider.createOrder).toHaveBeenCalledTimes(1);
});
it('money stays integer and refuses zero, negative, free and overflowing discounts', () => {
  expect(calculatePrice(499900, 1800, { discountType: 'percentage', discountValue: 1000 })).toEqual({ basePricePaise: 499900, discountPaise: 49990, taxableAmountPaise: 449910, gstRateBps: 1800, gstAmountPaise: 80984, totalPaise: 530894 });
  expect(calculatePrice(499900, 1800, { discountType: 'fixed', discountValue: 50000 }).totalPaise).toBe(530882);
  for (const value of [0, -1, 499900, Number.MAX_SAFE_INTEGER]) expect(() => calculatePrice(499900, 1800, { discountType: 'fixed', discountValue: value })).toThrow();
  expect(() => calculatePrice(1, 1800, { discountType: 'percentage', discountValue: 1 })).toThrow();
  expect(normalizeCouponCode(' aviatora ')).toBe('AVIATORA'); expect(normalizeCouponCode('<script>')).toBeNull();
  expect(validateCouponDefinition({ ...definition, influencerId: 'forged', sourceType: 'influencer' })).toBeNull();
});
it('additive unapplied migration preserves old chain and enforces future SQL evidence/identity history', () => {
  const migration = readFileSync('drizzle/0023_chubby_jimmy_woo.sql', 'utf8');
  expect(migration).toContain('ADD COLUMN "influencer_id"'); expect(migration).toContain('Paid redemption requires authoritative eligible capture');
  expect(migration).toContain("o.paid_at IS NULL"); expect(migration).toContain("o.activation_state='held_for_review'");
  expect(migration).toContain("pg_trigger_depth()<2"); expect(migration).toContain("role='admin'");
  expect(migration).not.toMatch(/DISABLE TRIGGER|TRUNCATE|UPDATE workspace_coupon_redemptions|DELETE FROM|DROP TABLE/);
});

it('fake full-refund completion/replay retains paid coupon capacity and denies same-coupon reuse', async () => {
  const h = await refundHarness(); await h.approved();
  h.full(); await h.service.reconcile(h.order.id); await h.service.reconcile(h.order.id);
  expect(h.state.completion?.amountPaise).toBe(h.order.totalPaise);
  expect(h.finance.state.redemptions).toHaveLength(1); expect(h.finance.state.redemptions[0].status).toBe('redeemed');
  await expect(h.finance.input(h.order.userId)).rejects.toMatchObject({ code: 'coupon_used' });
  await expect(h.finance.input()).rejects.toMatchObject({ code: 'capacity' });
});
