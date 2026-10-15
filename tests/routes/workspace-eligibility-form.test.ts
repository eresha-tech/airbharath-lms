import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
vi.mock('@/app/(user)/workspace/apply/actions', () => ({ continueAfterEligibility: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.PropsWithChildren<{ href: string; className?: string }>) => React.createElement('a', props, children) }));
vi.mock('@/lib/workspace/eligibility/analytics', () => ({ trackEligibilityStarted: vi.fn() }));
import { EligibilityForm } from '@/components/workspace/EligibilityForm';
import { DECLARATIONS, DEFAULT_SETTINGS } from '@/lib/workspace/eligibility/model';
import { settingsId, policyId } from './workspace-eligibility-fixtures';
it('renders seven explicit required declarations and a required professional profile', () => {
  const html = renderToStaticMarkup(React.createElement(EligibilityForm, { settingsId, policyId, config: DEFAULT_SETTINGS, declarations: DECLARATIONS }));
  expect(html.match(/type="checkbox" required=""/g)).toHaveLength(7);
  const profile = html.match(/<input[^>]*name="professionalProfileUrl"[^>]*>/)?.[0];
  expect(profile).toContain('required=""'); expect(profile).toContain('type="url"');
  expect(html).not.toMatch(/name="experienceMonths"|name="eligible"|name="userId"|name="marketingConsent"/);
  expect(html).toContain('value="two_years"'); expect(html).toContain('Marketing consent is not required');
});
it('reflects a published optional-profile rule without changing required declarations', () => {
  const html = renderToStaticMarkup(React.createElement(EligibilityForm, { settingsId, policyId, config: { ...DEFAULT_SETTINGS, profileRequired: false }, declarations: DECLARATIONS }));
  expect(html).toContain('Professional profile URL (optional)'); expect(html.match(/<input[^>]*name="professionalProfileUrl"[^>]*>/)?.[0]).not.toContain('required=""');
  expect(html.match(/type="checkbox" required=""/g)).toHaveLength(7);
});
