import type { Plan, CouponDefinition } from '@/lib/workspace/membership/model';
export const actorId = '11111111-1111-4111-8111-111111111111';
export const requestKey = '22222222-2222-4222-8222-222222222222';
export const now = new Date('2026-10-06T12:00:00.000Z');
export const plans: Plan[] = [
  { id: '14000000-0000-4000-8000-000000000001', code: 'quarterly', version: 1, displayName: 'Quarterly', durationMonths: 3, basePricePaise: 499900, taxRateBps: 1800, currency: 'INR', isCurrent: true, available: true },
  { id: '14000000-0000-4000-8000-000000000002', code: 'half_yearly', version: 1, displayName: 'Half-Yearly', durationMonths: 6, basePricePaise: 899900, taxRateBps: 1800, currency: 'INR', isCurrent: true, available: true },
  { id: '14000000-0000-4000-8000-000000000003', code: 'yearly', version: 1, displayName: 'Yearly', durationMonths: 12, basePricePaise: 1699900, taxRateBps: 1800, currency: 'INR', isCurrent: true, available: true },
];
export const definition: CouponDefinition = { code: 'SYNTHETIC14', discountType: 'fixed', discountValue: 110000, startsAt: null, expiresAt: null, usageLimit: 100, planCodes: ['quarterly', 'half_yearly', 'yearly'], campaignName: 'Synthetic campaign', sourceType: 'internal', sourceName: 'Synthetic source' };
