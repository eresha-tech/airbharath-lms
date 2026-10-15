import { expect, it, vi } from 'vitest';
import type { CaptureResult } from 'posthog-js';
const mocks = vi.hoisted(() => ({ track: vi.fn(), serverTrack: vi.fn() }));
vi.mock('@/lib/analytics', () => ({ track: mocks.track }));
vi.mock('@/lib/analytics-server', () => ({ serverTrack: mocks.serverTrack }));
import { sanitizeWorkspaceAnalytics } from '@/lib/workspace/analytics-privacy';
import { trackEligibilityStarted } from '@/lib/workspace/eligibility/analytics';
import { trackEligibilityDecision } from '@/lib/workspace/eligibility/analytics-server';
function event(name: string, path: string): CaptureResult { return { uuid: 'event', timestamp: new Date(), event: name, properties: { $current_url: `https://example.com${path}?phone=private`, pathname: path, distinct_id: 'account-user-id', $device_id: 'anonymous-device', $set: { email: 'private' }, $set_once: { name: 'private' }, $referrer: 'https://private.test', professionalProfileUrl: 'https://linkedin.com/in/private', courseIdea: 'private', professionalStatus: 'retired', experienceMonths: 24, declarations: { adult: true }, attemptId: 'private-uuid' } }; }
it.each(['/workspace/apply', '/workspace/eligibility-result', '/admin/workspace/eligibility/private-id', '/admin/workspace/settings'])('protects nested path %s and inherited account identity', path => {
  const output = sanitizeWorkspaceAnalytics(event('$pageview', path));
  expect(output?.properties.distinct_id).toBe('workspace-device:anonymous-device');
  expect(output?.properties.$process_person_profile).toBe(false);
  expect(output?.properties.$is_identified).toBe(false);
  expect(JSON.stringify(output)).not.toMatch(/private|account-user-id|linkedin|courseIdea|professionalStatus|experienceMonths|declarations|attemptId/);
  for (const name of ['$identify', '$autocapture', '$exception']) expect(sanitizeWorkspaceAnalytics(event(name, path))).toBeNull();
});
it('fails closed without an anonymous device ID and suppresses Workspace login identity', () => {
  const input = event('workspace_eligibility_started', '/workspace/apply'); delete input.properties.$device_id;
  expect(sanitizeWorkspaceAnalytics(input)).toBeNull();
  for (const alias of ['callbackUrl', 'returnTo', 'redirect']) expect(sanitizeWorkspaceAnalytics({ ...input, properties: { $current_url: `https://example.com/login?${alias}=%2Fworkspace%2Fapply` } })).toBeNull();
});
it('client start carries no answers; server decisions carry only safe versions and an opaque ID', async () => {
  trackEligibilityStarted(); expect(mocks.track).toHaveBeenCalledWith('workspace_eligibility_started', { feature: 'workspace', eventVersion: '2' });
  await trackEligibilityDecision('private-attempt-id', 'eligible');
  expect(mocks.serverTrack).toHaveBeenCalledWith(expect.stringMatching(/^workspace-eligibility:[a-f0-9]{64}$/), 'workspace_eligibility_passed', { feature: 'workspace', eventVersion: '2', evaluatorVersion: 'workspace-eligibility-v1', policyVersion: 'workspace-eligibility-declarations-v1', $process_person_profile: false });
  expect(JSON.stringify(mocks.serverTrack.mock.calls)).not.toContain('private-attempt-id');
  mocks.serverTrack.mockRejectedValueOnce(new Error('blocked'));
  await expect(trackEligibilityDecision('opaque', 'ineligible')).resolves.toBeUndefined();
});

it('uses canonical pathname when URL is absent/malformed and rejects unknown eligibility event names', () => {
  const input = event('$pageview', '/workspace/apply'); input.properties.$current_url = 'malformed private URL';
  const output = sanitizeWorkspaceAnalytics(input); expect(output?.properties.pathname).toBe('/workspace/apply'); expect(output?.properties).not.toHaveProperty('$current_url'); expect(JSON.stringify(output)).not.toContain('private');
  expect(sanitizeWorkspaceAnalytics(event('workspace_eligibility_private_free_text', '/workspace/apply'))).toBeNull();
});
