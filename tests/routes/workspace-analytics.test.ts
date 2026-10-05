import { describe, expect, it, vi } from 'vitest';
import type { CaptureResult } from 'posthog-js';
const mocks = vi.hoisted(() => ({ track: vi.fn(), serverTrack: vi.fn() }));
vi.mock('@/lib/analytics', () => ({ track: mocks.track }));
vi.mock('@/lib/analytics-server', () => ({ serverTrack: mocks.serverTrack }));
import { trackWorkspace } from '@/lib/workspace/analytics';
import { trackWorkspaceServer } from '@/lib/workspace/analytics-server';
import { sanitizeWorkspaceAnalytics } from '@/lib/workspace/analytics-privacy';
const event = (name: string, properties: Record<string, unknown>): CaptureResult => ({ uuid: 'test-event-uuid', event: name, properties, timestamp: new Date() });

describe('Workspace analytics privacy and outcomes', () => {
  it('records only allowed client categories, never error text or campaign strings', () => {
    trackWorkspace('workspace_submission_failed', { email: 'private@example.test', courseDescription: 'Private proposal' }, 4, { failureCategory: 'private error', entryPoint: 'private campaign' });
    expect(mocks.track).toHaveBeenCalledWith('workspace_submission_failed', { feature: 'workspace', eventVersion: '1', stepNumber: 4 });
    trackWorkspace('workspace_submission_failed', undefined, undefined, { failureCategory: 'unavailable' });
    expect(mocks.track).toHaveBeenLastCalledWith('workspace_submission_failed', { feature: 'workspace', eventVersion: '1', failureCategory: 'unavailable' });
  });
  it('removes persisted identity, free text, URL parameters and admin application IDs', () => {
    const result = sanitizeWorkspaceAnalytics(event('$pageview', { $current_url: 'https://local.test/admin/workspace-applications/private-id?email=private@example.test', pathname: '/admin/workspace-applications/private-id', $set: { email: 'private@example.test' }, $initial_current_url: 'https://local.test/?phone=private', $referrer: 'https://private.test/', utm_campaign: 'Private campaign', personalNote: 'Private note', distinct_id: 'opaque-browser-id' }));
    expect(result?.properties).toEqual({ $current_url: 'https://local.test/admin/workspace-applications/[id]', pathname: '/admin/workspace-applications/[id]', distinct_id: 'opaque-browser-id' });
  });
  it.each(['$identify', '$autocapture', '$exception'])('suppresses %s payloads on Workspace pages', name => {
    expect(sanitizeWorkspaceAnalytics(event(name, { $current_url: 'https://local.test/workspace', email: 'private@example.test' }))).toBeNull();
  });
  it('preserves explicit Workspace funnel events and unrelated LMS behavior', () => {
    expect(sanitizeWorkspaceAnalytics(event('workspace_application_started', { feature: 'workspace', $current_url: 'https://local.test/workspace?email=private' }))?.properties.$current_url).toBe('https://local.test/workspace');
    const unrelated = event('$identify', { $current_url: 'https://local.test/dashboard', $set: { role: 'student' } });
    expect(sanitizeWorkspaceAnalytics(unrelated)).toBe(unrelated);
  });
  it('drops top-level person-property updates as well as nested properties', () => {
    const input = { ...event('workspace_application_started', { feature: 'workspace' }), $set: { email: 'private@example.test' }, $set_once: { name: 'Private' } };
    const output = sanitizeWorkspaceAnalytics(input);
    expect(output).not.toHaveProperty('$set'); expect(output).not.toHaveProperty('$set_once');
  });
  it('records allowlisted authoritative server outcomes with a pseudonymous ID', async () => {
    await trackWorkspaceServer('workspace_approval_email_result', 'private-application-id', { outcome: 'sent', action: 'send', errorCategory: 'raw provider error' });
    expect(mocks.serverTrack).toHaveBeenCalledWith(expect.stringMatching(/^workspace:[a-f0-9]{64}$/), 'workspace_approval_email_result', { feature: 'workspace', eventVersion: '1', action: 'send', outcome: 'sent' });
    expect(JSON.stringify(mocks.serverTrack.mock.calls)).not.toContain('private-application-id');
  });
  it('keeps persistence and email flows independent of analytics failure', async () => {
    mocks.serverTrack.mockRejectedValue(new Error('blocked analytics'));
    await expect(trackWorkspaceServer('workspace_application_saved', 'opaque', { applicationStatus: 'submitted' })).resolves.toBeUndefined();
  });
});
