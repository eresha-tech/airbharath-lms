import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
vi.mock('next/navigation',()=>({useRouter:()=>({replace:vi.fn(),refresh:vi.fn()})}));
vi.mock('next/script',()=>({default:()=>null}));
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.PropsWithChildren<{ href: string }>) => React.createElement('a', props, children) }));
vi.mock('@/lib/workspace/membership/analytics', () => ({ trackPlanSelected: vi.fn(), trackCouponApplied: vi.fn() }));
import { WorkspaceLanding } from '@/components/workspace/WorkspaceLanding';
import { ActivationPreview } from '@/components/workspace/ActivationPreview';
import { WorkspaceCoupons } from '@/components/workspace/WorkspaceCoupons';
import { calculatePrice, membershipStartInfo } from '@/lib/workspace/membership/model';
import { plans, now } from './workspace-membership-fixtures';
it('renders all approved plans, exclusive GST and advisory unreserved quote with disabled payment', () => {
  const initialQuote = { quoteVersion: 'workspace-pricing-v1', planCode: plans[0].code, planVersionId: plans[0].id, planVersion: 1, planName: plans[0].displayName, durationMonths: 3, currency: 'INR' as const, ...calculatePrice(499900, 1800), couponApplied: false, couponCode: null, generatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 600000).toISOString(), membershipStart: membershipStartInfo('2026-11-08T18:30:00.000Z', now), advisory: true as const, reserved: false as const, quoteHash: 'opaque' };
  const html = renderToStaticMarkup(React.createElement(ActivationPreview, { plans, initialQuote }));
  expect(html.match(/type="radio"/g)).toHaveLength(3); expect(html).toContain('₹5,898.82'); expect(html).toContain('₹10,618.82'); expect(html).toContain('₹20,058.82');
  expect(html).toContain('GST @ 18%'); expect(html).toContain('Taxable amount'); expect(html).toContain('does not reserve'); expect(html).toContain('successful payment date');
  const enabled = renderToStaticMarkup(React.createElement(ActivationPreview,{plans,initialQuote,checkoutKeyId:'rzp_test_SYNTHETIC',userId:'synthetic-owner'}));
  expect(enabled).toContain('Razorpay Test Mode');expect(enabled).toContain('Pay ₹5,898.82');expect(enabled).not.toContain('Payments not yet enabled');
  expect(html).toMatch(/<button disabled=""[^>]*>.*Payments not yet enabled/); expect(html).toContain('Workspace payments are awaiting launch verification.'); expect(html).toContain('ph-no-capture'); expect(html).not.toMatch(/razorpay|checkout\.js|name="totalPaise"/i);
});
it('marks unavailable plans disabled and renders an empty admin definition state without fake counters', () => {
  const html = renderToStaticMarkup(React.createElement(ActivationPreview, { plans: plans.map(plan => ({ ...plan, available: false })), initialQuote: null }));
  expect(html.match(/disabled=""/g)!.length).toBeGreaterThanOrEqual(4);
  const admin = renderToStaticMarkup(React.createElement(WorkspaceCoupons, { initialInfluencers: [], initial: { coupons: [], hasNext: false, page: 1 } }));
  expect(admin).toContain('IST'); expect(admin).toContain('Create active coupon'); expect(admin).toContain('all three'); expect(admin).not.toMatch(/usedCount|Razorpay|already paid/);
});

it('keeps the authenticated activation page out of search indexes', () => {
  for (const path of ['app/(user)/workspace/activate/page.tsx', 'app/(admin)/admin/workspace/coupons/page.tsx']) expect(readFileSync(path, 'utf8')).toContain('robots: { index: false, follow: false }');
});

it('advertises F.1 inclusive totals from supplied successor rows with an exact server breakdown', () => {
  const current = plans.map((plan, i) => ({ ...plan, basePricePaise: [499915, 847373, 1499915][i], version: i === 0 ? 5 : 2 }));
  const initialQuote = { quoteVersion: 'workspace-pricing-v1', planCode: current[0].code, planVersionId: current[0].id, planVersion: current[0].version, planName: current[0].displayName, durationMonths: 3, currency: 'INR' as const, ...calculatePrice(current[0].basePricePaise, 1800), couponApplied: false, couponCode: null, generatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 600000).toISOString(), membershipStart: membershipStartInfo('2026-11-08T18:30:00.000Z', now), advisory: true as const, reserved: false as const, quoteHash: 'opaque' };
  const html = renderToStaticMarkup(React.createElement(ActivationPreview, { plans: current, initialQuote }));
  for (const total of ['₹5,899.00', '₹9,999.00', '₹17,699.00']) expect(html).toContain(`font-semibold tabular-nums">${total}`);
  expect(html.match(/Inclusive of 18% GST/g)).toHaveLength(3);
  expect(html).toContain('₹4,999.15'); expect(html).toContain('₹899.85');
  for (const old of ['₹5,898.82', '₹10,618.82', '₹20,058.82']) expect(html).not.toContain(old);
  expect(html).toContain('Payments not yet enabled'); expect(html.match(/type="checkbox"/g)).toHaveLength(2);
});

it('describes release targets without announcing open payments or current uploads and publication', () => {
  for (const file of ['components/workspace/WorkspaceLanding.tsx', 'app/(user)/workspace/activate/page.tsx']) {
    const source = readFileSync(file, 'utf8');
    expect(source).toContain('14 October 2026, subject to launch verification');
    expect(source).toMatch(/FULL_WORKSPACE_LAUNCH|WorkspaceLaunchNotice/);
    expect(source).toContain('publication and course sales');
  }
  const landing = renderToStaticMarkup(React.createElement(WorkspaceLanding));
  expect(landing).toContain('Full AirBharath Workspace is targeted for 9 November 2026, subject to release readiness.');
  expect(landing).toContain('Workspace payments are awaiting launch verification');
  const member = readFileSync('app/(workspace)/workspace/(membership)/member/page.tsx', 'utf8');
  expect(member).toContain("['Original payment amount', formatPaise(row.order.totalPaise)]");
  expect(member).not.toContain('getCurrentPlans');
});
