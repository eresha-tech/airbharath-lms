ALTER TABLE "workspace_payment_attempts" DROP CONSTRAINT "workspace_payments_definition_check";--> statement-breakpoint
ALTER TABLE "workspace_payment_attempts" ADD CONSTRAINT "workspace_payments_definition_check" CHECK ("workspace_payment_attempts"."provider_mode" = 'test' AND "workspace_payment_attempts"."provider_payment_id" ~ '^pay_[A-Za-z0-9]{6,80}$' AND "workspace_payment_attempts"."provider_order_id" ~ '^order_[A-Za-z0-9]{6,80}$' AND "workspace_payment_attempts"."amount_paise" > 0 AND "workspace_payment_attempts"."currency" ~ '^[A-Z]{3}$' AND "workspace_payment_attempts"."state" IN ('created','authorized','failed','captured') AND "workspace_payment_attempts"."refunded_paise" BETWEEN 0 AND "workspace_payment_attempts"."amount_paise" AND "workspace_payment_attempts"."evidence_hash" ~ '^[a-f0-9]{64}$' AND ("workspace_payment_attempts"."winner" = false OR "workspace_payment_attempts"."state" = 'captured') AND (("workspace_payment_attempts"."captured_at" IS NULL AND "workspace_payment_attempts"."capture_time_source" IS NULL) OR ("workspace_payment_attempts"."captured_at" IS NOT NULL AND "workspace_payment_attempts"."capture_time_source" IS NOT NULL AND "workspace_payment_attempts"."captured_at" >= "workspace_payment_attempts"."provider_created_at" AND "workspace_payment_attempts"."state" = 'captured' AND "workspace_payment_attempts"."capture_time_source" IN ('test_authoritative','razorpay_payment_captured_event_v1'))));
--> statement-breakpoint
-- Capture timing requires the authenticated immutable inbox; browser callback
-- and payment entity creation time cannot establish paidAt.
CREATE FUNCTION workspace_capture_event_time_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.capture_time_source='razorpay_payment_captured_event_v1' AND
    (TG_OP='INSERT' OR NEW.captured_at IS DISTINCT FROM OLD.captured_at OR NEW.capture_time_source IS DISTINCT FROM OLD.capture_time_source) THEN
  IF NOT EXISTS (
   SELECT 1 FROM workspace_payment_events e JOIN workspace_membership_orders o ON o.id=NEW.membership_order_id
   WHERE e.provider_account_id=NEW.provider_account_id AND e.provider_mode=NEW.provider_mode
     AND e.event_type='payment.captured' AND e.anomaly_hash IS NULL
     AND e.evidence->>'providerOrderId'=NEW.provider_order_id AND e.evidence->>'providerPaymentId'=NEW.provider_payment_id
     AND (e.evidence->>'eventCreatedAt')::timestamptz=NEW.captured_at
     AND NEW.captured_at<=e.received_at AND NEW.captured_at<=CURRENT_TIMESTAMP
     AND NEW.captured_at>=o.created_at AND NEW.captured_at>=NEW.provider_created_at
     AND o.user_id=NEW.user_id AND o.provider_account_id=NEW.provider_account_id AND o.provider_mode=NEW.provider_mode
     AND o.provider_order_id=NEW.provider_order_id AND NEW.state='captured' AND NEW.amount_paise=o.total_paise AND NEW.currency='INR' AND o.currency='INR'
  ) THEN RAISE EXCEPTION 'Capture time requires matching durable capture event' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_capture_event_time_guard BEFORE INSERT OR UPDATE ON workspace_payment_attempts FOR EACH ROW EXECUTE FUNCTION workspace_capture_event_time_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION workspace_phase15b_membership_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o workspace_membership_orders; p workspace_payment_attempts; c workspace_creator_profiles; expected_start timestamptz; expected_end timestamptz;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Membership terms and fulfillment history are immutable' USING ERRCODE='23514'; END IF;
 -- Serialize every initial fulfillment for the persisted owner. No extension or reset is necessary.
 PERFORM id FROM users WHERE id=NEW.user_id FOR UPDATE;
 SELECT * INTO o FROM workspace_membership_orders WHERE id=NEW.membership_order_id FOR UPDATE;
 SELECT * INTO c FROM workspace_creator_profiles WHERE id=NEW.creator_profile_id FOR UPDATE;
 SELECT * INTO p FROM workspace_payment_attempts WHERE membership_order_id=o.id AND provider_payment_id=o.winning_payment_id AND winner;
 IF o.id IS NULL OR c.id IS NULL OR c.user_id<>NEW.user_id OR c.status<>'enabled' OR o.user_id<>NEW.user_id
   OR o.activation_state<>'pending_activation' OR o.fulfilled_at IS NOT NULL OR o.review_reason IS NOT NULL OR o.financial_state<>'captured' OR o.provider_setup_state<>'ready'
   OR o.paid_at IS NULL OR o.refund_eligible_until IS DISTINCT FROM o.paid_at+interval '72 hours' OR o.paid_at<o.created_at OR o.paid_at>=o.eligibility_valid_until
   OR o.plan_version_id<>NEW.plan_version_id OR o.duration_months<>NEW.duration_months OR o.paid_at IS DISTINCT FROM NEW.paid_at
   OR o.launch_at IS DISTINCT FROM '2026-11-08T18:30:00.000Z'::timestamptz OR o.membership_start_rule_version<>'workspace-membership-start-v1'
   OR o.membership_start_rule IS DISTINCT FROM 'If payment is completed before 9 November 2026 at 00:00 IST, your paid membership term starts at launch. If payment is completed on or after launch, your membership starts on the successful payment date.'
   OR o.provider_mode<>'test' OR o.commercial_policy_version<>'workspace-test-noncommercial-v1'
   OR p.id IS NULL OR p.state<>'captured' OR p.refunded_paise<>0 OR (p.capture_time_source IS NULL OR p.capture_time_source NOT IN ('test_authoritative','razorpay_payment_captured_event_v1'))
   OR (p.capture_time_source='razorpay_payment_captured_event_v1' AND NOT EXISTS (
     SELECT 1 FROM workspace_payment_events e WHERE e.provider_account_id=p.provider_account_id AND e.provider_mode=p.provider_mode
       AND e.event_type='payment.captured' AND e.anomaly_hash IS NULL
       AND e.evidence->>'providerOrderId'=p.provider_order_id AND e.evidence->>'providerPaymentId'=p.provider_payment_id
       AND (e.evidence->>'eventCreatedAt')::timestamptz=p.captured_at AND p.captured_at<=e.received_at))
   OR p.captured_at IS DISTINCT FROM o.paid_at OR p.provider_created_at>o.paid_at OR p.user_id<>o.user_id OR p.provider_order_id IS DISTINCT FROM o.provider_order_id
   OR p.provider_account_id<>o.provider_account_id OR p.provider_mode<>o.provider_mode OR p.amount_paise<>o.total_paise OR p.currency<>o.currency
   OR (o.coupon_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM workspace_coupon_redemptions WHERE membership_order_id=o.id AND user_id=o.user_id AND coupon_id=o.coupon_id AND status='redeemed')) THEN
   RAISE EXCEPTION 'Membership requires safe captured evidence and enabled matching creator' USING ERRCODE='23514';
 END IF;
 expected_start := greatest(o.paid_at, o.launch_at);
 expected_end := ((expected_start AT TIME ZONE 'Asia/Kolkata') + make_interval(months=>o.duration_months)) AT TIME ZONE 'Asia/Kolkata';
 IF NEW.starts_at IS DISTINCT FROM expected_start OR NEW.ends_at IS DISTINCT FROM expected_end OR
    EXISTS(SELECT 1 FROM workspace_memberships WHERE user_id=NEW.user_id AND (ends_at>NEW.fulfilled_at OR (starts_at<NEW.ends_at AND NEW.starts_at<ends_at))) THEN
   RAISE EXCEPTION 'Membership term mismatch or overlapping initial membership' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
