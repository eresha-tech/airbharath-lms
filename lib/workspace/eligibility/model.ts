export const EVALUATOR_VERSION = 'workspace-eligibility-v1';
export const ELIGIBILITY_POLICY_VERSION = 'workspace-eligibility-declarations-v1';
export const BUSINESS_TIMEZONE = 'Asia/Kolkata';
export const CATEGORIES = [
  ['pilot_flight_crew', 'Pilot / Flight Crew'], ['cabin_crew', 'Cabin Crew'],
  ['aircraft_maintenance', 'Aircraft Maintenance / Engineering'], ['ground_operations', 'Ground Operations'],
  ['airport_operations', 'Airport Operations'], ['aviation_safety', 'Aviation Safety / Quality'],
  ['aviation_security', 'Aviation Security'], ['flight_operations', 'Flight Operations'],
  ['aviation_management', 'Aviation Management'], ['aviation_hospitality', 'Aviation Hospitality / Customer Experience'],
  ['aviation_trainer', 'Aviation Trainer / Instructor'], ['aviation_career', 'Aviation Recruitment / Career'],
  ['drone_uav', 'Drone / UAV'], ['defence_aviation', 'Defence Aviation'],
  ['other_aviation', 'Other Aviation Professional'],
] as const;
export type Category = typeof CATEGORIES[number][0];
export const EXPERIENCE_OPTIONS = [
  ['under_one', 'Less than 1 year', 0], ['one_year', '1 year', 12], ['two_years', '2 years', 24],
  ['three_to_five', '3–5 years', 36], ['six_to_ten', '6–10 years', 72],
  ['eleven_to_fifteen', '11–15 years', 132], ['sixteen_to_twenty', '16–20 years', 192], ['twenty_plus', '20+ years', 240],
] as const;
export const PROFESSIONAL_STATUSES = [
  ['working', 'Currently working in aviation'], ['previously_worked', 'Previously worked in aviation'],
  ['independent', 'Independent aviation trainer / consultant'], ['entrepreneur', 'Aviation entrepreneur / business owner'],
  ['retired', 'Retired aviation professional'], ['other', 'Other'],
] as const;
export const DECLARATIONS = {
  adult: 'I confirm that I am 18 years of age or older and legally able to enter into the AirBharath Workspace Creator agreement.',
  expertise: 'I confirm that I have genuine aviation experience or expertise relevant to the subject I intend to teach.',
  accuracy: 'I confirm that the information I have provided is accurate.',
  eligibilityOnly: 'I understand that Workspace eligibility does not mean my future courses are approved.',
  courseReview: 'I understand that courses may be separately reviewed before publication.',
  audience: 'I understand that creators are initially responsible for bringing and promoting to their own audience or network.',
  authorizedClaims: 'I will not represent a course as DGCA, airline, government or regulatory approved unless I have genuine authorization.',
} as const;
export type Declarations = Record<keyof typeof DECLARATIONS, boolean>;
export type EligibilityAnswers = {
  category: Category; aviationProfession: string;
  experienceOption: typeof EXPERIENCE_OPTIONS[number][0]; experienceMonths: number;
  professionalStatus: typeof PROFESSIONAL_STATUSES[number][0]; professionalStatusDetail: string;
  professionalProfileUrl: string; teachingCategory: Category; courseIdea: string; declarations: Declarations;
};
export type SettingsConfig = {
  minimumExperienceMonths: number; allowedCategories: Category[]; profileRequired: boolean;
  eligibilityValidityDays: number; cooldownDays: number; launchAt: string; timezone: typeof BUSINESS_TIMEZONE;
};
export const DEFAULT_SETTINGS: SettingsConfig = {
  minimumExperienceMonths: 24, allowedCategories: CATEGORIES.map(([code]) => code), profileRequired: true,
  eligibilityValidityDays: 30, cooldownDays: 7, launchAt: '2026-11-08T18:30:00.000Z', timezone: BUSINESS_TIMEZONE,
};
export const UUID = /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
export const REASONS = ['insufficient_experience', 'category_not_onboarding', 'teaching_category_not_onboarding'] as const;
export type DecisionReason = typeof REASONS[number];
export const REASON_LABELS: Record<DecisionReason, string> = {
  insufficient_experience: 'Minimum aviation experience requirement not met',
  category_not_onboarding: 'Professional category not currently open for automated onboarding',
  teaching_category_not_onboarding: 'Teaching category not currently open for automated onboarding',
};
export function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
export function normalizeProfileUrl(input: string): string | null {
  if (!input || input.length > 2048 || /[\s\u0000-\u001f\u007f]/.test(input)) return null;
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
    // Professional profiles must use public domain names. No IP literals, even public ones.
    if (!host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':') || host.startsWith('[') ||
      /(?:^|\.)(?:localhost|local|internal|lan|home|corp|test|invalid)$/.test(host)) return null;
    url.hostname = host; url.hash = '';
    return url.href;
  } catch { return null; }
}
export type Submission = EligibilityAnswers & { submissionKey: string; settingsId: string; policyId: string };
export function validateSubmission(input: unknown): { success: true; data: Submission } | { success: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!object(input)) return { success: false, errors: { form: 'Provide a valid eligibility form.' } };
  const allowed = ['submissionKey', 'settingsId', 'policyId', 'category', 'aviationProfession', 'experienceOption', 'professionalStatus', 'professionalStatusDetail', 'professionalProfileUrl', 'teachingCategory', 'courseIdea', 'declarations'];
  if (Object.keys(input).some(key => !allowed.includes(key))) errors.form = 'Unexpected fields. Please use the eligibility form.';
  for (const key of ['submissionKey', 'settingsId', 'policyId']) if (typeof input[key] !== 'string' || !UUID.test(input[key])) errors[key] = 'Reload the form and try again.';
  for (const key of ['category', 'teachingCategory']) if (!CATEGORIES.some(([code]) => code === input[key])) errors[key] = 'Choose an aviation category.';
  const experience = EXPERIENCE_OPTIONS.find(([code]) => code === input.experienceOption);
  if (!experience) errors.experienceOption = 'Choose your experience.';
  if (!PROFESSIONAL_STATUSES.some(([code]) => code === input.professionalStatus)) errors.professionalStatus = 'Choose your current professional status.';
  const text: Record<string, string> = {};
  for (const [key, max] of [['aviationProfession', 120], ['professionalStatusDetail', 120], ['professionalProfileUrl', 2048], ['courseIdea', 200]] as const) {
    const value = input[key];
    if (typeof value !== 'string' || value.trim().length > max || /[\u0000-\u001f\u007f]/.test(value)) errors[key] = `Use text of ${max} characters or fewer.`;
    text[key] = typeof value === 'string' ? value.trim() : '';
  }
  if (input.category === 'other_aviation' && !text.aviationProfession) errors.aviationProfession = 'Briefly specify your aviation profession.';
  if (input.category !== 'other_aviation') text.aviationProfession = '';
  if (input.professionalStatus !== 'other') text.professionalStatusDetail = '';
  if (!text.courseIdea) errors.courseIdea = 'Enter a short course title or idea.';
  if (text.professionalProfileUrl) {
    const normalized = normalizeProfileUrl(text.professionalProfileUrl);
    if (!normalized) errors.professionalProfileUrl = 'Enter a public professional-profile HTTPS URL without credentials.';
    else text.professionalProfileUrl = normalized;
  }
  if (!object(input.declarations) || Object.keys(input.declarations).some(key => !Object.hasOwn(DECLARATIONS, key))) errors.declarations = 'Accept the eligibility declarations.';
  const declarations = {} as Declarations;
  for (const key of Object.keys(DECLARATIONS) as (keyof Declarations)[]) {
    declarations[key] = object(input.declarations) && input.declarations[key] === true;
    if (!declarations[key]) errors[`declarations.${key}`] = 'This confirmation is required.';
  }
  if (Object.keys(errors).length) return { success: false, errors };
  return { success: true, data: { ...text, category: input.category as Category, teachingCategory: input.teachingCategory as Category,
    experienceOption: experience![0], experienceMonths: experience![2], professionalStatus: input.professionalStatus as EligibilityAnswers['professionalStatus'], declarations,
    submissionKey: input.submissionKey as string, settingsId: input.settingsId as string, policyId: input.policyId as string } as Submission };
}
export function validateSettings(input: unknown): SettingsConfig | null {
  if (!object(input) || Object.keys(input).some(key => !Object.keys(DEFAULT_SETTINGS).includes(key))) return null;
  for (const [key, max] of [['minimumExperienceMonths', 600], ['eligibilityValidityDays', 90], ['cooldownDays', 90]] as const) {
    if (!Number.isInteger(input[key]) || Number(input[key]) < 1 || Number(input[key]) > max) return null;
  }
  if (typeof input.profileRequired !== 'boolean' || input.timezone !== BUSINESS_TIMEZONE || typeof input.launchAt !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:00\.000Z$/.test(input.launchAt) || !Number.isFinite(Date.parse(input.launchAt)) || new Date(input.launchAt).toISOString() !== input.launchAt) return null;
  if (!Array.isArray(input.allowedCategories) || !input.allowedCategories.length || input.allowedCategories.length > CATEGORIES.length ||
    !input.allowedCategories.every(code => CATEGORIES.some(([known]) => code === known)) || new Set(input.allowedCategories).size !== input.allowedCategories.length) return null;
  return { minimumExperienceMonths: Number(input.minimumExperienceMonths), allowedCategories: CATEGORIES.map(([code]) => code).filter(code => (input.allowedCategories as unknown[]).includes(code)),
    profileRequired: input.profileRequired, eligibilityValidityDays: Number(input.eligibilityValidityDays), cooldownDays: Number(input.cooldownDays), launchAt: input.launchAt, timezone: BUSINESS_TIMEZONE };
}
export function evaluateEligibility(answers: EligibilityAnswers, settings: SettingsConfig, now: Date) {
  const reasons: DecisionReason[] = [];
  if (answers.experienceMonths < settings.minimumExperienceMonths) reasons.push('insufficient_experience');
  if (!settings.allowedCategories.includes(answers.category)) reasons.push('category_not_onboarding');
  if (!settings.allowedCategories.includes(answers.teachingCategory)) reasons.push('teaching_category_not_onboarding');
  const result = reasons.length ? 'ineligible' as const : 'eligible' as const;
  return { result, reasons, decidedAt: now,
    eligibleUntil: result === 'eligible' ? new Date(now.getTime() + settings.eligibilityValidityDays * 86_400_000) : null,
    reapplyAt: result === 'ineligible' ? new Date(now.getTime() + settings.cooldownDays * 86_400_000) : null };
}
export type JourneyAttempt = { id: string; result: 'eligible' | 'ineligible'; reasons: DecisionReason[]; decidedAt: Date; eligibleUntil: Date | null; reapplyAt: Date | null };
export function resolveJourney(userExists: boolean, attempt: JourneyAttempt | null, now: Date) {
  const state = !userExists ? 'authentication_required' : !attempt ? 'eligibility_required' :
    attempt.result === 'eligible' ? (attempt.eligibleUntil && now < attempt.eligibleUntil ? 'eligibility_active' : 'eligibility_expired') :
    attempt.reapplyAt && now < attempt.reapplyAt ? 'ineligible_cooldown' : 'eligibility_available';
  const destination = state === 'authentication_required' ? '/login?callbackUrl=%2Fworkspace%2Fapply' :
    ['eligibility_active', 'ineligible_cooldown'].includes(state) ? '/workspace/eligibility-result' : '/workspace/apply';
  return { state, destination, serverNow: now.toISOString(), hasCreatorAccess: false as const, hasPaidEntitlement: false as const };
}
export function formatWorkspaceDate(value: Date | string) { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeStyle: 'short', timeZone: BUSINESS_TIMEZONE }).format(new Date(value)); }
