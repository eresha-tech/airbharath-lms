import { expect, it, vi } from 'vitest';
import type { CaptureResult } from 'posthog-js';
const mocks = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/lib/analytics', () => ({ track: mocks.track }));
import { sanitizeWorkspaceAnalytics } from '@/lib/workspace/analytics-privacy';
import { trackCouponApplied, trackPlanSelected } from '@/lib/workspace/membership/analytics';
function event(name: string, path: string, extra: Record<string, unknown> = {}): CaptureResult {
  return { uuid: 'event', event: name, timestamp: new Date(), properties: { $current_url: `https://example.test${path}?coupon=PRIVATE14&quote=private-money`, pathname: path, $device_id: 'anonymous-device', distinct_id: 'private-account', couponCode: 'PRIVATE14', campaignName: 'Private campaign', sourceName: 'Private influencer', quoteHash: 'private-hash', totalPaise: 589882, $elements: [{ text: 'PRIVATE14' }], $set: { email: 'private-email' }, ...extra } };
}
it.each(['/workspace/activate', '/admin/workspace/coupons', '/admin/workspace/coupons/private-id'])('suppresses input autocapture/person data and sanitizes URL on %s', path => {
  for (const name of ['$autocapture', '$identify', '$exception']) expect(sanitizeWorkspaceAnalytics(event(name, path))).toBeNull();
  const output = sanitizeWorkspaceAnalytics(event('$pageview', path)); expect(output?.properties.distinct_id).toBe('workspace-device:anonymous-device'); expect(output?.properties.$process_person_profile).toBe(false);
  expect(JSON.stringify(output)).not.toMatch(/PRIVATE14|Private|private-|589882|couponCode|campaignName|sourceName|quoteHash|\?coupon/);
});
it('passes only stable plan codes or controlled coupon outcomes, never typed code or exact money', () => {
  const plan = sanitizeWorkspaceAnalytics(event('workspace_plan_selected', '/workspace/activate', { planCode: 'quarterly', outcome: 'typed-private-code' }));
  expect(plan?.properties).toMatchObject({ planCode: 'quarterly', feature: 'workspace', eventVersion: '3' }); expect(plan?.properties).not.toHaveProperty('outcome');
  expect(sanitizeWorkspaceAnalytics(event('workspace_plan_selected', '/workspace/activate', { planCode: 'PRIVATE14' }))).toBeNull();
  const coupon = sanitizeWorkspaceAnalytics(event('workspace_coupon_applied', '/workspace/activate', { outcome: 'invalid_code', discountType: 'private-discount', hasCoupon: 'PRIVATE14' }));
  expect(coupon?.properties).toMatchObject({ outcome: 'invalid_code', hasCoupon: true }); expect(coupon?.properties).not.toHaveProperty('discountType');
  expect(JSON.stringify(coupon)).not.toMatch(/PRIVATE14|Private|private-|589882/);
  expect(sanitizeWorkspaceAnalytics(event('workspace_coupon_applied', '/workspace/activate', { outcome: 'PRIVATE14' }))).toBeNull();
  for (const path of ['/workspace/activate', '/workspace', '/other']) expect(sanitizeWorkspaceAnalytics(event('workspace_coupon_private_string', path))).toBeNull();
});
it('client telemetry emits controlled enums and remains independent of blocked analytics', () => {
  trackPlanSelected('yearly'); expect(mocks.track).toHaveBeenCalledWith('workspace_plan_selected', { feature: 'workspace', eventVersion: '3', planCode: 'yearly' });
  trackCouponApplied('invalid-code-PRIVATE14', 'Private influencer'); expect(mocks.track).toHaveBeenLastCalledWith('workspace_coupon_applied', { feature: 'workspace', eventVersion: '3', outcome: 'unavailable', hasCoupon: true });
  mocks.track.mockImplementation(() => { throw new Error('blocked'); }); expect(() => trackPlanSelected('quarterly')).not.toThrow();
});
