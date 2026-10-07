CREATE TABLE "workspace_creator_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'enabled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_creator_profiles_activation_check" CHECK ("workspace_creator_profiles"."first_activated_at" = "workspace_creator_profiles"."created_at"),
	CONSTRAINT "workspace_creator_profiles_status_check" CHECK ("workspace_creator_profiles"."status" IN ('enabled','suspended','terminated'))
);
--> statement-breakpoint
CREATE TABLE "workspace_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"creator_profile_id" uuid NOT NULL,
	"membership_order_id" uuid NOT NULL,
	"plan_version_id" uuid NOT NULL,
	"duration_months" integer NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"access_granted_at" timestamp with time zone NOT NULL,
	"fulfilled_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_memberships_term_check" CHECK ("workspace_memberships"."duration_months" IN (3,6,12) AND "workspace_memberships"."starts_at" >= "workspace_memberships"."paid_at" AND "workspace_memberships"."ends_at" > "workspace_memberships"."starts_at" AND "workspace_memberships"."access_granted_at" = "workspace_memberships"."fulfilled_at" AND "workspace_memberships"."fulfilled_at" >= "workspace_memberships"."paid_at" AND "workspace_memberships"."created_at" = "workspace_memberships"."fulfilled_at")
);
--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" DROP CONSTRAINT "workspace_orders_state_check";--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD COLUMN "fulfilled_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_creator_profiles_user_idx" ON "workspace_creator_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_creator_profiles_owner_idx" ON "workspace_creator_profiles" USING btree ("id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_memberships_order_idx" ON "workspace_memberships" USING btree ("membership_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_orders_owner_idx" ON "workspace_membership_orders" USING btree ("id","user_id");--> statement-breakpoint
ALTER TABLE "workspace_creator_profiles" ADD CONSTRAINT "workspace_creator_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_plan_version_id_workspace_membership_plans_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."workspace_membership_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_creator_profile_id_user_id_workspace_creator_profiles_id_user_id_fk" FOREIGN KEY ("creator_profile_id","user_id") REFERENCES "public"."workspace_creator_profiles"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_membership_order_id_user_id_workspace_membership_orders_id_user_id_fk" FOREIGN KEY ("membership_order_id","user_id") REFERENCES "public"."workspace_membership_orders"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_memberships_user_term_idx" ON "workspace_memberships" USING btree ("user_id","ends_at");--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD CONSTRAINT "workspace_orders_state_check" CHECK ("workspace_membership_orders"."provider_setup_state" IN ('creating','ready','recovery_required','closed') AND "workspace_membership_orders"."financial_state" IN ('unpaid','captured') AND "workspace_membership_orders"."activation_state" IN ('pending_activation','held_for_review','fulfilled') AND ("workspace_membership_orders"."provider_create_failure_hash" IS NULL OR "workspace_membership_orders"."provider_create_failure_hash" ~ '^[a-f0-9]{64}$') AND "workspace_membership_orders"."provider_request_count" BETWEEN 0 AND 1 AND (("workspace_membership_orders"."provider_request_count" = 0 AND "workspace_membership_orders"."provider_create_started_at" IS NULL AND "workspace_membership_orders"."provider_order_id" IS NULL) OR ("workspace_membership_orders"."provider_request_count" = 1 AND "workspace_membership_orders"."provider_create_started_at" IS NOT NULL)) AND (("workspace_membership_orders"."provider_order_id" IS NULL AND "workspace_membership_orders"."provider_order_created_at" IS NULL) OR ("workspace_membership_orders"."provider_order_id" IS NOT NULL AND "workspace_membership_orders"."provider_order_created_at" IS NOT NULL AND "workspace_membership_orders"."provider_order_id" ~ '^order_[A-Za-z0-9]{6,80}$')) AND ("workspace_membership_orders"."provider_setup_state" <> 'ready' OR "workspace_membership_orders"."provider_order_id" IS NOT NULL) AND (("workspace_membership_orders"."financial_state" = 'unpaid' AND "workspace_membership_orders"."winning_payment_id" IS NULL AND "workspace_membership_orders"."paid_at" IS NULL AND "workspace_membership_orders"."refund_eligible_until" IS NULL) OR ("workspace_membership_orders"."financial_state" = 'captured' AND "workspace_membership_orders"."winning_payment_id" IS NOT NULL AND (("workspace_membership_orders"."paid_at" IS NOT NULL AND "workspace_membership_orders"."refund_eligible_until" IS NOT NULL AND "workspace_membership_orders"."refund_eligible_until" = "workspace_membership_orders"."paid_at" + interval '72 hours') OR ("workspace_membership_orders"."paid_at" IS NULL AND "workspace_membership_orders"."refund_eligible_until" IS NULL AND "workspace_membership_orders"."activation_state" = 'held_for_review')))) AND ("workspace_membership_orders"."activation_state" <> 'held_for_review' OR "workspace_membership_orders"."review_reason" IS NOT NULL) AND ("workspace_membership_orders"."provider_setup_state" <> 'closed' OR ("workspace_membership_orders"."closed_at" IS NOT NULL AND "workspace_membership_orders"."close_reason" IS NOT NULL AND "workspace_membership_orders"."close_reason" IN ('never_submitted','provider_definitive_rejection'))));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION workspace_phase15_order_guard() RETURNS trigger LANGUAGE plpgsql AS $$
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
    IF (to_jsonb(NEW)-ARRAY['provider_setup_state','provider_create_started_at','provider_request_count','provider_order_id','provider_order_created_at','provider_recovery_checked_at','provider_recovery_reason','provider_create_failure_hash','financial_state','activation_state','winning_payment_id','paid_at','refund_eligible_until','review_reason','closed_at','close_reason','version','fulfilled_at']) IS DISTINCT FROM
       (to_jsonb(OLD)-ARRAY['provider_setup_state','provider_create_started_at','provider_request_count','provider_order_id','provider_order_created_at','provider_recovery_checked_at','provider_recovery_reason','provider_create_failure_hash','financial_state','activation_state','winning_payment_id','paid_at','refund_eligible_until','review_reason','closed_at','close_reason','version','fulfilled_at'])
       OR (OLD.fulfilled_at IS NOT NULL AND (NEW.fulfilled_at IS DISTINCT FROM OLD.fulfilled_at OR NEW.activation_state NOT IN ('fulfilled','held_for_review')))
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
-- Completion markers can survive a later financial review, but never become a fresh pending activation.
ALTER TABLE workspace_membership_orders ADD CONSTRAINT workspace_orders_fulfillment_check CHECK (
 (fulfilled_at IS NULL AND activation_state <> 'fulfilled') OR
 (fulfilled_at IS NOT NULL AND activation_state IN ('fulfilled','held_for_review') AND financial_state='captured'
  AND paid_at IS NOT NULL AND refund_eligible_until=paid_at+interval '72 hours' AND fulfilled_at>=paid_at));
--> statement-breakpoint
CREATE FUNCTION workspace_phase15b_profile_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Creator identity history cannot be deleted' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
   PERFORM id FROM users WHERE id=NEW.user_id FOR UPDATE;
   IF NEW.status<>'enabled' THEN RAISE EXCEPTION 'New creator must be enabled by fulfillment' USING ERRCODE='23514'; END IF;
 ELSIF (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') OR
   (OLD.status='terminated' AND NEW.status<>'terminated') OR (OLD.status='suspended' AND NEW.status='enabled') THEN
   RAISE EXCEPTION 'Creator identity is immutable; fulfillment cannot re-enable a profile' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_creator_profiles_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_creator_profiles FOR EACH ROW EXECUTE FUNCTION workspace_phase15b_profile_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_phase15b_membership_guard() RETURNS trigger LANGUAGE plpgsql AS $$
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
   OR p.id IS NULL OR p.state<>'captured' OR p.refunded_paise<>0 OR p.capture_time_source IS DISTINCT FROM 'test_authoritative'
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
--> statement-breakpoint
CREATE TRIGGER workspace_memberships_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_memberships FOR EACH ROW EXECUTE FUNCTION workspace_phase15b_membership_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_phase15b_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o workspace_membership_orders; m workspace_memberships;
BEGIN
 IF TG_TABLE_NAME='workspace_creator_profiles' THEN
   IF NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE creator_profile_id=NEW.id AND user_id=NEW.user_id AND fulfilled_at=NEW.created_at) THEN
     RAISE EXCEPTION 'Creator identity must commit with paid membership fulfillment' USING ERRCODE='23514';
   END IF;
   RETURN NULL;
 END IF;
 IF TG_TABLE_NAME='workspace_membership_orders' THEN SELECT * INTO o FROM workspace_membership_orders WHERE id=NEW.id;
 ELSE SELECT * INTO o FROM workspace_membership_orders WHERE id=NEW.membership_order_id; END IF;
 SELECT * INTO m FROM workspace_memberships WHERE membership_order_id=o.id;
 IF (o.fulfilled_at IS NULL AND m.id IS NOT NULL) OR (o.fulfilled_at IS NOT NULL AND
   (m.id IS NULL OR m.fulfilled_at IS DISTINCT FROM o.fulfilled_at OR m.user_id<>o.user_id OR m.paid_at IS DISTINCT FROM o.paid_at OR m.plan_version_id<>o.plan_version_id OR m.duration_months<>o.duration_months)) THEN
   RAISE EXCEPTION 'Order and immutable membership fulfillment must commit together' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END; $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workspace_creator_profile_complete AFTER INSERT ON workspace_creator_profiles DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_phase15b_complete();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workspace_membership_complete AFTER INSERT ON workspace_memberships DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_phase15b_complete();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workspace_order_activation_complete AFTER INSERT OR UPDATE ON workspace_membership_orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_phase15b_complete();
