import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.PropsWithChildren<{ href: string }>) => React.createElement('a', props, children) }));
vi.mock('@/lib/workspace/membership/analytics', () => ({ trackPlanSelected: vi.fn(), trackCouponApplied: vi.fn() }));
import { ActivationPreview } from '@/components/workspace/ActivationPreview';
import { WorkspaceCoupons } from '@/components/workspace/WorkspaceCoupons';
import { calculatePrice, membershipStartInfo } from '@/lib/workspace/membership/model';
import { plans, now } from './workspace-membership-fixtures';
it('renders all approved plans, exclusive GST and advisory unreserved quote with disabled payment', () => {
  const initialQuote = { quoteVersion: 'workspace-pricing-v1', planCode: plans[0].code, planVersionId: plans[0].id, planVersion: 1, planName: plans[0].displayName, durationMonths: 3, currency: 'INR' as const, ...calculatePrice(499900, 1800), couponApplied: false, couponCode: null, generatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 600000).toISOString(), membershipStart: membershipStartInfo('2026-11-08T18:30:00.000Z', now), advisory: true as const, reserved: false as const, quoteHash: 'opaque' };
  const html = renderToStaticMarkup(React.createElement(ActivationPreview, { plans, initialQuote }));
  expect(html.match(/type="radio"/g)).toHaveLength(3); expect(html).toContain('₹5,898.82'); expect(html).toContain('₹10,618.82'); expect(html).toContain('₹20,058.82');
  expect(html).toContain('GST @ 18%'); expect(html).toContain('Taxable amount'); expect(html).toContain('does not reserve'); expect(html).toContain('successful payment date');
  expect(html).toMatch(/<button disabled=""[^>]*>.*Payment activation coming next/); expect(html).toContain('ph-no-capture'); expect(html).not.toMatch(/razorpay|checkout\.js|name="totalPaise"/i);
});
it('marks unavailable plans disabled and renders an empty admin definition state without fake counters', () => {
  const html = renderToStaticMarkup(React.createElement(ActivationPreview, { plans: plans.map(plan => ({ ...plan, available: false })), initialQuote: null }));
  expect(html.match(/disabled=""/g)!.length).toBeGreaterThanOrEqual(4);
  const admin = renderToStaticMarkup(React.createElement(WorkspaceCoupons, { initial: { coupons: [], hasNext: false, page: 1 } }));
  expect(admin).toContain('IST'); expect(admin).toContain('Create active coupon'); expect(admin).toContain('all three'); expect(admin).not.toMatch(/usedCount|Razorpay|already paid/);
});
