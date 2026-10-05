import {
  AVIATION_BACKGROUNDS, EXPERIENCE_RANGES, COURSE_READINESS, TEACHING_EXPERIENCE,
  AUDIENCE_STATUS, AUDIENCE_CHANNELS, AUDIENCE_SIZES, APPLICATION_STATUSES,
  REVIEW_OPTIONS, DECISION_REASONS, type ApplicationStatus, type ReviewAssessments, type ReviewKey,
} from './options';

// Shared rules are used on each client step and on the complete server payload.
export const TEXT_FIELDS = {
  fullName: { required: true, max: 120 }, email: { required: true, max: 254 }, mobile: { required: true, max: 32 },
  city: { required: true, max: 120 }, country: { required: true, max: 120 },
  currentRole: { required: true, max: 200 }, organisation: { required: false, max: 200 },
  professionalProfileUrl: { required: false, max: 2048 }, proposedCourseTopic: { required: true, max: 200 },
  courseDescription: { required: true, max: 4000 }, targetLearner: { required: true, max: 2000 },
  learnerOutcome: { required: true, max: 4000 }, teachingExperienceDescription: { required: false, max: 2000 },
  sampleContentUrl: { required: false, max: 2048 }, joiningReason: { required: true, max: 3000 },
  additionalInformation: { required: false, max: 3000 },
} as const;
const ENUM_FIELDS = { aviationBackground: AVIATION_BACKGROUNDS, yearsExperience: EXPERIENCE_RANGES,
  courseReadiness: COURSE_READINESS, teachingExperienceType: TEACHING_EXPERIENCE, audienceStatus: AUDIENCE_STATUS } as const;
export type ApplicationInput = Record<keyof typeof TEXT_FIELDS | keyof typeof ENUM_FIELDS | 'audienceSize', string> & {
  audienceChannels: string[]; consentAccuracy: boolean; consentContact: boolean;
};
export const STEP_FIELDS: (keyof ApplicationInput)[][] = [
  ['fullName', 'email', 'mobile', 'city', 'country', 'aviationBackground', 'currentRole', 'organisation', 'yearsExperience', 'professionalProfileUrl'],
  ['proposedCourseTopic', 'courseDescription', 'targetLearner', 'learnerOutcome'],
  ['courseReadiness', 'teachingExperienceType', 'teachingExperienceDescription', 'sampleContentUrl'],
  ['audienceStatus', 'audienceChannels', 'audienceSize', 'joiningReason', 'additionalInformation', 'consentAccuracy', 'consentContact'],
];
export function emptyApplication(): ApplicationInput {
  return {
    fullName: '', email: '', mobile: '', city: '', country: 'India', aviationBackground: '',
    currentRole: '', organisation: '', yearsExperience: '', professionalProfileUrl: '',
    proposedCourseTopic: '', courseDescription: '', targetLearner: '', learnerOutcome: '',
    courseReadiness: '', teachingExperienceType: '', teachingExperienceDescription: '', sampleContentUrl: '',
    audienceStatus: '', audienceSize: '', audienceChannels: [], joiningReason: '', additionalInformation: '',
    consentAccuracy: false, consentContact: false,
  };
}
export type FieldErrors = Partial<Record<keyof ApplicationInput | 'submissionKey' | 'form', string>>;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function isHttpUrl(value: string): boolean {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password; } catch { return false; }
}
function cleanText(value: string): string {
  // Keep applicants' wording and newlines; remove non-printing control characters.
  return value.trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
}
export function validateApplication(payload: unknown): { success: true; data: ApplicationInput; submissionKey: string } | { success: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  if (!record(payload)) return { success: false, errors: { form: 'Please provide an application.' } };
  const allowed = new Set([...Object.keys(TEXT_FIELDS), ...Object.keys(ENUM_FIELDS), 'audienceSize', 'audienceChannels', 'consentAccuracy', 'consentContact', 'submissionKey']);
  if (Object.keys(payload).some(k => !allowed.has(k))) errors.form = 'Unexpected application fields. Please use the application form.';
  const data = emptyApplication();
  for (const [key, rules] of Object.entries(TEXT_FIELDS)) {
    const k = key as keyof typeof TEXT_FIELDS;
    const value = payload[k];
    if (value !== undefined && typeof value !== 'string') { errors[k] = 'Enter text for this field.'; continue; }
    data[k] = typeof value === 'string' ? cleanText(value) : '';
    if (rules.required && !data[k]) errors[k] = 'This field is required.';
    else if (data[k].length > rules.max) errors[k] = `Use ${rules.max} characters or fewer.`;
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Enter a valid email address.';
  if (data.mobile && (!/^\+?[\d\s().-]+$/.test(data.mobile) || !/^\d{7,15}$/.test(data.mobile.replace(/\D/g, '')))) errors.mobile = 'Enter a valid mobile number, including country code if outside India.';
  for (const key of ['professionalProfileUrl', 'sampleContentUrl'] as const) {
    if (data[key] && !isHttpUrl(data[key])) errors[key] = 'Enter a complete http:// or https:// URL.';
  }
  for (const [key, values] of Object.entries(ENUM_FIELDS)) {
    const k = key as keyof typeof ENUM_FIELDS;
    if (typeof payload[k] !== 'string' || !(values as readonly string[]).includes(payload[k])) errors[k] = 'Choose an available option.';
    else data[k] = payload[k];
  }
  if (!Array.isArray(payload.audienceChannels) || payload.audienceChannels.length > AUDIENCE_CHANNELS.length || !payload.audienceChannels.every(v => typeof v === 'string' && (AUDIENCE_CHANNELS as readonly string[]).includes(v)) || new Set(payload.audienceChannels).size !== payload.audienceChannels.length) {
    errors.audienceChannels = 'Choose valid audience channels.';
  } else data.audienceChannels = payload.audienceChannels as string[];
  if (typeof payload.audienceSize !== 'string' || (payload.audienceSize !== '' && !(AUDIENCE_SIZES as readonly string[]).includes(payload.audienceSize))) errors.audienceSize = 'Choose an available audience size.';
  else data.audienceSize = payload.audienceSize;
  if (data.audienceStatus === 'Yes') {
    if (!data.audienceChannels.length) errors.audienceChannels = 'Choose at least one audience channel.';
    if (!data.audienceSize) errors.audienceSize = 'Choose your approximate audience size.';
  } else { data.audienceChannels = []; data.audienceSize = ''; }
  if (data.teachingExperienceType === TEACHING_EXPERIENCE[2]) data.teachingExperienceDescription = '';
  for (const key of ['consentAccuracy', 'consentContact'] as const) {
    if (payload[key] !== true) errors[key] = 'Your confirmation is required to apply.';
    data[key] = payload[key] === true;
  }
  if (typeof payload.submissionKey !== 'string' || !UUID_PATTERN.test(payload.submissionKey)) errors.submissionKey = 'Please refresh the page and try again.';
  if (Object.keys(errors).length) return { success: false, errors };
  return { success: true, data, submissionKey: payload.submissionKey as string };
}
export function validateStep(data: ApplicationInput, step: number): FieldErrors {
  const result = validateApplication({ ...data, submissionKey: '00000000-0000-4000-8000-000000000001' });
  if (result.success) return {};
  return Object.fromEntries(Object.entries(result.errors).filter(([k]) => STEP_FIELDS[step].includes(k as keyof ApplicationInput))) as FieldErrors;
}
export type ReviewUpdate = { applicationStatus: ApplicationStatus; reviewAssessments: ReviewAssessments; internalNotes: string; decisionReason: string; expectedUpdatedAt: string };
export function validateReview(payload: unknown): { success: true; data: ReviewUpdate } | { success: false; error: string } {
  if (!record(payload) || Object.keys(payload).some(k => !['applicationStatus', 'reviewAssessments', 'internalNotes', 'decisionReason', 'expectedUpdatedAt'].includes(k))) return { success: false, error: 'Unexpected review fields.' };
  if (typeof payload.applicationStatus !== 'string' || !(APPLICATION_STATUSES as readonly string[]).includes(payload.applicationStatus)) return { success: false, error: 'Choose an available application status.' };
  if (!record(payload.reviewAssessments)) return { success: false, error: 'Provide valid review assessments.' };
  for (const [key, value] of Object.entries(payload.reviewAssessments)) {
    if (!Object.hasOwn(REVIEW_OPTIONS, key) || typeof value !== 'string' || !(REVIEW_OPTIONS[key as ReviewKey] as readonly string[]).includes(value)) return { success: false, error: 'Choose an available assessment value.' };
  }
  if (typeof payload.internalNotes !== 'string' || payload.internalNotes.length > 10000) return { success: false, error: 'Internal notes must be 10,000 characters or fewer.' };
  if (typeof payload.decisionReason !== 'string' || (payload.decisionReason && !(DECISION_REASONS as readonly string[]).includes(payload.decisionReason))) return { success: false, error: 'Choose an available decision reason.' };
  if (typeof payload.expectedUpdatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(payload.expectedUpdatedAt) || !Number.isFinite(Date.parse(payload.expectedUpdatedAt))) return { success: false, error: 'Reload this application before saving.' };
  return { success: true, data: { applicationStatus: payload.applicationStatus as ApplicationStatus, reviewAssessments: payload.reviewAssessments as ReviewAssessments, internalNotes: cleanText(payload.internalNotes), decisionReason: payload.decisionReason, expectedUpdatedAt: payload.expectedUpdatedAt } };
}
