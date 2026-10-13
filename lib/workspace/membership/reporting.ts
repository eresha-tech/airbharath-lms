import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { MembershipError } from './service';
import { UUID } from '../eligibility/model';

// SQL sums remain decimal strings: aggregate money must not lose integer precision.
export async function influencerCouponReport(actorId: string, couponId: string, mode: 'test' | 'live') {
  if (!UUID.test(couponId) || !['test', 'live'].includes(mode)) throw new MembershipError('validation');
  return db.transaction(async tx => {
    const [actor] = await tx.select({ role: users.role }).from(users).where(eq(users.id, actorId)).for('share');
    if (actor?.role !== 'admin') throw new MembershipError('forbidden');
    const result = await tx.execute(sql`
      WITH paid AS (
        SELECT o.*, f.amount_paise AS refunded, m.id AS membership_id
        FROM workspace_coupon_redemptions r
        JOIN workspace_membership_orders o ON o.id = r.membership_order_id
        JOIN workspace_payment_attempts p ON p.membership_order_id=o.id AND p.winner
          AND p.provider_payment_id=o.winning_payment_id AND p.state='captured'
          AND p.amount_paise=o.total_paise AND p.currency=o.currency AND p.captured_at=o.paid_at
        LEFT JOIN workspace_refund_completions f ON f.membership_order_id=o.id
        LEFT JOIN workspace_memberships m ON m.membership_order_id=o.id
        WHERE r.coupon_id=${couponId} AND r.status='redeemed' AND o.provider_mode=${mode}
          AND o.financial_state='captured' AND o.paid_at IS NOT NULL
          AND (o.activation_state<>'held_for_review' OR f.id IS NOT NULL)
      ), capacity AS (
        SELECT count(*) FILTER (WHERE status='reserved') AS reserved,
          count(*) FILTER (WHERE status='redeemed') AS redeemed, count(*) FILTER (WHERE status='released') AS released
        FROM workspace_coupon_redemptions WHERE coupon_id=${couponId}
      )
      SELECT c.code, c.influencer_id AS "influencerId", i.display_name AS "influencerName", c.status,
        c.starts_at AS "startsAt", c.expires_at AS "expiresAt", c.usage_limit AS "usageLimit",
        ARRAY(SELECT plan_code FROM workspace_coupon_plans WHERE coupon_id=c.id ORDER BY plan_code) AS "planCodes",
        ${mode}::text AS "providerMode", capacity.reserved::text AS "reservedCapacity",
        capacity.redeemed::text AS "consumedPaidCapacity", capacity.released::text AS "releasedReservations",
        (SELECT count(*)::text FROM workspace_membership_orders WHERE coupon_id=c.id AND provider_mode=${mode} AND financial_state='captured' AND activation_state='held_for_review') AS "capturedHeldOrders",
        CASE WHEN c.usage_limit IS NULL THEN NULL ELSE greatest(0,c.usage_limit-capacity.reserved-capacity.redeemed)::text END AS "remainingSafeCapacity",
        (SELECT count(*)::text FROM paid) AS "confirmedPaidOrders",
        (SELECT count(membership_id)::text FROM paid) AS "paidMembershipConversions",
        (SELECT count(*)::text FROM paid WHERE refunded=total_paise) AS "fullyRefundedConversions",
        (SELECT count(membership_id)::text FROM paid WHERE refunded IS NULL) AS "netRetainedMembershipConversions",
        (SELECT coalesce(sum(base_price_paise),0)::text FROM paid) AS "originalBasePaise",
        (SELECT coalesce(sum(discount_paise),0)::text FROM paid) AS "discountPaise",
        (SELECT coalesce(sum(gst_amount_paise),0)::text FROM paid) AS "originalGstPaise",
        (SELECT coalesce(sum(total_paise),0)::text FROM paid) AS "grossCapturedPaise",
        (SELECT coalesce(sum(refunded),0)::text FROM paid) AS "confirmedRefundedPaise",
        (SELECT coalesce(sum(total_paise-coalesce(refunded,0)),0)::text FROM paid) AS "netCapturedPaise"
      FROM workspace_coupons c LEFT JOIN workspace_influencers i ON i.id=c.influencer_id CROSS JOIN capacity
      WHERE c.id=${couponId}`);
    if (!result[0]) throw new MembershipError('validation');
    return result[0];
  }, { isolationLevel: 'repeatable read' });
}
