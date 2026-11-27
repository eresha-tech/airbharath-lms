CREATE TABLE "creator_bank_inbox" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"hash" text NOT NULL,
	"provider_id" text NOT NULL,
	"request_id" uuid,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_bank_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"validation_id" uuid NOT NULL,
	"source" text NOT NULL,
	"provider_id" text NOT NULL,
	"fact" jsonb NOT NULL,
	"hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_bank_observation_identity" UNIQUE("validation_id","source","hash"),
	CONSTRAINT "creator_bank_observation_source" CHECK ("creator_bank_observations"."source" IN ('create','reconcile') AND "creator_bank_observations"."hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "creator_bank_validations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payee_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"mode" text NOT NULL,
	"method" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"policy" text DEFAULT 'mandatory-fav-v1' NOT NULL,
	"requested_by" uuid NOT NULL,
	"request_key" uuid NOT NULL,
	"contact_id" text,
	"fund_account_id" text,
	"provider_id" text,
	"state" text DEFAULT 'prepared' NOT NULL,
	"account_status" text DEFAULT 'unknown' NOT NULL,
	"name_decision" text DEFAULT 'missing' NOT NULL,
	"submit_count" integer DEFAULT 0 NOT NULL,
	"submitted_at" timestamp with time zone,
	"recovery_round" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"scan_skip" integer DEFAULT 0 NOT NULL,
	"next_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"lease_token" uuid,
	"last_error" text,
	"checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_bank_validations_request_key_unique" UNIQUE("request_key"),
	CONSTRAINT "creator_bank_validations_provider_id_unique" UNIQUE("provider_id"),
	CONSTRAINT "creator_bank_validation_version_scope" UNIQUE("payee_id","scope"),
	CONSTRAINT "creator_bank_validation_state" CHECK ("creator_bank_validations"."mode" IN ('synthetic','live') AND "creator_bank_validations"."method"='pennydrop' AND "creator_bank_validations"."policy"='mandatory-fav-v1' AND "creator_bank_validations"."amount_paise">0 AND "creator_bank_validations"."amount_paise"<=10000 AND "creator_bank_validations"."submit_count" BETWEEN 0 AND 1 AND "creator_bank_validations"."recovery_round" BETWEEN 0 AND 3 AND "creator_bank_validations"."attempts" BETWEEN 0 AND 20 AND "creator_bank_validations"."scan_skip" BETWEEN 0 AND 10000 AND "creator_bank_validations"."state" IN ('prepared','pending','valid','invalid','review') AND "creator_bank_validations"."account_status" IN ('active','invalid','unknown') AND "creator_bank_validations"."name_decision" IN ('match','review','mismatch','missing'))
);
--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" DROP CONSTRAINT "workspace_orders_context_check";--> statement-breakpoint
ALTER TABLE "creator_bank_observations" ADD CONSTRAINT "creator_bank_observations_validation_id_creator_bank_validations_id_fk" FOREIGN KEY ("validation_id") REFERENCES "public"."creator_bank_validations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_bank_validations" ADD CONSTRAINT "creator_bank_validations_payee_id_creator_payees_id_fk" FOREIGN KEY ("payee_id") REFERENCES "public"."creator_payees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_bank_validations" ADD CONSTRAINT "creator_bank_validations_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creator_bank_inbox_pending" ON "creator_bank_inbox" USING btree ("scope","created_at") WHERE "creator_bank_inbox"."processed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "creator_bank_validation_due" ON "creator_bank_validations" USING btree ("scope","state","next_at");--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD CONSTRAINT "workspace_orders_context_check" CHECK ("workspace_membership_orders"."purchase_kind" IN ('initial','renewal') AND "workspace_membership_orders"."provider" = 'razorpay' AND (("workspace_membership_orders"."provider_mode" = 'test' AND "workspace_membership_orders"."commercial_policy_version" = 'workspace-test-noncommercial-v1') OR ("workspace_membership_orders"."provider_mode" = 'live' AND "workspace_membership_orders"."commercial_policy_version" = 'workspace-live-commercial-v1')) AND "workspace_membership_orders"."quote_hash" ~ '^[a-f0-9]{64}$' AND "workspace_membership_orders"."context_hash" ~ '^[a-f0-9]{64}$' AND "workspace_membership_orders"."request_payload_hash" ~ '^[a-f0-9]{64}$' AND "workspace_membership_orders"."provider_receipt" ~ '^wso[a-f0-9]{32}$' AND length("workspace_membership_orders"."provider_account_id") BETWEEN 1 AND 100 AND "workspace_membership_orders"."version" > 0 AND (("workspace_membership_orders"."coupon_id" IS NULL AND "workspace_membership_orders"."coupon_code" IS NULL AND "workspace_membership_orders"."coupon_snapshot" IS NULL AND "workspace_membership_orders"."discount_paise" = 0) OR ("workspace_membership_orders"."coupon_id" IS NOT NULL AND "workspace_membership_orders"."coupon_code" IS NOT NULL AND "workspace_membership_orders"."coupon_snapshot" IS NOT NULL AND "workspace_membership_orders"."discount_paise" > 0)));
--> statement-breakpoint
DROP INDEX workspace_orders_unresolved_user_idx;
--> statement-breakpoint
CREATE UNIQUE INDEX workspace_orders_unresolved_user_idx ON workspace_membership_orders(user_id) WHERE activation_state<>'fulfilled' AND (provider_setup_state<>'closed' OR financial_state='captured');
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
      OR NEW.quote_version<>'workspace-pricing-v1' OR NEW.pricing_rule_version<>'workspace-pricing-v1' OR (NEW.purchase_kind='initial' AND NEW.membership_start_rule_version<>'workspace-membership-start-v1') OR (NEW.purchase_kind='renewal' AND NEW.membership_start_rule_version<>'workspace-prepaid-renewal-v1') THEN
      RAISE EXCEPTION 'Accepted settings/policy/start context mismatch' USING ERRCODE='23514';
    END IF;
    IF a.id IS NULL OR a.user_id <> NEW.user_id OR a.result <> 'eligible' OR a.eligible_until IS DISTINCT FROM NEW.eligibility_valid_until OR a.eligible_until <= NEW.created_at
      OR p.id IS NULL OR NOT p.is_current OR NOT p.available OR p.code <> NEW.plan_code OR p.base_price_paise <> NEW.base_price_paise OR p.duration_months <> NEW.duration_months
      OR NEW.plan_snapshot IS DISTINCT FROM jsonb_build_object('version',p.version,'displayName',p.display_name)
      OR NEW.provider_setup_state <> 'creating' OR NEW.provider_request_count <> 0 OR NEW.financial_state <> 'unpaid' OR NEW.activation_state <> 'pending_activation' OR NEW.version <> 1 THEN
      RAISE EXCEPTION 'Accepted order owner/context/state mismatch' USING ERRCODE='23514';
    END IF;
    IF (NEW.purchase_kind='renewal') IS DISTINCT FROM EXISTS(SELECT 1 FROM workspace_memberships WHERE user_id=NEW.user_id) THEN RAISE EXCEPTION 'Purchase kind requires matching immutable paid history' USING ERRCODE='23514'; END IF;
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
   OR o.launch_at IS DISTINCT FROM '2026-11-08T18:30:00.000Z'::timestamptz OR o.membership_start_rule_version<>(CASE WHEN o.purchase_kind='renewal' THEN 'workspace-prepaid-renewal-v1' ELSE 'workspace-membership-start-v1' END)
   OR o.membership_start_rule IS DISTINCT FROM (CASE WHEN o.purchase_kind='renewal' THEN 'The prepaid term starts at the later of verified payment capture, launch, and the end of all unrefunded paid terms in this payment scope. Complimentary grants do not extend or shorten paid terms. Calendar months use Asia/Kolkata; end instants are exclusive.' ELSE 'If payment is completed before 9 November 2026 at 00:00 IST, your paid membership term starts at launch. If payment is completed on or after launch, your membership starts on the successful payment date.' END)
   OR NOT ((o.provider_mode='test' AND o.commercial_policy_version='workspace-test-noncommercial-v1') OR (o.provider_mode='live' AND o.commercial_policy_version='workspace-live-commercial-v1'))
   OR (o.provider_mode='live' AND p.capture_time_source IS DISTINCT FROM 'razorpay_payment_captured_event_v1')
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
 IF o.purchase_kind='renewal' THEN
  SELECT greatest(expected_start,coalesce(max(m.ends_at),expected_start)) INTO expected_start FROM workspace_memberships m JOIN workspace_membership_orders prior ON prior.id=m.membership_order_id LEFT JOIN workspace_refund_completions r ON r.membership_order_id=prior.id WHERE m.user_id=NEW.user_id AND prior.provider_mode=o.provider_mode AND prior.provider_account_id=o.provider_account_id AND prior.activation_state='fulfilled' AND r.id IS NULL;
 END IF;
 expected_end := ((expected_start AT TIME ZONE 'Asia/Kolkata') + make_interval(months=>o.duration_months)) AT TIME ZONE 'Asia/Kolkata';
 IF NEW.starts_at IS DISTINCT FROM expected_start OR NEW.ends_at IS DISTINCT FROM expected_end OR
    (o.purchase_kind='initial' AND EXISTS(SELECT 1 FROM workspace_memberships WHERE user_id=NEW.user_id AND (ends_at>NEW.fulfilled_at OR (starts_at<NEW.ends_at AND NEW.starts_at<ends_at)))) THEN
   RAISE EXCEPTION 'Membership term mismatch or overlapping initial membership' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
--> statement-breakpoint
-- Keep original payee/payout/ledger guards. These additional guards require FAV evidence for automatic dispatch.
CREATE FUNCTION creator_bank_eligible(payee uuid, funding_scope text, expected_fund text DEFAULT NULL) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM creator_bank_validations v WHERE v.payee_id=payee AND v.scope=funding_scope
  AND ((v.mode='live' AND funding_scope LIKE 'live:%') OR (v.mode='synthetic' AND funding_scope LIKE 'test:%'))
  AND v.state IN ('valid','review') AND v.account_status='active' AND v.checked_at IS NOT NULL AND v.provider_id IS NOT NULL
  AND v.contact_id IS NOT NULL AND v.fund_account_id IS NOT NULL AND (expected_fund IS NULL OR expected_fund=v.fund_account_id)
  AND EXISTS(SELECT 1 FROM creator_bank_observations o WHERE o.validation_id=v.id AND o.source='reconcile' AND o.provider_id=v.provider_id AND o.fact->>'transactionStatus'='completed' AND o.fact->>'accountStatus'='active')
  AND ((v.state='valid' AND v.name_decision='match') OR (v.state='review' AND v.name_decision IN ('review','missing')
   AND EXISTS(SELECT 1 FROM creator_finance_events e WHERE e.entity_id=v.id AND e.action='accept_bank_name'))));
$$;
--> statement-breakpoint
CREATE FUNCTION creator_bank_validation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner uuid;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Bank validation history is retained' USING ERRCODE='23514'; END IF;
 SELECT creator_id INTO owner FROM creator_payees WHERE id=NEW.payee_id;
 PERFORM id FROM users WHERE id=owner FOR UPDATE;
 IF TG_OP='INSERT' THEN
  IF NEW.requested_by=owner OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.requested_by AND role='admin') OR NEW.state<>'prepared' OR NEW.submit_count<>0 OR NEW.submitted_at IS NOT NULL OR NEW.recovery_round<>0 OR NEW.attempts<>0 OR NEW.provider_id IS NOT NULL OR NEW.contact_id IS NOT NULL OR NEW.fund_account_id IS NOT NULL OR NEW.checked_at IS NOT NULL OR NEW.account_status<>'unknown' OR NEW.name_decision<>'missing'
   OR NOT ((NEW.mode='live' AND NEW.scope LIKE 'live:%') OR (NEW.mode='synthetic' AND NEW.scope LIKE 'test:%')) THEN RAISE EXCEPTION 'Independent configured bank validation intent required' USING ERRCODE='23514'; END IF;
 ELSE
  IF (to_jsonb(NEW)-ARRAY['contact_id','fund_account_id','provider_id','state','account_status','name_decision','submit_count','submitted_at','recovery_round','attempts','scan_skip','next_at','lease_until','lease_token','last_error','checked_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['contact_id','fund_account_id','provider_id','state','account_status','name_decision','submit_count','submitted_at','recovery_round','attempts','scan_skip','next_at','lease_until','lease_token','last_error','checked_at'])
   OR (OLD.submitted_at IS NOT NULL AND NEW.submitted_at IS DISTINCT FROM OLD.submitted_at) OR NEW.submit_count<OLD.submit_count OR NEW.recovery_round<OLD.recovery_round OR NEW.recovery_round>OLD.recovery_round+1 OR NEW.attempts>OLD.attempts+1
   OR ((NEW.attempts<OLD.attempts OR NEW.recovery_round<>OLD.recovery_round) AND (NEW.recovery_round<>OLD.recovery_round+1 OR NOT EXISTS(SELECT 1 FROM creator_finance_events WHERE entity_id=NEW.id AND action='reconcile_bank_validation' AND evidence::jsonb->>'round'=NEW.recovery_round::text)))
   OR (OLD.contact_id IS NOT NULL AND NEW.contact_id IS DISTINCT FROM OLD.contact_id) OR (OLD.fund_account_id IS NOT NULL AND NEW.fund_account_id IS DISTINCT FROM OLD.fund_account_id)
   OR (OLD.provider_id IS NOT NULL AND NEW.provider_id IS DISTINCT FROM OLD.provider_id)
   OR (OLD.state='invalid' AND (NEW.state<>'invalid' OR NEW.account_status<>'invalid')) THEN RAISE EXCEPTION 'Immutable bank intent or invalid account evidence cannot be replaced' USING ERRCODE='23514'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND NEW.submit_count>OLD.submit_count AND NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.requested_by AND role='admin') THEN RAISE EXCEPTION 'Validation authorization was revoked' USING ERRCODE='23514'; END IF;
 IF NEW.submit_count=1 AND (NEW.submitted_at IS NULL OR NEW.contact_id IS NULL OR NEW.fund_account_id IS NULL) THEN RAISE EXCEPTION 'Validation must bind the original beneficiary before submission' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER creator_bank_validation_guard BEFORE INSERT OR UPDATE OR DELETE ON creator_bank_validations FOR EACH ROW EXECUTE FUNCTION creator_bank_validation_guard();
--> statement-breakpoint
CREATE FUNCTION creator_bank_validation_proof() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.state IN ('valid','invalid','review') AND NEW.checked_at IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM creator_bank_observations o WHERE o.validation_id=NEW.id AND o.source='reconcile' AND o.provider_id=NEW.provider_id
   AND o.fact->>'accountStatus'=NEW.account_status AND o.fact->>'nameDecision'=NEW.name_decision
   AND (NEW.state='review' OR o.fact->>'state'=NEW.state)) THEN RAISE EXCEPTION 'Bank result requires exact authoritative observation' USING ERRCODE='23514'; END IF;
 IF NEW.state='valid' AND (NEW.account_status<>'active' OR NEW.name_decision<>'match' OR NEW.checked_at IS NULL OR NEW.provider_id IS NULL OR NEW.submit_count<>1) THEN RAISE EXCEPTION 'Completed transaction alone is not ownership proof' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER creator_bank_validation_proof AFTER INSERT OR UPDATE ON creator_bank_validations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION creator_bank_validation_proof();
--> statement-breakpoint
CREATE FUNCTION creator_bank_observation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v creator_bank_validations;
BEGIN
 SELECT * INTO v FROM creator_bank_validations WHERE id=NEW.validation_id;
 IF v.id IS NULL OR v.submit_count<>1 OR NEW.provider_id IS DISTINCT FROM v.provider_id OR NEW.fact->>'providerId' IS DISTINCT FROM NEW.provider_id OR
  NOT (NEW.fact ?& ARRAY['providerId','transactionStatus','accountStatus','nameDecision','state']) OR (SELECT count(*) FROM jsonb_object_keys(NEW.fact))<>5 THEN RAISE EXCEPTION 'Sanitized, bound provider evidence required' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER creator_bank_observation_guard BEFORE INSERT ON creator_bank_observations FOR EACH ROW EXECUTE FUNCTION creator_bank_observation_guard();
--> statement-breakpoint
CREATE TRIGGER creator_bank_observation_immutable BEFORE UPDATE OR DELETE ON creator_bank_observations FOR EACH ROW EXECUTE FUNCTION creator_money_immutable();
--> statement-breakpoint
CREATE TRIGGER creator_bank_observation_no_truncate BEFORE TRUNCATE ON creator_bank_observations FOR EACH STATEMENT EXECUTE FUNCTION creator_money_immutable();
--> statement-breakpoint
CREATE TRIGGER creator_bank_validation_no_truncate BEFORE TRUNCATE ON creator_bank_validations FOR EACH STATEMENT EXECUTE FUNCTION creator_money_immutable();
--> statement-breakpoint
CREATE FUNCTION creator_bank_name_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v creator_bank_validations;
BEGIN
 IF NEW.action='accept_bank_name' THEN
  SELECT * INTO v FROM creator_bank_validations WHERE id=NEW.entity_id;
  IF v.id IS NULL OR NEW.actor_id=v.requested_by OR v.state<>'review' OR v.account_status<>'active' OR v.name_decision NOT IN ('review','missing') OR length(btrim(NEW.evidence))<20
   OR NOT EXISTS(SELECT 1 FROM creator_payees WHERE id=v.payee_id AND creator_id=NEW.creator_id)
   OR NOT EXISTS(SELECT 1 FROM creator_bank_observations WHERE validation_id=v.id AND source='reconcile' AND fact->>'transactionStatus'='completed' AND fact->>'accountStatus'='active') THEN RAISE EXCEPTION 'Independent ownership evidence cannot override invalid or mismatched bank results' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER creator_bank_name_review_guard BEFORE INSERT ON creator_finance_events FOR EACH ROW EXECUTE FUNCTION creator_bank_name_review_guard();
--> statement-breakpoint
CREATE FUNCTION creator_payout_bank_validation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p creator_payouts; v creator_bank_validations; reviewer uuid;
BEGIN
 SELECT * INTO p FROM creator_payouts WHERE id=NEW.payout_id;
 PERFORM id FROM users WHERE id=p.creator_id FOR UPDATE;
 IF TG_OP='INSERT' OR NEW.submit_attempts>OLD.submit_attempts OR NEW.authorized_by IS DISTINCT FROM OLD.authorized_by THEN
  IF NOT creator_bank_eligible(p.payee_id,NEW.scope,NEW.fund_account_id) THEN RAISE EXCEPTION 'Automated payout requires exact validated beneficiary' USING ERRCODE='23514'; END IF;
  SELECT * INTO v FROM creator_bank_validations WHERE payee_id=p.payee_id AND scope=NEW.scope;
  SELECT actor_id INTO reviewer FROM creator_finance_events WHERE entity_id=v.id AND action='accept_bank_name' ORDER BY created_at DESC,id DESC LIMIT 1;
  IF reviewer IS NOT NULL AND reviewer=(SELECT actor_id FROM creator_finance_events WHERE entity_id=p.payee_id AND action IN ('verify_payee','reject_payee') ORDER BY created_at DESC,id DESC LIMIT 1) THEN RAISE EXCEPTION 'Independent Admin bank approval required after name review' USING ERRCODE='23514'; END IF;
 END IF;
 IF NEW.fund_account_id IS NOT NULL AND (TG_OP='INSERT' OR NEW.fund_account_id IS DISTINCT FROM OLD.fund_account_id OR NEW.submit_attempts>OLD.submit_attempts) AND NOT EXISTS(SELECT 1 FROM creator_bank_validations WHERE payee_id=p.payee_id AND scope=NEW.scope AND fund_account_id=NEW.fund_account_id AND contact_id=NEW.contact_id) THEN RAISE EXCEPTION 'Payout beneficiary must match validated immutable bank version' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER creator_payout_bank_validation_guard BEFORE INSERT OR UPDATE ON creator_payout_jobs FOR EACH ROW EXECUTE FUNCTION creator_payout_bank_validation_guard();
--> statement-breakpoint
CREATE FUNCTION creator_bank_inbox_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Signed bank inbox evidence is retained' USING ERRCODE='23514'; END IF;
 IF NEW.hash !~ '^[a-f0-9]{64}$' OR NEW.provider_id !~ '^fav_[A-Za-z0-9]{6,100}$' OR (TG_OP='UPDATE' AND ((to_jsonb(NEW)-'processed_at') IS DISTINCT FROM (to_jsonb(OLD)-'processed_at') OR (OLD.processed_at IS NOT NULL AND NEW.processed_at IS DISTINCT FROM OLD.processed_at))) THEN RAISE EXCEPTION 'Signed bank receipt identity is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER creator_bank_inbox_guard BEFORE INSERT OR UPDATE OR DELETE ON creator_bank_inbox FOR EACH ROW EXECUTE FUNCTION creator_bank_inbox_guard();
--> statement-breakpoint
CREATE TRIGGER creator_bank_inbox_no_truncate BEFORE TRUNCATE ON creator_bank_inbox FOR EACH STATEMENT EXECUTE FUNCTION creator_money_immutable();
