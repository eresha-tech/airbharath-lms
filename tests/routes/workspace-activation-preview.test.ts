import { expect, it, vi } from 'vitest';
import { requestMembershipPreview } from '@/lib/workspace/membership/preview';
import { calculatePrice, membershipStartInfo } from '@/lib/workspace/membership/model';
import { plans, now } from './workspace-membership-fixtures';
const plan = { ...plans[0], basePricePaise: 499915 };
const quote = { quoteVersion: 'workspace-pricing-v1', planCode: plan.code, planVersionId: plan.id, planVersion: 1, planName: plan.displayName, durationMonths: 3, currency: 'INR' as const, ...calculatePrice(plan.basePricePaise, 1800), couponApplied: false, couponCode: null, generatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 600000).toISOString(), membershipStart: membershipStartInfo('2026-11-08T18:30:00.000Z', now), advisory: true as const, reserved: false as const, quoteHash: 'server-hash' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
it.each(['invalid_code', 'expired', 'capacity', 'wrong_plan', 'coupon_used', 'paused', 'archived', 'not_started', 'discount_invalid'])('replaces %s with a fresh standard server quote, preserving the inline error', async code => {
  const http = vi.fn<typeof fetch>().mockResolvedValueOnce(reply({ code, error: 'Coupon cannot be used' }, 422)).mockResolvedValueOnce(reply({ quote }));
  const result = await requestMembershipPreview(plan, 'BADCODE', new AbortController().signal, http);
  expect(result).toMatchObject({ quote: { totalPaise: 589900, discountPaise: 0, couponApplied: false }, error: '', couponError: 'Coupon cannot be used' });
  expect(JSON.parse(String(http.mock.calls[0][1]?.body)).couponCode).toBe('BADCODE');
  expect(JSON.parse(String(http.mock.calls[1][1]?.body))).toEqual({ planCode: plan.code, planVersionId: plan.id });
});
it('keeps valid discount economics and the exact authoritative quote hash', async () => {
  const discounted = { ...quote, ...calculatePrice(plan.basePricePaise, 1800, { discountType: 'fixed', discountValue: 140000 }), couponApplied: true, couponCode: 'VALIDCODE', quoteHash: 'discount-hash' };
  const http = vi.fn<typeof fetch>().mockResolvedValue(reply({ quote: discounted }));
  expect(await requestMembershipPreview(plan, 'VALIDCODE', new AbortController().signal, http)).toMatchObject({ quote: { totalPaise: 424700, quoteHash: 'discount-hash', couponCode: 'VALIDCODE' }, error: '', couponError: '' });
  expect(http).toHaveBeenCalledOnce();
});
it('does not manufacture a payable quote when eligibility or availability fails', async () => {
  for (const code of ['eligibility_required', 'unavailable', 'stale_plan']) {
    const http = vi.fn<typeof fetch>().mockResolvedValue(reply({ code, error: 'Blocked', destination: '/workspace/apply' }, 503));
    expect(await requestMembershipPreview(plan, 'BADCODE', new AbortController().signal, http)).toMatchObject({ quote: null, error: 'Blocked' });
    expect(http).toHaveBeenCalledOnce();
  }
});
it('keeps checkout blocked if the standard fallback fails and rejects late aborted responses', async () => {
  const http = vi.fn<typeof fetch>().mockResolvedValueOnce(reply({ code: 'expired', error: 'Expired' }, 422)).mockResolvedValueOnce(reply({ code: 'unavailable', error: 'Retry' }, 503));
  expect(await requestMembershipPreview(plan, 'OLDCODE', new AbortController().signal, http)).toMatchObject({ quote: null, error: 'Retry', couponError: 'Expired' });
  const controller = new AbortController();
  const delayed = vi.fn<typeof fetch>().mockImplementation(async () => { controller.abort(); return reply({ quote }); });
  await expect(requestMembershipPreview(plan, undefined, controller.signal, delayed)).rejects.toMatchObject({ name: 'AbortError' });
});
