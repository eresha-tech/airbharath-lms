CREATE TABLE "creator_payout_inbox" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"hash" text NOT NULL,
	"provider_id" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"lease_token" uuid,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_payout_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"funding_fingerprint" text NOT NULL,
	"transfer_mode" text NOT NULL,
	"idempotency_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"authorized_by" uuid,
	"stage" text DEFAULT 'awaiting_authorization' NOT NULL,
	"contact_id" text,
	"fund_account_id" text,
	"request_encrypted" text,
	"request_hash" text,
	"provider_id" text,
	"provider_status" text,
	"provider_fees_paise" integer,
	"provider_tax_paise" integer,
	"reason" text,
	"utr" text,
	"submit_attempts" integer DEFAULT 0 NOT NULL,
	"first_submitted_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"lease_token" uuid,
	"last_error" text,
	"scan_skip" integer DEFAULT 0 NOT NULL,
	"last_reconciled_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"reversed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_payout_jobs_payout_id_unique" UNIQUE("payout_id"),
	CONSTRAINT "creator_payout_jobs_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "creator_payout_jobs_provider_id_unique" UNIQUE("provider_id"),
	CONSTRAINT "creator_payout_job_stage" CHECK ("creator_payout_jobs"."stage" in ('awaiting_authorization','ready','tracking','blocked','done') and "creator_payout_jobs"."submit_attempts">=0 and "creator_payout_jobs"."attempts">=0 and "creator_payout_jobs"."scan_skip">=0)
);
--> statement-breakpoint
CREATE TABLE "creator_payout_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"fact" jsonb NOT NULL,
	"hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_payout_observation_identity" UNIQUE("job_id","source","hash"),
	CONSTRAINT "creator_payout_observation_source" CHECK ("creator_payout_observations"."source" in ('create','reconcile'))
);
--> statement-breakpoint
ALTER TABLE "creator_payout_jobs" ADD CONSTRAINT "creator_payout_jobs_payout_id_creator_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."creator_payouts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_payout_jobs" ADD CONSTRAINT "creator_payout_jobs_authorized_by_users_id_fk" FOREIGN KEY ("authorized_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_payout_observations" ADD CONSTRAINT "creator_payout_observations_job_id_creator_payout_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."creator_payout_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creator_payout_inbox_due" ON "creator_payout_inbox" USING btree ("state","next_at");--> statement-breakpoint
CREATE INDEX "creator_payout_job_due" ON "creator_payout_jobs" USING btree ("stage","next_at");
--> statement-breakpoint
-- Preserve the old manual audit model for historical payouts. Provider payouts
-- may project state only from their bound durable operation and evidence.
CREATE FUNCTION creator_payout_job_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p creator_payouts;
BEGIN
 SELECT * INTO p FROM creator_payouts WHERE id=NEW.payout_id;
 PERFORM 1 FROM users WHERE id=p.creator_id FOR UPDATE;
 IF NEW.scope<>p.scope||':'||NEW.funding_fingerprint OR NEW.funding_fingerprint !~ '^[a-f0-9]{64}$' OR NEW.transfer_mode NOT IN ('NEFT','IMPS') THEN RAISE EXCEPTION 'bound payout funding scope required'; END IF;
 IF TG_OP='INSERT' THEN
  IF p.state<>'approved' OR p.created_at<>now() OR NEW.authorized_by IS NOT NULL OR NEW.stage<>'awaiting_authorization' OR NEW.submit_attempts<>0 OR NEW.provider_id IS NOT NULL OR NEW.request_encrypted IS NOT NULL THEN RAISE EXCEPTION 'new approved payout operation required'; END IF;
 ELSE
  IF (NEW.id,NEW.payout_id,NEW.scope,NEW.funding_fingerprint,NEW.transfer_mode,NEW.idempotency_key,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.payout_id,OLD.scope,OLD.funding_fingerprint,OLD.transfer_mode,OLD.idempotency_key,OLD.created_at) OR NEW.attempts<OLD.attempts OR NEW.submit_attempts<OLD.submit_attempts THEN RAISE EXCEPTION 'immutable payout operation intent'; END IF;
  IF OLD.authorized_by IS NOT NULL AND NEW.authorized_by IS DISTINCT FROM OLD.authorized_by OR OLD.contact_id IS NOT NULL AND NEW.contact_id IS DISTINCT FROM OLD.contact_id OR OLD.fund_account_id IS NOT NULL AND NEW.fund_account_id IS DISTINCT FROM OLD.fund_account_id OR OLD.request_encrypted IS NOT NULL AND (NEW.request_encrypted,NEW.request_hash) IS DISTINCT FROM (OLD.request_encrypted,OLD.request_hash) OR OLD.provider_id IS NOT NULL AND NEW.provider_id IS DISTINCT FROM OLD.provider_id OR OLD.first_submitted_at IS NOT NULL AND NEW.first_submitted_at IS DISTINCT FROM OLD.first_submitted_at THEN RAISE EXCEPTION 'provider identities and request cannot change'; END IF;
  IF OLD.stage='done' AND OLD.provider_status IS DISTINCT FROM 'processed' AND NEW.stage<>'done' THEN RAISE EXCEPTION 'terminal operation cannot reopen'; END IF;
  IF OLD.provider_status='processed' AND coalesce(NEW.provider_status,'') NOT IN ('processed','reversed','failed') OR OLD.provider_status IN ('failed','rejected','cancelled','request_rejected') AND NEW.provider_status IS DISTINCT FROM OLD.provider_status OR OLD.provider_status='reversed' AND coalesce(NEW.provider_status,'') NOT IN ('reversed','failed') OR OLD.processed_at IS NOT NULL AND NEW.processed_at IS DISTINCT FROM OLD.processed_at OR OLD.reversed_at IS NOT NULL AND NEW.reversed_at IS DISTINCT FROM OLD.reversed_at THEN RAISE EXCEPTION 'provider terminal history cannot regress'; END IF;
 END IF;
 IF NEW.authorized_by IS NOT NULL AND (NEW.authorized_by IN (p.creator_id,p.approved_by) OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.authorized_by AND role='admin')) AND (TG_OP='INSERT' OR OLD.authorized_by IS NULL) THEN RAISE EXCEPTION 'second persisted Admin authorization required'; END IF;
 IF TG_OP='UPDATE' AND NEW.submit_attempts>OLD.submit_attempts AND OLD.submit_attempts=0 AND NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.authorized_by AND role='admin') THEN RAISE EXCEPTION 'payout authorizer no longer has Admin authority'; END IF;
 IF (NEW.request_encrypted IS NULL) IS DISTINCT FROM (NEW.request_hash IS NULL) OR NEW.request_hash IS NOT NULL AND NEW.request_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'complete immutable encrypted request required'; END IF;
 IF NEW.submit_attempts>0 AND (NEW.authorized_by IS NULL OR NEW.request_encrypted IS NULL OR NEW.request_hash IS NULL OR NEW.fund_account_id IS NULL OR NEW.first_submitted_at IS NULL) THEN RAISE EXCEPTION 'persisted request and independent authorization required before submission'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER creator_payout_job_guard BEFORE INSERT OR UPDATE ON creator_payout_jobs FOR EACH ROW EXECUTE FUNCTION creator_payout_job_guard();
CREATE TRIGGER creator_payout_job_no_delete BEFORE DELETE ON creator_payout_jobs FOR EACH ROW EXECUTE FUNCTION creator_money_immutable();
CREATE TRIGGER creator_payout_job_no_truncate BEFORE TRUNCATE ON creator_payout_jobs FOR EACH STATEMENT EXECUTE FUNCTION creator_money_immutable();
CREATE TRIGGER creator_payout_observation_immutable BEFORE UPDATE OR DELETE ON creator_payout_observations FOR EACH ROW EXECUTE FUNCTION creator_money_immutable();
CREATE TRIGGER creator_payout_observation_no_truncate BEFORE TRUNCATE ON creator_payout_observations FOR EACH STATEMENT EXECUTE FUNCTION creator_money_immutable();
--> statement-breakpoint
CREATE FUNCTION creator_payout_job_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p creator_payouts;
BEGIN
 SELECT * INTO p FROM creator_payouts WHERE id=NEW.payout_id;
 IF NEW.authorized_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM creator_finance_events WHERE entity_id=p.id AND creator_id=p.creator_id AND actor_id=NEW.authorized_by AND action='authorize_razorpayx') THEN RAISE EXCEPTION 'independent payout authorization audit required'; END IF;
 IF NEW.provider_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM creator_payout_observations WHERE job_id=NEW.id AND provider_id=NEW.provider_id) THEN RAISE EXCEPTION 'bound provider identity evidence required'; END IF;
 IF NEW.provider_status IS NOT NULL AND NOT EXISTS(SELECT 1 FROM creator_payout_observations o WHERE o.job_id=NEW.id AND o.status=NEW.provider_status AND (o.source='reconcile' AND o.provider_id=NEW.provider_id OR NEW.provider_status='request_rejected' AND o.source='create' AND NEW.submit_attempts=1 AND NEW.provider_id IS NULL)) THEN RAISE EXCEPTION 'independently reconciled provider evidence required'; END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER creator_payout_job_proof AFTER INSERT OR UPDATE ON creator_payout_jobs DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION creator_payout_job_proof();
--> statement-breakpoint
CREATE FUNCTION creator_payout_observation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE j creator_payout_jobs; p creator_payouts;
BEGIN
 SELECT * INTO j FROM creator_payout_jobs WHERE id=NEW.job_id;
 SELECT * INTO p FROM creator_payouts WHERE id=j.payout_id;
 IF NEW.status='request_rejected' THEN
  IF NEW.source<>'create' OR j.submit_attempts<>1 OR j.provider_id IS NOT NULL OR (NEW.fact->>'httpStatus')::int NOT IN (400,401,403) THEN RAISE EXCEPTION 'definitive first-request rejection required'; END IF;
 ELSE
  IF NEW.provider_id !~ '^pout_[A-Za-z0-9]{6,80}$' OR NEW.fact->>'id' IS DISTINCT FROM NEW.provider_id OR (NEW.fact->>'amount')::bigint IS DISTINCT FROM p.amount_paise OR NEW.fact->>'reference' IS DISTINCT FROM p.id::text OR NEW.fact->>'fundAccountId' IS DISTINCT FROM j.fund_account_id OR NEW.fact->>'mode' IS DISTINCT FROM j.transfer_mode OR NEW.fact->>'status' IS DISTINCT FROM NEW.status OR NEW.status NOT IN ('queued','pending','scheduled','processing','processed','failed','reversed','rejected','cancelled') THEN RAISE EXCEPTION 'payout evidence must match the immutable request'; END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER creator_payout_observation_guard BEFORE INSERT ON creator_payout_observations FOR EACH ROW EXECUTE FUNCTION creator_payout_observation_guard();

--> statement-breakpoint
CREATE OR REPLACE FUNCTION creator_payout_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v creator_finance_events; net bigint; matured bigint; reserved bigint; p creator_payees; cutoff timestamptz; j creator_payout_jobs; expected text;
BEGIN
 PERFORM 1 FROM users WHERE id=NEW.creator_id FOR UPDATE;
 SELECT * INTO j FROM creator_payout_jobs WHERE payout_id=NEW.id;
 IF TG_OP='UPDATE' AND j.id IS NOT NULL THEN
  IF (NEW.id,NEW.creator_id,NEW.payee_id,NEW.scope,NEW.amount_paise,NEW.period_end,NEW.approved_by,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.creator_id,OLD.payee_id,OLD.scope,OLD.amount_paise,OLD.period_end,OLD.approved_by,OLD.created_at) THEN RAISE EXCEPTION 'payout identity immutable'; END IF;
  IF NEW.state='cancelled' AND OLD.state='approved' AND j.submit_attempts=0 THEN RETURN NEW; END IF;
  expected:=CASE j.provider_status WHEN 'processed' THEN 'confirmed' WHEN 'failed' THEN 'failed' WHEN 'reversed' THEN 'failed' WHEN 'rejected' THEN 'failed' WHEN 'cancelled' THEN 'failed' WHEN 'request_rejected' THEN 'failed' WHEN 'processing' THEN 'initiated' ELSE 'uncertain' END;
  IF j.authorized_by IS NULL OR j.submit_attempts=0 OR NEW.state<>expected OR NEW.initiated_by IS DISTINCT FROM j.authorized_by OR OLD.state IN ('failed','cancelled') OR OLD.state='confirmed' AND NEW.state NOT IN ('confirmed','failed') OR NEW.bank_reference IS DISTINCT FROM coalesce(j.utr,OLD.bank_reference) THEN RAISE EXCEPTION 'provider payout transition needs bound evidence'; END IF;
  RETURN NEW;
 END IF;
 IF TG_OP='INSERT' THEN
  cutoff:=date_trunc('month',now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
  SELECT * INTO p FROM creator_payees WHERE id=NEW.payee_id;
  SELECT * INTO v FROM creator_finance_events WHERE entity_id=NEW.payee_id AND action IN ('verify_payee','reject_payee') ORDER BY created_at DESC,id DESC LIMIT 1;
  IF p.creator_id IS DISTINCT FROM NEW.creator_id OR v.action IS DISTINCT FROM 'verify_payee' OR NEW.state<>'approved' OR NEW.period_end<>cutoff OR NEW.bank_reference IS NOT NULL OR NEW.initiated_by IS NOT NULL OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.approved_by AND role='admin') THEN RAISE EXCEPTION 'verified monthly bank payee required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM course_finance_runs WHERE scope=NEW.scope AND disputes_checked_at>now()-interval '24 hours') OR EXISTS(SELECT 1 FROM course_payment_checks c JOIN orders o ON o.id=c.order_id WHERE o.creator_id=NEW.creator_id AND o.status IN ('paid','refunded','chargeback') AND (c.scope<>NEW.scope OR c.issue IS NOT NULL OR c.last_checked_at IS NULL OR c.last_checked_at<now()-interval '24 hours')) OR EXISTS(SELECT 1 FROM course_payment_inbox WHERE scope=NEW.scope AND state='pending') THEN RAISE EXCEPTION 'current reconciled payment and dispute evidence required'; END IF;
  SELECT coalesce(sum(b.net),0),coalesce(sum(CASE WHEN b.ordered_at<cutoff THEN b.net ELSE least(b.net,0) END),0) INTO net,matured FROM (SELECT o.created_at AS ordered_at,sum(l.net_paise) AS net FROM creator_ledger l JOIN orders o ON o.id=l.order_id WHERE l.creator_id=NEW.creator_id AND l.scope=NEW.scope GROUP BY o.id) b;
  SELECT coalesce(sum(amount_paise),0) INTO reserved FROM creator_payouts WHERE creator_id=NEW.creator_id AND scope=NEW.scope AND state NOT IN ('failed','cancelled');
  IF NEW.amount_paise>least(net,matured)-reserved THEN RAISE EXCEPTION 'insufficient reconciled available proceeds'; END IF;
 ELSE
  IF (NEW.id,NEW.creator_id,NEW.payee_id,NEW.scope,NEW.amount_paise,NEW.period_end,NEW.approved_by,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.creator_id,OLD.payee_id,OLD.scope,OLD.amount_paise,OLD.period_end,OLD.approved_by,OLD.created_at) THEN RAISE EXCEPTION 'payout identity immutable'; END IF;
  IF NOT (OLD.state='approved' AND NEW.state IN ('initiated','uncertain','cancelled') OR OLD.state='initiated' AND NEW.state IN ('uncertain','confirmed','failed') OR OLD.state='uncertain' AND NEW.state IN ('confirmed','failed')) THEN RAISE EXCEPTION 'invalid payout transition'; END IF;
  IF OLD.state<>'approved' AND (NEW.bank_reference,NEW.initiated_by) IS DISTINCT FROM (OLD.bank_reference,OLD.initiated_by) AND NOT (OLD.state='uncertain' AND OLD.bank_reference IS NULL AND NEW.state='confirmed' AND NEW.bank_reference IS NOT NULL AND NEW.initiated_by IS NOT DISTINCT FROM OLD.initiated_by) THEN RAISE EXCEPTION 'bank initiation identity immutable'; END IF;
 END IF;
 RETURN NEW;
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION creator_payout_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e creator_finance_events; expected_action text; j creator_payout_jobs;
BEGIN
 SELECT * INTO j FROM creator_payout_jobs WHERE payout_id=NEW.id;
 IF j.id IS NOT NULL AND NEW.state<>'approved' THEN
  IF NEW.state='cancelled' AND j.submit_attempts=0 AND EXISTS(SELECT 1 FROM creator_finance_events WHERE entity_id=NEW.id AND creator_id=NEW.creator_id AND action='cancel_payout') THEN RETURN NULL; END IF;
  IF j.authorized_by IS NULL OR NEW.initiated_by IS DISTINCT FROM j.authorized_by OR j.authorized_by=NEW.approved_by THEN RAISE EXCEPTION 'independent provider execution authorization required'; END IF;
  IF NEW.state IN ('confirmed','failed','initiated') AND NOT EXISTS(SELECT 1 FROM creator_payout_observations o WHERE o.job_id=j.id AND o.status=j.provider_status AND (o.source='reconcile' AND o.provider_id=j.provider_id OR j.provider_status='request_rejected' AND o.source='create' AND j.submit_attempts=1)) THEN RAISE EXCEPTION 'provider reconciliation required for bank status'; END IF;
  RETURN NULL;
 END IF;
 expected_action:=CASE NEW.state WHEN 'approved' THEN 'approve_payout' WHEN 'initiated' THEN 'initiate_payout' WHEN 'uncertain' THEN 'uncertain_payout' WHEN 'confirmed' THEN 'confirm_payout' WHEN 'failed' THEN 'fail_payout' WHEN 'cancelled' THEN 'cancel_payout' END;
 SELECT * INTO e FROM creator_finance_events WHERE entity_id=NEW.id AND action=expected_action ORDER BY created_at DESC,id DESC LIMIT 1;
 IF NEW.state='uncertain' AND TG_OP='UPDATE' AND OLD.state='approved' AND (NEW.initiated_by IS DISTINCT FROM e.actor_id OR NEW.initiated_by=NEW.approved_by) THEN RAISE EXCEPTION 'independent uncertain bank execution required'; END IF;
 IF e.id IS NULL OR e.creator_id<>NEW.creator_id OR NEW.state='approved' AND e.actor_id<>NEW.approved_by OR NEW.state='initiated' AND (e.actor_id<>NEW.initiated_by OR NEW.initiated_by=NEW.approved_by OR NEW.bank_reference IS NULL) OR NEW.state IN ('confirmed','failed') AND e.actor_id=NEW.initiated_by THEN RAISE EXCEPTION 'independent bank settlement audit required'; END IF;
 RETURN NULL;
END $$;

--> statement-breakpoint
CREATE FUNCTION creator_payout_inbox_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'durable payout inbox retained'; END IF;
 IF (NEW.id,NEW.scope,NEW.hash,NEW.provider_id,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.scope,OLD.hash,OLD.provider_id,OLD.created_at) OR NEW.attempts<OLD.attempts OR NEW.state NOT IN ('pending','done') OR OLD.state='done' AND NEW.state<>'done' THEN RAISE EXCEPTION 'immutable payout webhook identity'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER creator_payout_inbox_guard BEFORE UPDATE OR DELETE ON creator_payout_inbox FOR EACH ROW EXECUTE FUNCTION creator_payout_inbox_guard();
CREATE TRIGGER creator_payout_inbox_no_truncate BEFORE TRUNCATE ON creator_payout_inbox FOR EACH STATEMENT EXECUTE FUNCTION creator_money_immutable();
