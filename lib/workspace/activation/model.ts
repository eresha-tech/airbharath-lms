import { CAPTURE_EVENT_TIME_SOURCE } from '../payments/model';
import { START_RULE_VERSION, membershipStartInfo } from '../membership/model';
import type { Order, Payment, Redemption } from '../payments/repository';
export const WORKSPACE_LAUNCH_AT = '2026-11-08T18:30:00.000Z';
export type MembershipState = 'early_access' | 'active' | 'expired' | 'refunded';
const IST_OFFSET = 330 * 60_000;
// Kolkata has no DST. Work in its civil calendar, preserving wall time and milliseconds.
export function addCalendarMonthsIST(start: Date, months: number): Date {
  if (![3, 6, 12].includes(months) || !Number.isFinite(start.getTime())) throw new Error('invalid_term');
  const civil = new Date(start.getTime() + IST_OFFSET);
  const month = civil.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(civil.getUTCFullYear(), month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(civil.getUTCFullYear(), month, Math.min(civil.getUTCDate(), lastDay), civil.getUTCHours(), civil.getUTCMinutes(), civil.getUTCSeconds(), civil.getUTCMilliseconds()) - IST_OFFSET);
}
export function membershipTerm(paidAt: Date, months: number) {
  const startsAt = new Date(Math.max(paidAt.getTime(), Date.parse(WORKSPACE_LAUNCH_AT)));
  return { startsAt, endsAt: addCalendarMonthsIST(startsAt, months) };
}
export function membershipState(startsAt: Date, endsAt: Date, now: Date): MembershipState {
  return now < startsAt ? 'early_access' : now < endsAt ? 'active' : 'expired';
}
export function activationReviewReason(order: Order, payment: Payment | null, redemption: Redemption | null, now: Date): string | null {
  if (order.financialState !== 'captured' || order.providerSetupState !== 'ready' || order.activationState !== 'pending_activation' || order.reviewReason || order.fulfilledAt) return 'activation_not_ready';
  if (!order.paidAt || !order.refundEligibleUntil || order.refundEligibleUntil.getTime() !== order.paidAt.getTime() + 72 * 3_600_000 || order.paidAt > now || order.paidAt < order.createdAt || order.paidAt >= order.eligibilityValidUntil) return 'activation_capture_time_invalid';
  if (order.providerMode !== 'test' || order.commercialPolicyVersion !== 'workspace-test-noncommercial-v1' || order.purchaseKind !== 'initial' || order.launchAt.toISOString() !== WORKSPACE_LAUNCH_AT || order.membershipStartRuleVersion !== START_RULE_VERSION || order.membershipStartRule !== membershipStartInfo(WORKSPACE_LAUNCH_AT, order.createdAt).rule || !({ quarterly: 3, half_yearly: 6, yearly: 12 }[order.planCode] === order.durationMonths)) return 'activation_context_invalid';
  if (!payment || !payment.winner || payment.state !== 'captured' || payment.refundedPaise !== 0 || payment.membershipOrderId !== order.id || payment.userId !== order.userId || payment.providerAccountId !== order.providerAccountId || payment.providerMode !== order.providerMode || payment.providerOrderId !== order.providerOrderId || payment.providerPaymentId !== order.winningPaymentId || payment.amountPaise !== order.totalPaise || payment.currency !== order.currency || !['test_authoritative', CAPTURE_EVENT_TIME_SOURCE].includes(payment.captureTimeSource || '') || !payment.capturedAt || payment.capturedAt.getTime() !== order.paidAt.getTime() || payment.providerCreatedAt > order.paidAt) return 'activation_payment_inconsistent';
  if (order.couponId ? !redemption || redemption.membershipOrderId !== order.id || redemption.userId !== order.userId || redemption.couponId !== order.couponId || redemption.status !== 'redeemed' || !redemption.redeemedAt : !!redemption) return 'activation_coupon_inconsistent';
  return null;
}
export type AccessEvidence = {
  refundedAt?: Date | null; profileStatus: 'enabled' | 'suspended' | 'terminated'; providerMode: string; commercialPolicyVersion: string; activationState: Order['activationState'];
  membership: { startsAt: Date; endsAt: Date; fulfilledAt: Date; accessGrantedAt: Date };
};
export function resolveMembershipAccess(evidence: AccessEvidence | null, now: Date, environment: string | undefined) {
  const state = evidence?.refundedAt ? 'refunded' as const : evidence ? membershipState(evidence.membership.startsAt, evidence.membership.endsAt, now) : null;
  const granted = ['development', 'test'].includes(environment || '') && !!evidence && evidence.providerMode === 'test' && evidence.commercialPolicyVersion === 'workspace-test-noncommercial-v1' && evidence.profileStatus === 'enabled' && evidence.activationState === 'fulfilled' && evidence.membership.fulfilledAt <= now && evidence.membership.accessGrantedAt.getTime() === evidence.membership.fulfilledAt.getTime() && state !== 'expired' && state !== 'refunded';
  return { state, hasCreatorAccess: granted, hasPaidEntitlement: granted };
}
