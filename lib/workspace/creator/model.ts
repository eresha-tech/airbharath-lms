import { resolveMembershipAccess, type AccessEvidence } from '../activation/model';
import { CATEGORIES, normalizeProfileUrl, UUID, type Category } from '../eligibility/model';
export const MAX_PRICE_PAISE = 100_000_000;
export type OutlineItem = { title: string; description: string; ordering: number };
export type DraftContent = { title: string; category: Category; description: string; targetLearner: string; learningOutcomes: string[]; outline: OutlineItem[]; tentativePricePaise: number | null };
export type ProfileContent = { displayName: string; professionalHeadline: string; shortBio: string; primaryAviationCategory: Category; professionalProfileUrl: string | null };
export class CreatorError extends Error {
  constructor(public code: 'authentication' | 'restricted' | 'not_found' | 'validation' | 'conflict' | 'too_large', public fields?: Record<string, string>) { super(code); }
}
export function creatorCapabilities(evidence: AccessEvidence | null, now: Date, environment: string | undefined, financialReview = false) {
  const access = resolveMembershipAccess(evidence, now, environment);
  const historical = !!evidence && access.state === 'expired' && resolveMembershipAccess(evidence, new Date(evidence.membership.endsAt.getTime() - 1), environment).hasCreatorAccess && evidence.membership.fulfilledAt <= now;
  return { ...access, canViewCreatorWorkspace: !financialReview && (access.hasCreatorAccess || historical), canEditWorkspace: !financialReview && access.hasCreatorAccess && access.hasPaidEntitlement };
}
export function environment() { return process.env.NODE_ENV === 'production' ? 'production' : process.env.DATABASE_ENV; }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CreatorError('validation');
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new CreatorError('validation');
}
function plain(value: unknown, key: string, min: number, max: number): string {
  if (typeof value !== 'string') throw new CreatorError('validation', { [key]: 'Enter plain text.' });
  const text = value.normalize('NFC').replace(/\r\n?/g, '\n').trim();
  if (text.length < min || text.length > max || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw new CreatorError('validation', { [key]: `Use ${min}–${max} characters of plain text, without HTML.` });
  return text;
}
function category(value: unknown): Category {
  if (!CATEGORIES.some(([key]) => key === value)) throw new CreatorError('validation', { category: 'Choose an aviation category.' });
  return value as Category;
}
export function version(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > 2_147_483_646) throw new CreatorError('validation');
  return Number(value);
}
export function validateDraft(value: unknown): DraftContent {
  const input = record(value);
  keys(input, ['title', 'category', 'description', 'targetLearner', 'learningOutcomes', 'outline', 'tentativePricePaise']);
  if (!Array.isArray(input.learningOutcomes) || input.learningOutcomes.length < 1 || input.learningOutcomes.length > 10) throw new CreatorError('validation', { learningOutcomes: 'Enter 1–10 outcomes.' });
  if (!Array.isArray(input.outline) || input.outline.length > 20) throw new CreatorError('validation', { outline: 'Use at most 20 outline items.' });
  const price = input.tentativePricePaise;
  if (price !== null && (!Number.isSafeInteger(price) || Number(price) <= 0 || Number(price) > MAX_PRICE_PAISE)) throw new CreatorError('validation', { tentativePricePaise: 'Enter a positive INR price up to ₹10,00,000, or leave it blank.' });
  return { title: plain(input.title, 'title', 3, 200), category: category(input.category), description: plain(input.description, 'description', 50, 5000), targetLearner: plain(input.targetLearner, 'targetLearner', 1, 1000), learningOutcomes: input.learningOutcomes.map(item => plain(item, 'learningOutcomes', 1, 300)), outline: input.outline.map((value, i) => {
    const item = record(value); keys(item, ['title', 'description', 'ordering']);
    if (item.ordering !== i) throw new CreatorError('validation', { outline: 'Outline ordering must start at zero and be sequential.' });
    return { title: plain(item.title, 'outline', 1, 200), description: plain(item.description ?? '', 'outline', 0, 1000), ordering: i };
  }), tentativePricePaise: price as number | null };
}
export function validateProfile(value: unknown): ProfileContent {
  const input = record(value); keys(input, ['displayName', 'professionalHeadline', 'shortBio', 'primaryAviationCategory', 'professionalProfileUrl']);
  const url = input.professionalProfileUrl;
  if (url !== null && (typeof url !== 'string' || url.length > 2048 || !normalizeProfileUrl(url))) throw new CreatorError('validation', { professionalProfileUrl: 'Enter a public HTTPS professional profile URL or leave blank.' });
  return { displayName: plain(input.displayName, 'displayName', 2, 100), professionalHeadline: plain(input.professionalHeadline ?? '', 'professionalHeadline', 0, 160), shortBio: plain(input.shortBio ?? '', 'shortBio', 0, 1000), primaryAviationCategory: category(input.primaryAviationCategory), professionalProfileUrl: url === null ? null : normalizeProfileUrl(String(url)) };
}
export function parseCommand(value: unknown, kind: 'create' | 'update' | 'profile') {
  const input = record(value); keys(input, kind === 'create' ? ['requestKey', 'content'] : ['expectedVersion', 'content']);
  if (kind === 'create' && (typeof input.requestKey !== 'string' || !UUID.test(input.requestKey))) throw new CreatorError('validation');
  return { requestKey: kind === 'create' ? String(input.requestKey) : null, expectedVersion: kind === 'create' ? null : version(input.expectedVersion), content: kind === 'profile' ? validateProfile(input.content) : validateDraft(input.content) };
}
export function categoryLabel(value: string) { return CATEGORIES.find(([key]) => key === value)?.[1] || 'Aviation'; }
export function priceLabel(value: number | null) { return value === null ? 'Not set' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value / 100); }
