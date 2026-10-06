import { describe, expect, it } from 'vitest';
import { calculatePrice, roundBps, normalizeCouponCode, validateCouponDefinition, couponFailure, parseQuoteInput, membershipStartInfo, formatPaise, parseDecimalUnits, validPlan } from '@/lib/workspace/membership/model';
import { plans, definition, now } from './workspace-membership-fixtures';
const coupon = { ...definition, id: 'synthetic', status: 'active' as const, version: 1, startsAt: null, expiresAt: null };
describe('exclusive GST and paid-only integer economics', () => {
  it.each([[0, 89982, 589882], [1, 161982, 1061882], [2, 305982, 2005882]])('approved plan %i totals', (index, gst, total) => {
    expect(calculatePrice(plans[index].basePricePaise, 1800)).toMatchObject({ discountPaise: 0, taxableAmountPaise: plans[index].basePricePaise, gstAmountPaise: gst, totalPaise: total });
  });
  it('discounts before tax and preserves both illustrative cases exactly', () => {
    expect(calculatePrice(499900, 1800, definition)).toEqual({ basePricePaise: 499900, discountPaise: 110000, taxableAmountPaise: 389900, gstRateBps: 1800, gstAmountPaise: 70182, totalPaise: 460082 });
    expect(calculatePrice(499900, 1800, { discountType: 'fixed', discountValue: 109900 })).toMatchObject({ taxableAmountPaise: 390000, gstAmountPaise: 70200, totalPaise: 460200 });
    expect(calculatePrice(499900, 1800, { discountType: 'percentage', discountValue: 1000 })).toMatchObject({ discountPaise: 49990, taxableAmountPaise: 449910, gstAmountPaise: 80984, totalPaise: 530894 });
  });
  it('rounds both percentage discount and GST half-up to the nearest paise', () => {
    expect(roundBps(5, 1000)).toBe(1); expect(roundBps(4, 1000)).toBe(0);
    expect(calculatePrice(25, 1800)).toMatchObject({ gstAmountPaise: 5, totalPaise: 30 });
    expect(calculatePrice(100_000_000, 1800)).toMatchObject({ totalPaise: 118_000_000 });
  });
  it.each([0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER, 100_000_001, '499900'])('rejects invalid base %s', value => expect(() => calculatePrice(value as number, 1800)).toThrow());
  it.each([0, -1, NaN, Infinity, 1.5, 499900, 500000])('rejects invalid fixed discount %s', discountValue => expect(() => calculatePrice(499900, 1800, { discountType: 'fixed', discountValue })).toThrow());
  it.each([0, -1, NaN, 1.1, 10000, 10001])('rejects percentage %s', discountValue => expect(() => calculatePrice(499900, 1800, { discountType: 'percentage', discountValue })).toThrow());
  it('rejects a rounded-to-free percentage and unsupported tax', () => {
    expect(() => calculatePrice(1, 1800, { discountType: 'percentage', discountValue: 9999 })).toThrow();
    expect(() => calculatePrice(1000, 2000)).toThrow();
    expect(() => roundBps(100_000_001, 1800)).toThrow();
  });
  it('formats and parses decimal display units without decimal arithmetic', () => {
    expect(formatPaise(589882)).toBe('₹5,898.82'); expect(parseDecimalUnits('1099')).toBe(109900); expect(parseDecimalUnits('22.00')).toBe(2200); expect(parseDecimalUnits('0.01')).toBe(1);
    for (const value of ['NaN', '1e3', '-1', '10.001', '1,100', 'Infinity']) expect(parseDecimalUnits(value)).toBeNull();
  });
});
describe('Workspace definitions and explicit advisory outcomes', () => {
  it('normalizes consistently and rejects ambiguous unsafe forms', () => {
    expect(normalizeCouponCode(' synthetic14 ')).toBe('SYNTHETIC14');
    for (const value of ['', 'AB', 'A B C', 'ABC!', 'ABC/DEF', 'éclair', 'x'.repeat(33), 123, 'ＡＢＣ']) expect(normalizeCouponCode(value)).toBeNull();
  });
  it('accepts exact bounded definitions and all selected plans, including unlimited', () => {
    expect(validateCouponDefinition({ ...definition, code: ' synthetic14 ' })).toEqual(definition);
    expect(validateCouponDefinition({ ...definition, usageLimit: null, planCodes: ['yearly'], startsAt: now.toISOString(), expiresAt: new Date(now.getTime() + 1).toISOString() })).not.toBeNull();
  });
  it.each([{ discountValue: 0 }, { discountValue: -1 }, { discountValue: NaN }, { discountType: 'percentage', discountValue: 10000 }, { discountValue: '1000' }, { usageLimit: 0 }, { usageLimit: -1 }, { usageLimit: 1.5 }, { usageLimit: '100' }, { planCodes: [] }, { planCodes: ['course'] }, { planCodes: ['yearly', 'yearly'] }, { sourceType: 'unknown' }, { campaignName: 'x'.repeat(121) }, { startsAt: '2026-02-30T00:00:00.000Z' }, { expiresAt: 'not a date' }, { startsAt: now.toISOString(), expiresAt: now.toISOString() }, { usedCount: 0 }])('rejects invalid definition %j', patch => expect(validateCouponDefinition({ ...definition, ...patch })).toBeNull());
  it.each(['paused', 'archived'] as const)('rejects %s with an explicit outcome', status => expect(couponFailure({ ...coupon, status }, plans[0], now)).toBe(status));
  it('checks start inclusive/expiry exclusive, plan targeting and no silent fallback', () => {
    expect(couponFailure({ ...coupon, startsAt: now }, plans[0], now)).toBeNull();
    expect(couponFailure({ ...coupon, startsAt: new Date(now.getTime() + 1) }, plans[0], now)).toBe('not_started');
    expect(couponFailure({ ...coupon, expiresAt: now }, plans[0], now)).toBe('expired');
    expect(couponFailure({ ...coupon, expiresAt: new Date(now.getTime() + 1) }, plans[0], now)).toBeNull();
    expect(couponFailure({ ...coupon, planCodes: ['yearly'] }, plans[0], now)).toBe('wrong_plan');
    expect(couponFailure({ ...coupon, discountValue: 499900 }, plans[0], now)).toBe('discount_invalid');
    expect(couponFailure(null, plans[0], now)).toBe('invalid_code');
    expect(couponFailure(coupon, plans[0], now)).toBeNull();
  });
  it('rejects client economics, owner, eligibility, dates, unknown codes and malformed versions', () => {
    const input = { planCode: 'quarterly', planVersionId: plans[0].id, couponCode: 'synthetic14' };
    expect(parseQuoteInput(input)).toEqual({ ...input, couponCode: 'SYNTHETIC14' });
    for (const key of ['totalPaise', 'gstRateBps', 'discountPaise', 'userId', 'eligible', 'membershipStartAt']) expect(parseQuoteInput({ ...input, [key]: 123 })).toBeNull();
    expect(parseQuoteInput({ ...input, planVersionId: 'unknown' })).toBeNull(); expect(parseQuoteInput({ ...input, planCode: 'course' })).toBeNull();
    expect(parseQuoteInput({ ...input, couponCode: '' })).toBeNull();
    expect(validPlan({ ...plans[0], durationMonths: 12 })).toBe(false);
  });
  it('describes prospective start and cross-launch rule without creating membership dates', () => {
    const launchAt = '2026-11-08T18:30:00.000Z';
    const early = membershipStartInfo(launchAt, new Date(Date.parse(launchAt) - 1));
    expect(early.beforeLaunch).toBe(true); expect(early.summary).toContain('9 November 2026'); expect(early.rule).toContain('successful payment date');
    for (const delta of [0, 1]) expect(membershipStartInfo(launchAt, new Date(Date.parse(launchAt) + delta))).toMatchObject({ beforeLaunch: false, summary: 'Your membership term will begin when your payment is successfully completed.' });
  });
});
