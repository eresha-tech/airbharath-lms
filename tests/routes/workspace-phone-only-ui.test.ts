import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/script', () => ({ default: () => null }));
vi.mock('@/lib/workspace/membership/analytics', () => ({ trackPlanSelected: vi.fn(), trackCouponApplied: vi.fn() }));
import { ActivationPreview } from '@/components/workspace/ActivationPreview';
import { plans } from './workspace-membership-fixtures';
it('collects contact without a separate email ownership challenge and preserves public payment disablement', () => {
  const html = renderToStaticMarkup(React.createElement(ActivationPreview, { plans, initialQuote: null, initialContactEmail: 'synthetic@example.invalid' }));
  expect(html).toContain('Contact email'); expect(html).toContain('Step 2 — Choose your prepaid term'); expect(html).toContain('Step 4 — Agree and continue');
  expect(html).not.toMatch(/Step 2 — Verify|Send verification|Resend|workspace-email-code|workspace-email-challenge/);
  expect(html).toContain('Payments not yet enabled'); expect(html).toContain('Billing &amp; Support'); expect(html).toContain('Creator Terms'); expect(html).toContain('Refund Policy');
});
it('uses an additive syntax-only prerequisite while retaining the trigger and original proof history', () => {
  const sql = readFileSync('drizzle/0031_workspace_phone_only_onboarding.sql', 'utf8');
  expect(sql).toContain('CREATE OR REPLACE FUNCTION workspace_email_order_required()'); expect(sql).toContain('FOR UPDATE'); expect(sql).toContain('23514');
  expect(sql).not.toMatch(/DROP|DISABLE|DELETE|TRUNCATE|workspace_verified_emails|INSERT INTO/i);
  const old = readFileSync('drizzle/0027_workspace_verified_creator_email.sql', 'utf8'); expect(old).toContain('Current verified Workspace email required'); expect(old).toContain('workspace_email_notice_bind');
});
