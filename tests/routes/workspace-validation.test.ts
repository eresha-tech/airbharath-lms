import { describe, expect, it, vi } from 'vitest';
import { applicant, reviewPayload } from './workspace-fixtures';
import { emptyApplication, isHttpUrl, validateApplication, validateReview, validateStep } from '@/lib/workspace/validation';
import { applicationPayloadHash, createApplicationReference } from '@/lib/workspace/reference';
import { CONSENT_VERSION } from '@/lib/workspace/options';
import { workspaceApplications } from '@/lib/db/schema';
import { getTableConfig } from 'drizzle-orm/pg-core';

const analytics = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/lib/analytics', () => ({ track: analytics.track }));
import { trackWorkspace } from '@/lib/workspace/analytics';

describe('Workspace validation and helpers', () => {
  it('trims strings while preserving course wording and newlines', () => {
    const result = validateApplication({ ...applicant, fullName: '  Test  ', courseDescription: '  Line one.\nLine two <script>.  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullName).toBe('Test');
      expect(result.data.courseDescription).toBe('Line one.\nLine two <script>.');
    }
  });
  it.each([
    ['email', 'bad'], ['mobile', '123'], ['professionalProfileUrl', 'javascript:alert(1)'],
    ['sampleContentUrl', 'ftp://example.test'], ['aviationBackground', 'Unknown'], ['yearsExperience', '999 years'],
    ['courseReadiness', 'unknown'], ['teachingExperienceType', 'unknown'], ['audienceStatus', 'unknown'],
    ['audienceChannels', ['Invalid']], ['audienceChannels', ['LinkedIn', 'LinkedIn']], ['audienceSize', 'millions'],
    ['consentAccuracy', false], ['consentContact', 'true'], ['submissionKey', 'guessable'], ['fullName', 'x'.repeat(121)],
  ])('rejects invalid %s', (key, value) => { expect(validateApplication({ ...applicant, [key]: value }).success).toBe(false); });
  it('requires channels and size for an existing audience', () => {
    const result = validateApplication({ ...applicant, audienceStatus: 'Yes' });
    expect(result.success).toBe(false);
    if (!result.success) { expect(result.errors.audienceChannels).toBeDefined(); expect(result.errors.audienceSize).toBeDefined(); }
  });
  it('clears answers that no longer apply to conditional questions', () => {
    const result = validateApplication({ ...applicant, audienceChannels: ['LinkedIn'], audienceSize: 'Under 500', teachingExperienceDescription: 'Previously entered' });
    expect(result.success).toBe(true);
    if (result.success) { expect(result.data.audienceChannels).toEqual([]); expect(result.data.audienceSize).toBe(''); expect(result.data.teachingExperienceDescription).toBe(''); }
  });
  it('validates each step without requiring future answers', () => {
    const data = { ...emptyApplication(), ...applicant };
    expect(validateStep({ ...data, joiningReason: '' }, 0)).toEqual({});
    expect(validateStep({ ...data, email: 'bad' }, 0).email).toBeDefined();
    expect(validateStep({ ...data, learnerOutcome: '' }, 1).learnerOutcome).toBeDefined();
  });
  it('rejects admin mass assignment and unsupported activation', () => {
    expect(validateReview({ ...reviewPayload, fullName: 'changed' }).success).toBe(false);
    expect(validateReview({ ...reviewPayload, applicationStatus: 'activated' }).success).toBe(false);
    expect(validateReview({ ...reviewPayload, reviewAssessments: { aviationCredibilityAssessment: 'automatic pass' } }).success).toBe(false);
    expect(validateReview({ ...reviewPayload, decisionReason: 'random' }).success).toBe(false);
    expect(validateReview({ ...reviewPayload, expectedUpdatedAt: 'invalid' }).success).toBe(false);
  });
  it('accepts a controlled qualitative review', () => { expect(validateReview(reviewPayload).success).toBe(true); });
  it('generates friendly unique references backed by independent UUID keys', () => {
    const values = Array.from({ length: 1000 }, createApplicationReference);
    expect(new Set(values).size).toBe(1000);
    expect(values.every(v => /^WS-[A-F0-9]{20}$/.test(v))).toBe(true);
    const config = getTableConfig(workspaceApplications);
    expect(config.columns.find(c => c.name === 'id')?.primary).toBe(true);
    expect(config.columns.find(c => c.name === 'application_reference')?.isUnique).toBe(true);
    expect(config.columns.find(c => c.name === 'submission_key')?.isUnique).toBe(true);
    expect(CONSENT_VERSION).toBeTruthy();
  });
  it('hashes normalized payloads for matching retry recovery', () => {
    const result = validateApplication(applicant);
    if (!result.success) throw new Error('Fixture invalid');
    expect(applicationPayloadHash(result.data)).toBe(applicationPayloadHash({ ...result.data }));
    expect(applicationPayloadHash({ ...result.data, fullName: 'Someone else' })).not.toBe(applicationPayloadHash(result.data));
  });
  it('does not permit credential-bearing or executable profile links', () => {
    expect(isHttpUrl('https://user:password@example.test')).toBe(false);
    expect(isHttpUrl('data:text/html,hello')).toBe(false);
    expect(isHttpUrl('https://example.test/profile')).toBe(true);
  });
  it('allows only enum analytics properties and never applicant text or contact details', () => {
    trackWorkspace('workspace_application_submitted', applicant, 4);
    expect(analytics.track).toHaveBeenCalledWith('workspace_application_submitted', { feature: 'workspace', eventVersion: '1', aviationBackground: applicant.aviationBackground, courseReadiness: applicant.courseReadiness, audienceStatus: 'No', stepNumber: 4 });
    trackWorkspace('workspace_apply_clicked', { aviationBackground: 'private text', audienceStatus: 'email@example.test' });
    expect(analytics.track).toHaveBeenLastCalledWith('workspace_apply_clicked', { feature: 'workspace', eventVersion: '1' });
  });
});
