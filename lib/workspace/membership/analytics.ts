'use client';
import { track } from '@/lib/analytics';
import { COUPON_ERRORS, isPlanCode, type PlanCode } from './model';
export function trackPlanSelected(planCode: PlanCode) {
  if (isPlanCode(planCode)) { try { track('workspace_plan_selected', { feature: 'workspace', eventVersion: '3', planCode }); } catch { /* Advisory UI is independent of telemetry. */ } }
}
export function trackCouponApplied(outcome: string, discountType?: string) {
  if (outcome !== 'success' && !(COUPON_ERRORS as readonly string[]).includes(outcome)) outcome = 'unavailable';
  try { track('workspace_coupon_applied', { feature: 'workspace', eventVersion: '3', outcome, hasCoupon: true, ...(outcome === 'success' && ['fixed', 'percentage'].includes(discountType || '') ? { discountType } : {}) }); } catch { /* No pricing dependency. */ }
}
