import { describe, expect, it } from 'vitest';
import { CATEGORIES, DEFAULT_SETTINGS, DECLARATIONS, EXPERIENCE_OPTIONS, evaluateEligibility, validateSubmission, validateSettings, normalizeProfileUrl, resolveJourney, type Submission } from '@/lib/workspace/eligibility/model';
import { input, now } from './workspace-eligibility-fixtures';
function valid(value = input) { const result = validateSubmission(value); if (!result.success) throw new Error(JSON.stringify(result.errors)); return result.data; }
describe('eligibility validation and pure decisions', () => {
  it('uses normalized minimums and the exact 23/24 month boundary', () => {
    for (const [code, , months] of EXPERIENCE_OPTIONS) expect(valid({ ...input, experienceOption: code }).experienceMonths).toBe(months);
    expect(evaluateEligibility({ ...valid(), experienceMonths: 23 }, DEFAULT_SETTINGS, now).result).toBe('ineligible');
    expect(evaluateEligibility(valid(), DEFAULT_SETTINGS, now).result).toBe('eligible');
  });
  it.each(['eligible', 'experienceMonths', 'userId', 'result'])('rejects forged %s and cannot decide invalid input', field => {
    expect(validateSubmission({ ...input, [field]: true }).success).toBe(false);
  });
  it.each(Object.keys(DECLARATIONS))('requires explicit %s declaration without recording an ineligible decision', name => {
    for (const value of [false, 'true', undefined]) expect(validateSubmission({ ...input, declarations: { ...input.declarations, [name]: value } }).success).toBe(false);
  });
  it('rejects unknown declaration keys including prototype names', () => {
    expect(validateSubmission({ ...input, declarations: { ...input.declarations, constructor: true } }).success).toBe(false);
  });
  it('accepts all approved categories; Other needs a short profession', () => {
    expect(CATEGORIES).toHaveLength(15);
    for (const [category] of CATEGORIES) {
      const data = valid({ ...input, category, aviationProfession: category === 'other_aviation' ? 'Aviation researcher' : '' });
      expect(evaluateEligibility(data, DEFAULT_SETTINGS, now).result).toBe('eligible');
    }
    expect(validateSubmission({ ...input, category: 'other_aviation' }).success).toBe(false);
    expect(validateSubmission({ ...input, category: 'non_aviation' }).success).toBe(false);
    expect(validateSubmission({ ...input, teachingCategory: 'non_aviation' }).success).toBe(false);
  });
  it('professional status is descriptive; disabled categories are valid but ineligible', () => {
    const settings = { ...DEFAULT_SETTINGS, allowedCategories: ['cabin_crew'] as Submission['category'][] };
    expect(evaluateEligibility(valid(), DEFAULT_SETTINGS, now).result).toBe('eligible');
    expect(evaluateEligibility(valid(), settings, now).reasons).toEqual(['category_not_onboarding', 'teaching_category_not_onboarding']);
  });
  it('bounds free text and rejects controls rather than rendering unsafe markup', () => {
    expect(validateSubmission({ ...input, courseIdea: 'x'.repeat(201) }).success).toBe(false);
    expect(validateSubmission({ ...input, courseIdea: '' }).success).toBe(false);
    expect(validateSubmission({ ...input, courseIdea: 'a\nprivate' }).success).toBe(false);
    expect(validateSubmission({ ...input, courseIdea: '<script>sample</script>' }).success).toBe(true); // React renders text, never HTML.
  });
  it.each(['http://www.linkedin.com/in/x', 'javascript:alert(1)', 'https://user:password@example.com/', 'https://localhost/', 'https://foo.internal/', 'https://127.0.0.1/', 'https://2130706433/', 'https://0x7f000001/', 'https://[::1]/', 'https://10.0.0.1/', 'https://example.com:8080/', 'https://example.com/with space'])('rejects unsafe profile %s', url => {
    expect(normalizeProfileUrl(url)).toBeNull(); expect(validateSubmission({ ...input, professionalProfileUrl: url }).success).toBe(false);
  });
  it('normalizes public HTTPS links without any fetching', () => {
    expect(normalizeProfileUrl('https://EXAMPLE.com.:443/profile#bio')).toBe('https://example.com/profile');
    expect(normalizeProfileUrl('https://example.com/' + 'x'.repeat(2048))).toBeNull();
  });
  it('validates bounded settings and leaves age/status outside the configurable rule set', () => {
    expect(validateSettings(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
    for (const config of [{ ...DEFAULT_SETTINGS, minimumExperienceMonths: 0 }, { ...DEFAULT_SETTINGS, cooldownDays: 91 }, { ...DEFAULT_SETTINGS, eligibilityValidityDays: 1.5 }, { ...DEFAULT_SETTINGS, allowedCategories: [] }, { ...DEFAULT_SETTINGS, allowedCategories: ['cabin_crew', 'cabin_crew'] }, { ...DEFAULT_SETTINGS, profileRequired: 'yes' }, { ...DEFAULT_SETTINGS, timezone: 'UTC' }, { ...DEFAULT_SETTINGS, launchAt: 'invalid' }, { ...DEFAULT_SETTINGS, requireAdult: false }]) expect(validateSettings(config)).toBeNull();
  });
  it('stores exact elapsed deadlines; changing settings cannot change prior results', () => {
    const eligible = { id: 'a', ...evaluateEligibility(valid(), DEFAULT_SETTINGS, now) };
    const failed = { id: 'b', ...evaluateEligibility({ ...valid(), experienceMonths: 12 }, DEFAULT_SETTINGS, now) };
    expect(eligible.eligibleUntil!.getTime() - now.getTime()).toBe(30 * 86400000);
    expect(failed.reapplyAt!.getTime() - now.getTime()).toBe(7 * 86400000);
    expect(resolveJourney(true, eligible, new Date(eligible.eligibleUntil!.getTime() - 1)).state).toBe('eligibility_active');
    expect(resolveJourney(true, eligible, eligible.eligibleUntil!).state).toBe('eligibility_expired');
    expect(resolveJourney(true, failed, new Date(failed.reapplyAt!.getTime() - 1)).state).toBe('ineligible_cooldown');
    expect(resolveJourney(true, failed, failed.reapplyAt!).state).toBe('eligibility_available');
    evaluateEligibility(valid(), { ...DEFAULT_SETTINGS, eligibilityValidityDays: 1 }, now);
    expect(eligible.eligibleUntil!.getTime() - now.getTime()).toBe(30 * 86400000);
    expect(resolveJourney(false, eligible, now).state).toBe('authentication_required');
    expect(resolveJourney(true, null, now).state).toBe('eligibility_required');
    expect(resolveJourney(true, eligible, now)).toMatchObject({ hasCreatorAccess: false, hasPaidEntitlement: false, destination: '/workspace/activate' });
    expect(DEFAULT_SETTINGS.launchAt).toBe('2026-11-08T18:30:00.000Z');
  });
});
