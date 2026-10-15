CREATE TABLE "workspace_coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"membership_order_id" uuid NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checkout_deadline" timestamp with time zone NOT NULL,
	"hold_policy_version" text DEFAULT 'conservative-v1' NOT NULL,
	"redeemed_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"release_reason" text,
	"release_evidence_hash" text,
	"release_source" text,
	CONSTRAINT "workspace_redemptions_state_check" CHECK ("workspace_coupon_redemptions"."hold_policy_version" = 'conservative-v1' AND "workspace_coupon_redemptions"."checkout_deadline" > "workspace_coupon_redemptions"."reserved_at" AND (("workspace_coupon_redemptions"."status" = 'reserved' AND "workspace_coupon_redemptions"."redeemed_at" IS NULL AND "workspace_coupon_redemptions"."released_at" IS NULL AND "workspace_coupon_redemptions"."release_reason" IS NULL AND "workspace_coupon_redemptions"."release_evidence_hash" IS NULL AND "workspace_coupon_redemptions"."release_source" IS NULL) OR ("workspace_coupon_redemptions"."status" = 'redeemed' AND "workspace_coupon_redemptions"."redeemed_at" IS NOT NULL AND "workspace_coupon_redemptions"."redeemed_at" >= "workspace_coupon_redemptions"."reserved_at" AND "workspace_coupon_redemptions"."released_at" IS NULL AND "workspace_coupon_redemptions"."release_reason" IS NULL AND "workspace_coupon_redemptions"."release_evidence_hash" IS NULL AND "workspace_coupon_redemptions"."release_source" IS NULL) OR ("workspace_coupon_redemptions"."status" = 'released' AND "workspace_coupon_redemptions"."redeemed_at" IS NULL AND "workspace_coupon_redemptions"."released_at" IS NOT NULL AND "workspace_coupon_redemptions"."released_at" >= "workspace_coupon_redemptions"."reserved_at" AND "workspace_coupon_redemptions"."release_reason" IS NOT NULL AND "workspace_coupon_redemptions"."release_reason" IN ('never_submitted','provider_definitive_rejection') AND "workspace_coupon_redemptions"."release_evidence_hash" IS NOT NULL AND "workspace_coupon_redemptions"."release_evidence_hash" ~ '^[a-f0-9]{64}$' AND "workspace_coupon_redemptions"."release_source" IS NOT NULL AND "workspace_coupon_redemptions"."release_source" = 'system')))
);
--> statement-breakpoint
CREATE TABLE "workspace_membership_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"eligibility_attempt_id" uuid NOT NULL,
	"plan_version_id" uuid NOT NULL,
	"settings_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"eligibility_valid_until" timestamp with time zone NOT NULL,
	"purchase_kind" text DEFAULT 'initial' NOT NULL,
	"plan_code" text NOT NULL,
	"plan_snapshot" jsonb NOT NULL,
	"base_price_paise" integer NOT NULL,
	"discount_paise" integer NOT NULL,
	"taxable_amount_paise" integer NOT NULL,
	"gst_rate_bps" integer NOT NULL,
	"gst_amount_paise" integer NOT NULL,
	"total_paise" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"duration_months" integer NOT NULL,
	"quote_hash" text NOT NULL,
	"quote_version" text NOT NULL,
	"pricing_rule_version" text NOT NULL,
	"membership_start_rule_version" text NOT NULL,
	"launch_at" timestamp with time zone NOT NULL,
	"membership_start_rule" text NOT NULL,
	"context_hash" text NOT NULL,
	"coupon_id" uuid,
	"coupon_code" text,
	"coupon_snapshot" jsonb,
	"request_key" uuid NOT NULL,
	"request_payload_hash" text NOT NULL,
	"commercial_policy_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider" text DEFAULT 'razorpay' NOT NULL,
	"provider_account_id" text NOT NULL,
	"provider_mode" text DEFAULT 'test' NOT NULL,
	"provider_receipt" text NOT NULL,
	"provider_setup_state" text DEFAULT 'creating' NOT NULL,
	"provider_create_started_at" timestamp with time zone,
	"provider_request_count" integer DEFAULT 0 NOT NULL,
	"provider_order_id" text,
	"provider_order_created_at" timestamp with time zone,
	"provider_recovery_checked_at" timestamp with time zone,
	"provider_recovery_reason" text,
	"provider_create_failure_hash" text,
	"financial_state" text DEFAULT 'unpaid' NOT NULL,
	"activation_state" text DEFAULT 'pending_activation' NOT NULL,
	"winning_payment_id" text,
	"paid_at" timestamp with time zone,
	"refund_eligible_until" timestamp with time zone,
	"review_reason" text,
	"closed_at" timestamp with time zone,
	"close_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "workspace_orders_economics_check" CHECK ("workspace_membership_orders"."base_price_paise" BETWEEN 1 AND 100000000 AND "workspace_membership_orders"."discount_paise" >= 0 AND "workspace_membership_orders"."discount_paise" < "workspace_membership_orders"."base_price_paise" AND "workspace_membership_orders"."taxable_amount_paise" = "workspace_membership_orders"."base_price_paise" - "workspace_membership_orders"."discount_paise" AND "workspace_membership_orders"."gst_rate_bps" = 1800 AND "workspace_membership_orders"."gst_amount_paise" = round("workspace_membership_orders"."taxable_amount_paise"::numeric * 1800 / 10000) AND "workspace_membership_orders"."total_paise" = "workspace_membership_orders"."taxable_amount_paise" + "workspace_membership_orders"."gst_amount_paise" AND "workspace_membership_orders"."total_paise" > 0 AND "workspace_membership_orders"."currency" = 'INR' AND (("workspace_membership_orders"."plan_code" = 'quarterly' AND "workspace_membership_orders"."duration_months" = 3) OR ("workspace_membership_orders"."plan_code" = 'half_yearly' AND "workspace_membership_orders"."duration_months" = 6) OR ("workspace_membership_orders"."plan_code" = 'yearly' AND "workspace_membership_orders"."duration_months" = 12))),
	CONSTRAINT "workspace_orders_context_check" CHECK ("workspace_membership_orders"."purchase_kind" = 'initial' AND "workspace_membership_orders"."provider" = 'razorpay' AND "workspace_membership_orders"."provider_mode" = 'test' AND "workspace_membership_orders"."commercial_policy_version" = 'workspace-test-noncommercial-v1' AND "workspace_membership_orders"."quote_hash" ~ '^[a-f0-9]{64}$' AND "workspace_membership_orders"."context_hash" ~ '^[a-f0-9]{64}$' AND "workspace_membership_orders"."request_payload_hash" ~ '^[a-f0-9]{64}$' AND "workspace_membership_orders"."provider_receipt" ~ '^wso[a-f0-9]{32}$' AND length("workspace_membership_orders"."provider_account_id") BETWEEN 1 AND 100 AND "workspace_membership_orders"."version" > 0 AND (("workspace_membership_orders"."coupon_id" IS NULL AND "workspace_membership_orders"."coupon_code" IS NULL AND "workspace_membership_orders"."coupon_snapshot" IS NULL AND "workspace_membership_orders"."discount_paise" = 0) OR ("workspace_membership_orders"."coupon_id" IS NOT NULL AND "workspace_membership_orders"."coupon_code" IS NOT NULL AND "workspace_membership_orders"."coupon_snapshot" IS NOT NULL AND "workspace_membership_orders"."discount_paise" > 0))),
	CONSTRAINT "workspace_orders_state_check" CHECK ("workspace_membership_orders"."provider_setup_state" IN ('creating','ready','recovery_required','closed') AND "workspace_membership_orders"."financial_state" IN ('unpaid','captured') AND "workspace_membership_orders"."activation_state" IN ('pending_activation','held_for_review') AND ("workspace_membership_orders"."provider_create_failure_hash" IS NULL OR "workspace_membership_orders"."provider_create_failure_hash" ~ '^[a-f0-9]{64}$') AND "workspace_membership_orders"."provider_request_count" BETWEEN 0 AND 1 AND (("workspace_membership_orders"."provider_request_count" = 0 AND "workspace_membership_orders"."provider_create_started_at" IS NULL AND "workspace_membership_orders"."provider_order_id" IS NULL) OR ("workspace_membership_orders"."provider_request_count" = 1 AND "workspace_membership_orders"."provider_create_started_at" IS NOT NULL)) AND (("workspace_membership_orders"."provider_order_id" IS NULL AND "workspace_membership_orders"."provider_order_created_at" IS NULL) OR ("workspace_membership_orders"."provider_order_id" IS NOT NULL AND "workspace_membership_orders"."provider_order_created_at" IS NOT NULL AND "workspace_membership_orders"."provider_order_id" ~ '^order_[A-Za-z0-9]{6,80}$')) AND ("workspace_membership_orders"."provider_setup_state" <> 'ready' OR "workspace_membership_orders"."provider_order_id" IS NOT NULL) AND (("workspace_membership_orders"."financial_state" = 'unpaid' AND "workspace_membership_orders"."winning_payment_id" IS NULL AND "workspace_membership_orders"."paid_at" IS NULL AND "workspace_membership_orders"."refund_eligible_until" IS NULL) OR ("workspace_membership_orders"."financial_state" = 'captured' AND "workspace_membership_orders"."winning_payment_id" IS NOT NULL AND (("workspace_membership_orders"."paid_at" IS NOT NULL AND "workspace_membership_orders"."refund_eligible_until" IS NOT NULL AND "workspace_membership_orders"."refund_eligible_until" = "workspace_membership_orders"."paid_at" + interval '72 hours') OR ("workspace_membership_orders"."paid_at" IS NULL AND "workspace_membership_orders"."refund_eligible_until" IS NULL AND "workspace_membership_orders"."activation_state" = 'held_for_review')))) AND ("workspace_membership_orders"."activation_state" <> 'held_for_review' OR "workspace_membership_orders"."review_reason" IS NOT NULL) AND ("workspace_membership_orders"."provider_setup_state" <> 'closed' OR ("workspace_membership_orders"."closed_at" IS NOT NULL AND "workspace_membership_orders"."close_reason" IS NOT NULL AND "workspace_membership_orders"."close_reason" IN ('never_submitted','provider_definitive_rejection'))))
);
--> statement-breakpoint
CREATE TABLE "workspace_payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_account_id" text NOT NULL,
	"provider_mode" text NOT NULL,
	"provider_order_id" text NOT NULL,
	"provider_payment_id" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"currency" text NOT NULL,
	"state" text NOT NULL,
	"winner" boolean DEFAULT false NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_observed_at" timestamp with time zone NOT NULL,
	"provider_created_at" timestamp with time zone NOT NULL,
	"captured_at" timestamp with time zone,
	"capture_time_source" text,
	"refunded_paise" integer DEFAULT 0 NOT NULL,
	"evidence_hash" text NOT NULL,
	CONSTRAINT "workspace_payments_definition_check" CHECK ("workspace_payment_attempts"."provider_mode" = 'test' AND "workspace_payment_attempts"."provider_payment_id" ~ '^pay_[A-Za-z0-9]{6,80}$' AND "workspace_payment_attempts"."provider_order_id" ~ '^order_[A-Za-z0-9]{6,80}$' AND "workspace_payment_attempts"."amount_paise" > 0 AND "workspace_payment_attempts"."currency" ~ '^[A-Z]{3}$' AND "workspace_payment_attempts"."state" IN ('created','authorized','failed','captured') AND "workspace_payment_attempts"."refunded_paise" BETWEEN 0 AND "workspace_payment_attempts"."amount_paise" AND "workspace_payment_attempts"."evidence_hash" ~ '^[a-f0-9]{64}$' AND ("workspace_payment_attempts"."winner" = false OR "workspace_payment_attempts"."state" = 'captured') AND (("workspace_payment_attempts"."captured_at" IS NULL AND "workspace_payment_attempts"."capture_time_source" IS NULL) OR ("workspace_payment_attempts"."captured_at" IS NOT NULL AND "workspace_payment_attempts"."capture_time_source" IS NOT NULL AND "workspace_payment_attempts"."captured_at" >= "workspace_payment_attempts"."provider_created_at" AND "workspace_payment_attempts"."state" = 'captured' AND "workspace_payment_attempts"."capture_time_source" = 'test_authoritative')))
);
--> statement-breakpoint
CREATE TABLE "workspace_payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_account_id" text NOT NULL,
	"provider_mode" text NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload_hash" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processing_state" text DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp with time zone,
	"lease_until" timestamp with time zone,
	"next_attempt_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error_code" text,
	"anomaly_hash" text,
	"membership_order_id" uuid,
	CONSTRAINT "workspace_events_definition_check" CHECK ("workspace_payment_events"."provider_mode" = 'test' AND length("workspace_payment_events"."event_id") BETWEEN 1 AND 100 AND "workspace_payment_events"."event_type" ~ '^[a-z][a-z._]{1,79}$' AND "workspace_payment_events"."payload_hash" ~ '^[a-f0-9]{64}$' AND ("workspace_payment_events"."anomaly_hash" IS NULL OR "workspace_payment_events"."anomaly_hash" ~ '^[a-f0-9]{64}$') AND "workspace_payment_events"."processing_state" IN ('pending','processing','retry','processed','needs_review','ignored') AND "workspace_payment_events"."attempt_count" BETWEEN 0 AND 100 AND (("workspace_payment_events"."processing_state" IN ('processed','ignored','needs_review') AND "workspace_payment_events"."processed_at" IS NOT NULL) OR ("workspace_payment_events"."processing_state" IN ('pending','processing','retry') AND "workspace_payment_events"."processed_at" IS NULL)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_orders_owner_coupon_idx" ON "workspace_membership_orders" USING btree ("id","user_id","coupon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_orders_owner_provider_idx" ON "workspace_membership_orders" USING btree ("id","user_id","provider_account_id","provider_mode","provider_order_id");--> statement-breakpoint
ALTER TABLE "workspace_coupon_redemptions" ADD CONSTRAINT "workspace_coupon_redemptions_coupon_id_workspace_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."workspace_coupons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_coupon_redemptions" ADD CONSTRAINT "workspace_coupon_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_coupon_redemptions" ADD CONSTRAINT "workspace_coupon_redemptions_membership_order_id_user_id_coupon_id_workspace_membership_orders_id_user_id_coupon_id_fk" FOREIGN KEY ("membership_order_id","user_id","coupon_id") REFERENCES "public"."workspace_membership_orders"("id","user_id","coupon_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD CONSTRAINT "workspace_membership_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD CONSTRAINT "workspace_membership_orders_eligibility_attempt_id_workspace_eligibility_attempts_id_fk" FOREIGN KEY ("eligibility_attempt_id") REFERENCES "public"."workspace_eligibility_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD CONSTRAINT "workspace_membership_orders_plan_version_id_workspace_membership_plans_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."workspace_membership_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD CONSTRAINT "workspace_membership_orders_settings_id_workspace_eligibility_settings_id_fk" FOREIGN KEY ("settings_id") REFERENCES "public"."workspace_eligibility_settings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD CONSTRAINT "workspace_membership_orders_policy_id_workspace_policy_versions_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."workspace_policy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD CONSTRAINT "workspace_membership_orders_coupon_id_workspace_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."workspace_coupons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_payment_attempts" ADD CONSTRAINT "workspace_payment_attempts_membership_order_id_user_id_provider_account_id_provider_mode_provider_order_id_workspace_membership_orders_id_user_id_provider_account_id_provider_mode_provider_order_id_fk" FOREIGN KEY ("membership_order_id","user_id","provider_account_id","provider_mode","provider_order_id") REFERENCES "public"."workspace_membership_orders"("id","user_id","provider_account_id","provider_mode","provider_order_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_payment_events" ADD CONSTRAINT "workspace_payment_events_membership_order_id_workspace_membership_orders_id_fk" FOREIGN KEY ("membership_order_id") REFERENCES "public"."workspace_membership_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_redemptions_order_idx" ON "workspace_coupon_redemptions" USING btree ("membership_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_redemptions_user_coupon_idx" ON "workspace_coupon_redemptions" USING btree ("coupon_id","user_id") WHERE "workspace_coupon_redemptions"."status" IN ('reserved','redeemed');--> statement-breakpoint
CREATE INDEX "workspace_redemptions_capacity_idx" ON "workspace_coupon_redemptions" USING btree ("coupon_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_orders_user_request_idx" ON "workspace_membership_orders" USING btree ("user_id","request_key");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_orders_unresolved_user_idx" ON "workspace_membership_orders" USING btree ("user_id") WHERE "workspace_membership_orders"."provider_setup_state" <> 'closed' OR "workspace_membership_orders"."financial_state" = 'captured';--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_orders_receipt_idx" ON "workspace_membership_orders" USING btree ("provider_account_id","provider_mode","provider_receipt");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_orders_provider_order_idx" ON "workspace_membership_orders" USING btree ("provider_account_id","provider_mode","provider_order_id");--> statement-breakpoint
CREATE INDEX "workspace_orders_recovery_idx" ON "workspace_membership_orders" USING btree ("provider_setup_state","created_at");--> statement-breakpoint
CREATE INDEX "workspace_orders_financial_idx" ON "workspace_membership_orders" USING btree ("financial_state","activation_state","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_payments_provider_id_idx" ON "workspace_payment_attempts" USING btree ("provider_account_id","provider_mode","provider_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_payments_winner_idx" ON "workspace_payment_attempts" USING btree ("membership_order_id") WHERE "workspace_payment_attempts"."winner" = true;--> statement-breakpoint
CREATE INDEX "workspace_payments_order_idx" ON "workspace_payment_attempts" USING btree ("membership_order_id","observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_events_provider_event_idx" ON "workspace_payment_events" USING btree ("provider_account_id","provider_mode","event_id");--> statement-breakpoint
CREATE INDEX "workspace_events_pending_idx" ON "workspace_payment_events" USING btree ("processing_state","next_attempt_at","received_at");--> statement-breakpoint
-- Financial locks are always persisted user -> coupon -> order/ledger/payment.
CREATE FUNCTION workspace_phase15_order_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a workspace_eligibility_attempts; p workspace_membership_plans; c workspace_coupons; s workspace_eligibility_settings; v workspace_policy_versions; expected_discount integer;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Workspace financial history cannot be deleted' USING ERRCODE='23514'; END IF;
  IF TG_OP = 'INSERT' THEN
    PERFORM id FROM users WHERE id=NEW.user_id FOR UPDATE;
    IF NEW.coupon_id IS NOT NULL THEN SELECT * INTO c FROM workspace_coupons WHERE id=NEW.coupon_id FOR UPDATE; END IF;
    SELECT * INTO a FROM workspace_eligibility_attempts WHERE id=NEW.eligibility_attempt_id;
    SELECT * INTO p FROM workspace_membership_plans WHERE id=NEW.plan_version_id FOR SHARE;
    SELECT * INTO s FROM workspace_eligibility_settings WHERE id=NEW.settings_id FOR SHARE;
    SELECT * INTO v FROM workspace_policy_versions WHERE id=NEW.policy_id FOR SHARE;
    IF s.id IS NULL OR NOT s.is_current OR v.id IS NULL OR NOT v.is_current OR v.version<>'workspace-eligibility-declarations-v1'
      OR NEW.launch_at IS DISTINCT FROM (s.config->>'launchAt')::timestamptz
      OR NEW.quote_version<>'workspace-pricing-v1' OR NEW.pricing_rule_version<>'workspace-pricing-v1' OR NEW.membership_start_rule_version<>'workspace-membership-start-v1' THEN
      RAISE EXCEPTION 'Accepted settings/policy/start context mismatch' USING ERRCODE='23514';
    END IF;
    IF a.id IS NULL OR a.user_id <> NEW.user_id OR a.result <> 'eligible' OR a.eligible_until IS DISTINCT FROM NEW.eligibility_valid_until OR a.eligible_until <= NEW.created_at
      OR p.id IS NULL OR NOT p.is_current OR NOT p.available OR p.code <> NEW.plan_code OR p.base_price_paise <> NEW.base_price_paise OR p.duration_months <> NEW.duration_months
      OR NEW.plan_snapshot IS DISTINCT FROM jsonb_build_object('version',p.version,'displayName',p.display_name)
      OR NEW.provider_setup_state <> 'creating' OR NEW.provider_request_count <> 0 OR NEW.financial_state <> 'unpaid' OR NEW.activation_state <> 'pending_activation' OR NEW.version <> 1 THEN
      RAISE EXCEPTION 'Accepted order owner/context/state mismatch' USING ERRCODE='23514';
    END IF;
    IF NEW.coupon_id IS NOT NULL THEN
      expected_discount := CASE WHEN c.discount_type='fixed' THEN c.discount_value ELSE round(p.base_price_paise::numeric*c.discount_value/10000)::integer END;
      IF c.id IS NULL OR c.status <> 'active' OR c.code <> NEW.coupon_code OR (c.starts_at IS NOT NULL AND NEW.created_at<c.starts_at) OR (c.expires_at IS NOT NULL AND NEW.created_at>=c.expires_at)
        OR NOT EXISTS(SELECT 1 FROM workspace_coupon_plans WHERE coupon_id=c.id AND plan_code=p.code) OR expected_discount <> NEW.discount_paise
        OR NEW.coupon_snapshot IS DISTINCT FROM jsonb_build_object('campaignName',c.campaign_name,'sourceType',c.source_type,'sourceName',c.source_name,'discountType',c.discount_type,'discountValue',c.discount_value,'version',c.version,'usageLimit',c.usage_limit) THEN
        RAISE EXCEPTION 'Accepted coupon snapshot mismatch' USING ERRCODE='23514';
      END IF;
    END IF;
  ELSE
    IF (to_jsonb(NEW)-ARRAY['provider_setup_state','provider_create_started_at','provider_request_count','provider_order_id','provider_order_created_at','provider_recovery_checked_at','provider_recovery_reason','provider_create_failure_hash','financial_state','activation_state','winning_payment_id','paid_at','refund_eligible_until','review_reason','closed_at','close_reason','version']) IS DISTINCT FROM
       (to_jsonb(OLD)-ARRAY['provider_setup_state','provider_create_started_at','provider_request_count','provider_order_id','provider_order_created_at','provider_recovery_checked_at','provider_recovery_reason','provider_create_failure_hash','financial_state','activation_state','winning_payment_id','paid_at','refund_eligible_until','review_reason','closed_at','close_reason','version'])
       OR NEW.version <> OLD.version+1 OR NEW.provider_request_count < OLD.provider_request_count
       OR (OLD.provider_create_started_at IS NOT NULL AND NEW.provider_create_started_at IS DISTINCT FROM OLD.provider_create_started_at)
       OR (OLD.provider_order_id IS NOT NULL AND (NEW.provider_order_id IS DISTINCT FROM OLD.provider_order_id OR NEW.provider_order_created_at IS DISTINCT FROM OLD.provider_order_created_at))
       OR (OLD.provider_create_failure_hash IS NOT NULL AND NEW.provider_create_failure_hash IS DISTINCT FROM OLD.provider_create_failure_hash)
       OR (OLD.financial_state='captured' AND (NEW.financial_state<>'captured' OR NEW.winning_payment_id IS DISTINCT FROM OLD.winning_payment_id))
       OR (OLD.paid_at IS NOT NULL AND (NEW.paid_at IS DISTINCT FROM OLD.paid_at OR NEW.refund_eligible_until IS DISTINCT FROM OLD.refund_eligible_until))
       OR (OLD.provider_setup_state='closed' AND NEW.provider_setup_state<>'closed') THEN
      RAISE EXCEPTION 'Workspace accepted economics/provider/capture history is immutable' USING ERRCODE='23514';
    END IF;
  END IF;
  IF NEW.provider_setup_state='closed' AND (NEW.provider_order_id IS NOT NULL OR NEW.financial_state <> 'unpaid'
      OR (NEW.close_reason='never_submitted' AND NEW.provider_create_started_at IS NOT NULL)
      OR (NEW.close_reason='provider_definitive_rejection' AND (NEW.provider_request_count<>1 OR NEW.provider_create_failure_hash IS NULL))) THEN
    RAISE EXCEPTION 'Provider-backed or ambiguous checkout cannot be released on a timer' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_financial_orders_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_membership_orders FOR EACH ROW EXECUTE FUNCTION workspace_phase15_order_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_phase15_redemption_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c workspace_coupons; o workspace_membership_orders; occupied bigint;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Coupon financial ledger is historical' USING ERRCODE='23514'; END IF;
  PERFORM id FROM users WHERE id=NEW.user_id FOR UPDATE;
  SELECT * INTO c FROM workspace_coupons WHERE id=NEW.coupon_id FOR UPDATE;
  SELECT * INTO o FROM workspace_membership_orders WHERE id=NEW.membership_order_id;
  IF o.id IS NULL OR o.user_id<>NEW.user_id OR o.coupon_id IS DISTINCT FROM NEW.coupon_id THEN
    RAISE EXCEPTION 'Reservation owner/coupon mismatch' USING ERRCODE='23514';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status <> 'reserved' OR c.status<>'active' OR (c.starts_at IS NOT NULL AND NEW.reserved_at<c.starts_at) OR (c.expires_at IS NOT NULL AND NEW.reserved_at>=c.expires_at) THEN
      RAISE EXCEPTION 'New coupon reservation is not available' USING ERRCODE='23514';
    END IF;
  ELSE
    IF (to_jsonb(NEW)-ARRAY['status','redeemed_at','released_at','release_reason','release_evidence_hash','release_source']) IS DISTINCT FROM
       (to_jsonb(OLD)-ARRAY['status','redeemed_at','released_at','release_reason','release_evidence_hash','release_source']) OR OLD.status<>'reserved' OR NEW.status NOT IN ('redeemed','released') THEN
      RAISE EXCEPTION 'Coupon reservation transition/history is immutable' USING ERRCODE='23514';
    END IF;
  END IF;
  IF NEW.status IN ('reserved','redeemed') AND c.usage_limit IS NOT NULL THEN
    SELECT count(*) INTO occupied FROM workspace_coupon_redemptions WHERE coupon_id=NEW.coupon_id AND status IN ('reserved','redeemed') AND id<>NEW.id;
    IF occupied+1>c.usage_limit THEN RAISE EXCEPTION 'Workspace coupon capacity exhausted' USING ERRCODE='23514'; END IF;
  END IF;
  IF NEW.status='released' AND (o.provider_setup_state<>'closed' OR o.financial_state<>'unpaid' OR o.provider_order_id IS NOT NULL OR o.close_reason IS DISTINCT FROM NEW.release_reason
    OR (NEW.release_reason='never_submitted' AND o.provider_create_started_at IS NOT NULL) OR (NEW.release_reason='provider_definitive_rejection' AND (o.provider_request_count<>1 OR o.provider_create_failure_hash IS NULL OR o.provider_create_failure_hash IS DISTINCT FROM NEW.release_evidence_hash))) THEN
    RAISE EXCEPTION 'Coupon hold release requires proven pre-provider rejection/closure' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_financial_redemptions_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_coupon_redemptions FOR EACH ROW EXECUTE FUNCTION workspace_phase15_redemption_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_phase15_payment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Payment evidence cannot be deleted' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND ((to_jsonb(NEW)-ARRAY['state','winner','last_observed_at','captured_at','capture_time_source','refunded_paise','evidence_hash']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['state','winner','last_observed_at','captured_at','capture_time_source','refunded_paise','evidence_hash'])
    OR (OLD.state='captured' AND NEW.state<>'captured') OR (OLD.winner AND NOT NEW.winner) OR NEW.refunded_paise<OLD.refunded_paise
    OR (OLD.captured_at IS NOT NULL AND (NEW.captured_at IS DISTINCT FROM OLD.captured_at OR NEW.capture_time_source IS DISTINCT FROM OLD.capture_time_source))) THEN
    RAISE EXCEPTION 'Payment identity/captured evidence is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_financial_payments_guard BEFORE UPDATE OR DELETE ON workspace_payment_attempts FOR EACH ROW EXECUTE FUNCTION workspace_phase15_payment_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_phase15_event_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Payment inbox evidence cannot be deleted' USING ERRCODE='23514'; END IF;
  IF (to_jsonb(NEW)-ARRAY['processing_state','processed_at','lease_until','next_attempt_at','attempt_count','last_error_code','anomaly_hash','membership_order_id']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['processing_state','processed_at','lease_until','next_attempt_at','attempt_count','last_error_code','anomaly_hash','membership_order_id']) OR NEW.attempt_count<OLD.attempt_count
     OR (OLD.anomaly_hash IS NOT NULL AND NEW.anomaly_hash IS DISTINCT FROM OLD.anomaly_hash) THEN
    RAISE EXCEPTION 'Payment inbox identity/evidence is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_financial_events_guard BEFORE UPDATE OR DELETE ON workspace_payment_events FOR EACH ROW EXECUTE FUNCTION workspace_phase15_event_guard();
--> statement-breakpoint
-- Deferred completeness makes the short finalization transaction atomic across order/payment/ledger.
CREATE FUNCTION workspace_phase15_financial_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE order_id uuid; o workspace_membership_orders; p workspace_payment_attempts; r workspace_coupon_redemptions;
BEGIN
  IF TG_TABLE_NAME='workspace_membership_orders' THEN order_id := NEW.id; ELSE order_id := NEW.membership_order_id; END IF;
  SELECT * INTO o FROM workspace_membership_orders WHERE id=order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Financial order missing' USING ERRCODE='23514'; END IF;
  IF o.financial_state='captured' THEN
    SELECT * INTO p FROM workspace_payment_attempts WHERE membership_order_id=o.id AND provider_payment_id=o.winning_payment_id AND winner;
    IF p.id IS NULL OR p.state<>'captured' OR p.amount_paise<>o.total_paise OR p.currency<>o.currency OR p.user_id<>o.user_id OR p.provider_order_id IS DISTINCT FROM o.provider_order_id
      OR p.provider_account_id<>o.provider_account_id OR p.provider_mode<>o.provider_mode OR (o.paid_at IS NOT NULL AND o.paid_at IS DISTINCT FROM p.captured_at) THEN
      RAISE EXCEPTION 'Captured order requires exact winning payment evidence' USING ERRCODE='23514';
    END IF;
  ELSIF EXISTS(SELECT 1 FROM workspace_payment_attempts WHERE membership_order_id=o.id AND winner) THEN
    RAISE EXCEPTION 'Winning payment requires captured financial order' USING ERRCODE='23514';
  END IF;
  IF o.coupon_id IS NOT NULL THEN
    SELECT * INTO r FROM workspace_coupon_redemptions WHERE membership_order_id=o.id;
    IF r.id IS NULL OR r.user_id<>o.user_id OR r.coupon_id<>o.coupon_id
      OR (o.financial_state='captured' AND r.status<>'redeemed' AND o.review_reason IS DISTINCT FROM 'reservation_inconsistent')
      OR (o.financial_state='unpaid' AND o.provider_setup_state<>'closed' AND r.status<>'reserved')
      OR (o.financial_state='unpaid' AND o.provider_setup_state='closed' AND r.status<>'released') THEN
      RAISE EXCEPTION 'Order and coupon financial ledger must commit together' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NULL;
END; $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workspace_financial_order_complete AFTER INSERT OR UPDATE ON workspace_membership_orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_phase15_financial_complete();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workspace_financial_payment_complete AFTER INSERT OR UPDATE ON workspace_payment_attempts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_phase15_financial_complete();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workspace_financial_redemption_complete AFTER INSERT OR UPDATE ON workspace_coupon_redemptions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_phase15_financial_complete();
