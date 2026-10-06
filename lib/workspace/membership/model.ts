import { object, UUID } from '../eligibility/model';

export const PLAN_CODES = ['quarterly', 'half_yearly', 'yearly'] as const;
export type PlanCode = typeof PLAN_CODES[number];
export const PLAN_TERMS: Record<PlanCode, number> = { quarterly: 3, half_yearly: 6, yearly: 12 };
export const COUPON_STATUSES = ['active', 'paused', 'archived'] as const;
export type CouponStatus = typeof COUPON_STATUSES[number];
export const SOURCE_TYPES = ['influencer', 'partner', 'institution', 'founder', 'organic_campaign', 'internal', 'other'] as const;
export const QUOTE_VERSION = 'workspace-pricing-v1';
export const START_RULE_VERSION = 'workspace-membership-start-v1';
export const MAX_PRICE_PAISE = 100_000_000;
export const COUPON_ERRORS = ['invalid_code', 'expired', 'not_started', 'paused', 'archived', 'wrong_plan', 'discount_invalid', 'unavailable'] as const;
export type CouponError = typeof COUPON_ERRORS[number];
export const COUPON_MESSAGES: Record<CouponError, string> = {
  invalid_code: 'This Workspace coupon code is not valid.', expired: 'This coupon has expired.', not_started: 'This coupon is not available yet.',
  paused: 'This coupon is paused.', archived: 'This coupon is archived.', wrong_plan: 'This coupon does not apply to the selected plan.',
  discount_invalid: 'This coupon cannot be applied to the selected price.', unavailable: 'Coupon preview is temporarily unavailable.',
};
export type Plan = { id: string; code: PlanCode; version: number; displayName: string; durationMonths: number; basePricePaise: number; taxRateBps: number; currency: 'INR'; isCurrent: boolean; available: boolean };
export type CouponDefinition = { code: string; discountType: 'fixed' | 'percentage'; discountValue: number; startsAt: string | null; expiresAt: string | null; usageLimit: number | null; planCodes: PlanCode[]; campaignName: string; sourceType: typeof SOURCE_TYPES[number]; sourceName: string };
export type Coupon = Omit<CouponDefinition, 'startsAt' | 'expiresAt'> & { id: string; status: CouponStatus; version: number; startsAt: Date | null; expiresAt: Date | null };
export function isPlanCode(value: unknown): value is PlanCode { return typeof value === 'string' && (PLAN_CODES as readonly string[]).includes(value); }
export function normalizeCouponCode(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 64) return null;
  const code = input.trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code) ? code : null;
}
export function isBoundedInteger(value: unknown, maximum: number): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= maximum; }
export function validPlan(plan: Plan) {
  return isPlanCode(plan.code) && UUID.test(plan.id) && isBoundedInteger(plan.version, 2_147_483_647) && plan.durationMonths === PLAN_TERMS[plan.code] &&
    isBoundedInteger(plan.basePricePaise, MAX_PRICE_PAISE) && plan.taxRateBps === 1800 && plan.currency === 'INR' && typeof plan.displayName === 'string' && plan.displayName.length > 0 && plan.displayName.length <= 80;
}
// Nonnegative integer arithmetic only: round half-up to the nearest paise.
export function roundBps(amount: number, bps: number) {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > MAX_PRICE_PAISE || !Number.isInteger(bps) || bps < 0 || bps > 10_000) throw new Error('invalid_money');
  return Number((BigInt(amount) * BigInt(bps) + BigInt(5_000)) / BigInt(10_000));
}
export function calculatePrice(basePricePaise: number, taxRateBps: number, discount?: Pick<CouponDefinition, 'discountType' | 'discountValue'>) {
  if (!isBoundedInteger(basePricePaise, MAX_PRICE_PAISE) || taxRateBps !== 1800) throw new Error('invalid_money');
  let discountPaise = 0;
  if (discount) {
    const maximum = discount.discountType === 'fixed' ? MAX_PRICE_PAISE : discount.discountType === 'percentage' ? 9999 : 0;
    if (!isBoundedInteger(discount.discountValue, maximum)) throw new Error('discount_invalid');
    discountPaise = discount.discountType === 'fixed' ? discount.discountValue : roundBps(basePricePaise, discount.discountValue);
    if (discountPaise >= basePricePaise) throw new Error('discount_invalid');
  }
  const taxableAmountPaise = basePricePaise - discountPaise;
  const gstAmountPaise = roundBps(taxableAmountPaise, taxRateBps);
  return { basePricePaise, discountPaise, taxableAmountPaise, gstRateBps: taxRateBps, gstAmountPaise, totalPaise: taxableAmountPaise + gstAmountPaise };
}
function instant(input: unknown): input is string | null {
  if (input === null) return true;
  if (typeof input !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(input)) return false;
  const time = new Date(input);
  return Number.isFinite(time.getTime()) && time.toISOString() === input;
}
export function validateCouponDefinition(input: unknown): CouponDefinition | null {
  const keys = ['code', 'discountType', 'discountValue', 'startsAt', 'expiresAt', 'usageLimit', 'planCodes', 'campaignName', 'sourceType', 'sourceName'];
  if (!object(input) || Object.keys(input).length !== keys.length || Object.keys(input).some(key => !keys.includes(key))) return null;
  const code = normalizeCouponCode(input.code);
  if (!code || !['fixed', 'percentage'].includes(String(input.discountType)) || !isBoundedInteger(input.discountValue, input.discountType === 'fixed' ? MAX_PRICE_PAISE : 9999) ||
    !instant(input.startsAt) || !instant(input.expiresAt) || (input.startsAt && input.expiresAt && Date.parse(input.expiresAt) <= Date.parse(input.startsAt)) ||
    (input.usageLimit !== null && !isBoundedInteger(input.usageLimit, 2_147_483_647)) ||
    !Array.isArray(input.planCodes) || !input.planCodes.length || input.planCodes.length > 3 || !input.planCodes.every(isPlanCode) || new Set(input.planCodes).size !== input.planCodes.length ||
    !(SOURCE_TYPES as readonly unknown[]).includes(input.sourceType)) return null;
  for (const key of ['campaignName', 'sourceName']) if (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > 120 || /[\u0000-\u001f\u007f]/.test(input[key])) return null;
  return { code, discountType: input.discountType as CouponDefinition['discountType'], discountValue: input.discountValue, startsAt: input.startsAt, expiresAt: input.expiresAt,
    usageLimit: input.usageLimit as number | null, planCodes: PLAN_CODES.filter(code => (input.planCodes as unknown[]).includes(code)), campaignName: (input.campaignName as string).trim(), sourceType: input.sourceType as CouponDefinition['sourceType'], sourceName: (input.sourceName as string).trim() };
}
export function couponFailure(coupon: Coupon | null, plan: Plan, now: Date): CouponError | null {
  if (!coupon) return 'invalid_code';
  if (!COUPON_STATUSES.includes(coupon.status)) return 'unavailable';
  if (coupon.status !== 'active') return coupon.status;
  if (coupon.startsAt && now < coupon.startsAt) return 'not_started';
  if (coupon.expiresAt && now >= coupon.expiresAt) return 'expired';
  if (!coupon.planCodes.includes(plan.code)) return 'wrong_plan';
  try { calculatePrice(plan.basePricePaise, plan.taxRateBps, coupon); } catch { return 'discount_invalid'; }
  return null;
}
export function parseQuoteInput(input: unknown) {
  if (!object(input) || Object.keys(input).some(key => !['planCode', 'planVersionId', 'couponCode'].includes(key)) || !isPlanCode(input.planCode) || typeof input.planVersionId !== 'string' || !UUID.test(input.planVersionId)) return null;
  if (input.couponCode !== undefined && (typeof input.couponCode !== 'string' || !normalizeCouponCode(input.couponCode))) return null;
  return { planCode: input.planCode, planVersionId: input.planVersionId, ...(input.couponCode === undefined ? {} : { couponCode: normalizeCouponCode(input.couponCode)! }) };
}
export type QuoteInput = NonNullable<ReturnType<typeof parseQuoteInput>>;
export function membershipStartInfo(launchAt: string, now: Date) {
  const label = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(launchAt));
  const launchTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(new Date(launchAt));
  return { version: START_RULE_VERSION, launchAt, timezone: 'Asia/Kolkata', beforeLaunch: now < new Date(launchAt),
    summary: now < new Date(launchAt) ? `Early Access begins after successful activation. Your paid membership term will begin on ${label}.` : 'Your membership term will begin when your payment is successfully completed.',
    rule: `If payment is completed before ${label} at ${launchTime} IST, your paid membership term starts at launch. If payment is completed on or after launch, your membership starts on the successful payment date.` };
}
export function formatPaise(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('invalid_money');
  return `₹${Math.floor(value / 100).toLocaleString('en-IN')}.${String(value % 100).padStart(2, '0')}`;
}
export function parseDecimalUnits(value: string): number | null {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
