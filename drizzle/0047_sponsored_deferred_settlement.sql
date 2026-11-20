CREATE TABLE "creator_payout_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"source_key" text NOT NULL,
	"order_id" uuid,
	"amount_paise" integer NOT NULL,
	"financial_hash" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_payout_source_once" UNIQUE("payout_id","source_key"),
	CONSTRAINT "creator_payout_allocation_values" CHECK ("creator_payout_allocations"."amount_paise">0 AND "creator_payout_allocations"."financial_hash" ~ '^[a-f0-9]{64}$' AND (("creator_payout_allocations"."source_key"='legacy_zero_pool' AND "creator_payout_allocations"."order_id" IS NULL) OR "creator_payout_allocations"."source_key"="creator_payout_allocations"."order_id"::text))
);
--> statement-breakpoint
CREATE TABLE "creator_settlement_epoch" (
	"id" text PRIMARY KEY NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_settlement_epoch_identity" CHECK ("creator_settlement_epoch"."id"='purchase-attribution-v1')
);
--> statement-breakpoint
ALTER TABLE "creator_payout_allocations" ADD CONSTRAINT "creator_payout_allocations_payout_id_creator_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."creator_payouts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_payout_allocations" ADD CONSTRAINT "creator_payout_allocations_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_payout_allocations" ADD CONSTRAINT "creator_payout_allocations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creator_payout_allocation_source" ON "creator_payout_allocations" USING btree ("creator_id","scope","source_key");
--> statement-breakpoint
INSERT INTO creator_settlement_epoch(id) VALUES('purchase-attribution-v1');
--> statement-breakpoint
CREATE TRIGGER creator_settlement_epoch_immutable BEFORE UPDATE OR DELETE ON creator_settlement_epoch FOR EACH ROW EXECUTE FUNCTION creator_money_immutable();
CREATE TRIGGER creator_settlement_epoch_no_truncate BEFORE TRUNCATE ON creator_settlement_epoch FOR EACH STATEMENT EXECUTE FUNCTION creator_money_immutable();
CREATE TRIGGER creator_payout_allocations_immutable BEFORE UPDATE OR DELETE ON creator_payout_allocations FOR EACH ROW EXECUTE FUNCTION creator_money_immutable();
CREATE TRIGGER creator_payout_allocations_no_truncate BEFORE TRUNCATE ON creator_payout_allocations FOR EACH STATEMENT EXECUTE FUNCTION creator_money_immutable();
--> statement-breakpoint
-- Old payouts are NOT assigned invented purchase provenance. Only their old 0%
-- aggregate pool is debited. New purchases have independent source balances.
CREATE FUNCTION creator_zero_sources(who uuid,wanted text,excluding uuid DEFAULT NULL)
RETURNS TABLE(source_key text,order_id uuid,net bigint,mature bigint,reserved bigint,available bigint,financial_hash text,issue text)
LANGUAGE sql STABLE AS $$
WITH boundary AS (SELECT installed_at FROM creator_settlement_epoch WHERE id='purchase-attribution-v1'),
b AS (
 SELECT o.id,o.created_at,min(l.created_at) FILTER(WHERE l.kind='sale') first_sale_at,coalesce(sum(l.net_paise),0)::bigint net,
 CASE WHEN c.scope IS DISTINCT FROM wanted THEN 'scope_mismatch' WHEN c.issue IS NOT NULL THEN c.issue WHEN c.last_checked_at IS NULL OR c.last_checked_at<now()-interval '24 hours' THEN 'payment_check_pending' WHEN NOT coalesce(bool_or(l.kind='fee'),false) THEN 'fee_evidence_missing' END issue,
 encode(sha256(convert_to(jsonb_build_object('order',o.id,'quote',o.purchase_evidence,'payment',o.razorpay_payment_id,'scope',c.scope,'issue',c.issue,'ledger',coalesce(jsonb_agg(jsonb_build_object('id',l.id,'net',l.net_paise) ORDER BY l.id) FILTER(WHERE l.id IS NOT NULL),'[]'::jsonb))::text,'UTF8')),'hex') hash
 FROM orders o LEFT JOIN creator_ledger l ON l.order_id=o.id AND l.scope=wanted LEFT JOIN course_payment_checks c ON c.order_id=o.id
 WHERE o.creator_id=who AND o.status IN ('paid','refunded','chargeback') AND coalesce(o.purchase_evidence->'commercial'->>'arrangement','standard_0')='standard_0'
 GROUP BY o.id,c.scope,c.issue,c.last_checked_at
), amounts AS (
 SELECT 'legacy_zero_pool'::text source_key,NULL::uuid order_id,coalesce(sum(b.net),0)::bigint net,
 coalesce(sum(CASE WHEN b.created_at<date_trunc('month',now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata' THEN b.net ELSE least(b.net,0) END),0)::bigint mature,
 encode(sha256(convert_to(coalesce(jsonb_agg(jsonb_build_object('id',b.id,'hash',b.hash) ORDER BY b.id),'[]'::jsonb)::text,'UTF8')),'hex') hash,
 min(b.issue) issue
 FROM b,boundary WHERE b.first_sale_at<boundary.installed_at
 UNION ALL
 SELECT b.id::text,b.id,b.net,CASE WHEN b.created_at<date_trunc('month',now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata' THEN b.net ELSE least(b.net,0) END,b.hash,b.issue FROM b,boundary WHERE b.first_sale_at>=boundary.installed_at
), used AS (
 SELECT a.source_key,sum(a.amount_paise)::bigint amount FROM creator_payout_allocations a JOIN creator_payouts p ON p.id=a.payout_id WHERE a.creator_id=who AND a.scope=wanted AND p.state NOT IN ('failed','cancelled') AND p.id IS DISTINCT FROM excluding GROUP BY a.source_key
), legacy AS (
 SELECT coalesce(sum(p.amount_paise),0)::bigint amount FROM creator_payouts p,boundary WHERE p.creator_id=who AND p.scope=wanted AND p.created_at<boundary.installed_at AND p.state NOT IN ('failed','cancelled') AND p.id IS DISTINCT FROM excluding AND NOT EXISTS(SELECT 1 FROM creator_payout_allocations a WHERE a.payout_id=p.id)
)
SELECT a.source_key,a.order_id,a.net,a.mature,(coalesce(u.amount,0)+CASE WHEN a.source_key='legacy_zero_pool' THEN legacy.amount ELSE 0 END)::bigint reserved,
 CASE WHEN a.issue IS NOT NULL THEN 0 ELSE greatest(0,least(a.net,a.mature)-coalesce(u.amount,0)-CASE WHEN a.source_key='legacy_zero_pool' THEN legacy.amount ELSE 0 END) END::bigint available,a.hash,a.issue
FROM amounts a LEFT JOIN used u ON u.source_key=a.source_key CROSS JOIN legacy
$$;
--> statement-breakpoint
CREATE FUNCTION creator_zero_release_guard(who uuid,wanted text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM id FROM users WHERE id=who FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM course_finance_runs WHERE scope=wanted AND disputes_checked_at>now()-interval '24 hours') OR EXISTS(SELECT 1 FROM course_payment_inbox WHERE scope=wanted AND state='pending') OR EXISTS(SELECT 1 FROM course_payment_checks c JOIN orders o ON o.id=c.order_id WHERE o.creator_id=who AND o.status IN ('paid','refunded','chargeback') AND coalesce(o.purchase_evidence->'commercial'->>'arrangement','standard_0')='standard_0' AND (c.scope<>wanted OR c.issue IS NOT NULL OR c.last_checked_at IS NULL OR c.last_checked_at<now()-interval '24 hours')) THEN RAISE EXCEPTION 'current reconciled zero-source payment and dispute evidence required'; END IF;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION creator_commercial_payout_block() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM creator_zero_release_guard(NEW.creator_id,NEW.scope);
 IF NEW.amount_paise>(SELECT coalesce(sum(available),0) FROM creator_zero_sources(NEW.creator_id,NEW.scope)) THEN RAISE EXCEPTION 'amount exceeds eligible zero-commission sources; sponsored payouts remain deferred'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION creator_allocate_zero_payout() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s record; remaining bigint:=NEW.amount_paise; take bigint;
BEGIN
 FOR s IN SELECT * FROM creator_zero_sources(NEW.creator_id,NEW.scope,NEW.id) WHERE available>0 ORDER BY (order_id IS NOT NULL),source_key LOOP
  take:=least(s.available,remaining);EXIT WHEN take=0;
  INSERT INTO creator_payout_allocations(payout_id,creator_id,scope,source_key,order_id,amount_paise,financial_hash,evidence) VALUES(NEW.id,NEW.creator_id,NEW.scope,s.source_key,s.order_id,take,s.financial_hash,jsonb_build_object('arrangement','standard_0','netAtApproval',s.net,'matureAtApproval',s.mature,'reservedAtApproval',s.reserved,'boundary','purchase-attribution-v1','provenance',CASE WHEN s.order_id IS NULL THEN 'legacy_aggregate_not_purchase_attributed' ELSE 'frozen_purchase' END));
  remaining:=remaining-take;EXIT WHEN remaining=0;
 END LOOP;
 IF remaining<>0 THEN RAISE EXCEPTION 'atomic zero-source allocation required'; END IF;RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER creator_allocate_zero_payout AFTER INSERT ON creator_payouts FOR EACH ROW EXECUTE FUNCTION creator_allocate_zero_payout();
--> statement-breakpoint
CREATE FUNCTION creator_payout_allocation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p creator_payouts; s record;
BEGIN
 SELECT * INTO p FROM creator_payouts WHERE id=NEW.payout_id;
 PERFORM id FROM users WHERE id=p.creator_id FOR UPDATE;
 SELECT * INTO s FROM creator_zero_sources(p.creator_id,p.scope,p.id) WHERE source_key=NEW.source_key;
 IF p.created_at<(SELECT installed_at FROM creator_settlement_epoch) OR p.state<>'approved' OR p.creator_id IS DISTINCT FROM NEW.creator_id OR p.scope IS DISTINCT FROM NEW.scope OR s.source_key IS NULL OR NEW.order_id IS DISTINCT FROM s.order_id OR NEW.amount_paise>s.available OR NEW.financial_hash IS DISTINCT FROM s.financial_hash OR NEW.evidence->>'arrangement' IS DISTINCT FROM 'standard_0' THEN RAISE EXCEPTION 'exact eligible zero-source allocation required; sponsored execution disabled'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER creator_payout_allocation_guard BEFORE INSERT ON creator_payout_allocations FOR EACH ROW EXECUTE FUNCTION creator_payout_allocation_guard();
--> statement-breakpoint
CREATE FUNCTION creator_payout_allocation_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p creator_payouts;
BEGIN
 IF TG_TABLE_NAME='creator_payouts' THEN SELECT * INTO p FROM creator_payouts WHERE id=NEW.id; ELSE SELECT * INTO p FROM creator_payouts WHERE id=NEW.payout_id; END IF;
 IF p.created_at>=(SELECT installed_at FROM creator_settlement_epoch) AND (SELECT coalesce(sum(amount_paise),0) FROM creator_payout_allocations WHERE payout_id=p.id)<>p.amount_paise THEN RAISE EXCEPTION 'payout amount must equal immutable source allocations'; END IF;RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER creator_payout_allocation_proof AFTER INSERT ON creator_payouts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION creator_payout_allocation_proof();
CREATE CONSTRAINT TRIGGER creator_payout_item_proof AFTER INSERT ON creator_payout_allocations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION creator_payout_allocation_proof();
--> statement-breakpoint
CREATE FUNCTION creator_assert_zero_payout(wanted uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE p creator_payouts; a record; s record; legacy_net bigint; legacy_reserved bigint;
BEGIN
 SELECT * INTO p FROM creator_payouts WHERE id=wanted;
 PERFORM creator_zero_release_guard(p.creator_id,p.scope);
 IF EXISTS(SELECT 1 FROM creator_payout_allocations WHERE payout_id=p.id) THEN
  FOR a IN SELECT * FROM creator_payout_allocations WHERE payout_id=p.id LOOP
   SELECT * INTO s FROM creator_zero_sources(p.creator_id,p.scope,p.id) WHERE source_key=a.source_key;
   IF s.source_key IS NULL OR a.amount_paise>s.available OR a.financial_hash IS DISTINCT FROM s.financial_hash THEN RAISE EXCEPTION 'source evidence changed; cancel and independently approve again'; END IF;
  END LOOP;
 ELSIF p.created_at<(SELECT installed_at FROM creator_settlement_epoch) THEN
  SELECT least(net,mature),reserved INTO legacy_net,legacy_reserved FROM creator_zero_sources(p.creator_id,p.scope) WHERE source_key='legacy_zero_pool';
  IF legacy_net IS NULL OR legacy_net<legacy_reserved THEN RAISE EXCEPTION 'legacy zero-pool obligations require reconciliation'; END IF;
 ELSE RAISE EXCEPTION 'missing zero-source payout allocations'; END IF;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION creator_commercial_dispatch_block() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.submit_attempts>OLD.submit_attempts AND OLD.submit_attempts=0 THEN PERFORM creator_assert_zero_payout(NEW.payout_id); END IF;RETURN NEW;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION creator_bank_execution_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v creator_finance_events;
BEGIN
 PERFORM id FROM users WHERE id=NEW.creator_id FOR UPDATE;
 IF OLD.state='approved' AND NEW.state IN ('initiated','uncertain') THEN
  SELECT * INTO v FROM creator_finance_events WHERE entity_id=NEW.payee_id AND action IN ('verify_payee','reject_payee') ORDER BY created_at DESC,id DESC LIMIT 1;
  IF v.action IS DISTINCT FROM 'verify_payee' THEN RAISE EXCEPTION 'verify payee again before bank execution'; END IF;
  PERFORM creator_assert_zero_payout(NEW.id);
 END IF;RETURN NEW;
END $$;

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
  PERFORM creator_zero_release_guard(NEW.creator_id,NEW.scope);
  IF NEW.amount_paise>(SELECT coalesce(sum(available),0) FROM creator_zero_sources(NEW.creator_id,NEW.scope)) THEN RAISE EXCEPTION 'insufficient eligible zero-source proceeds'; END IF;
 ELSE
  IF (NEW.id,NEW.creator_id,NEW.payee_id,NEW.scope,NEW.amount_paise,NEW.period_end,NEW.approved_by,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.creator_id,OLD.payee_id,OLD.scope,OLD.amount_paise,OLD.period_end,OLD.approved_by,OLD.created_at) THEN RAISE EXCEPTION 'payout identity immutable'; END IF;
  IF NOT (OLD.state='approved' AND NEW.state IN ('initiated','uncertain','cancelled') OR OLD.state='initiated' AND NEW.state IN ('uncertain','confirmed','failed') OR OLD.state='uncertain' AND NEW.state IN ('confirmed','failed')) THEN RAISE EXCEPTION 'invalid payout transition'; END IF;
  IF OLD.state<>'approved' AND (NEW.bank_reference,NEW.initiated_by) IS DISTINCT FROM (OLD.bank_reference,OLD.initiated_by) AND NOT (OLD.state='uncertain' AND OLD.bank_reference IS NULL AND NEW.state='confirmed' AND NEW.bank_reference IS NOT NULL AND NEW.initiated_by IS NOT DISTINCT FROM OLD.initiated_by) THEN RAISE EXCEPTION 'bank initiation identity immutable'; END IF;
 END IF;
 RETURN NEW;
END $$;

--> statement-breakpoint
CREATE TABLE "creator_commercial_live_releases" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"legal_version" text NOT NULL,
	"legal_body" text NOT NULL,
	"legal_hash" text NOT NULL,
	"accounting_hash" text NOT NULL,
	"source_hash" text NOT NULL,
	"founder_approval_hash" text NOT NULL,
	"database_identity" jsonb NOT NULL,
	"first_admin" uuid NOT NULL,
	"second_admin" uuid NOT NULL,
	"payout_execution" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_commercial_live_releases_scope_unique" UNIQUE("scope"),
	CONSTRAINT "commercial_live_release_gate" CHECK ("creator_commercial_live_releases"."scope" LIKE 'live:%' AND "creator_commercial_live_releases"."first_admin"<>"creator_commercial_live_releases"."second_admin" AND "creator_commercial_live_releases"."payout_execution"=false AND "creator_commercial_live_releases"."legal_hash" ~ '^[a-f0-9]{64}$' AND "creator_commercial_live_releases"."accounting_hash" ~ '^[a-f0-9]{64}$' AND "creator_commercial_live_releases"."source_hash" ~ '^[a-f0-9]{64}$' AND "creator_commercial_live_releases"."founder_approval_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "airbharath_commission_ledger" DROP CONSTRAINT "commission_conservation";--> statement-breakpoint
ALTER TABLE "creator_commercial_agreements" DROP CONSTRAINT "commercial_offer_fixed";--> statement-breakpoint
ALTER TABLE "creator_course_commercial_quotes" DROP CONSTRAINT "commercial_quote_lifetime";--> statement-breakpoint
ALTER TABLE "creator_commercial_live_releases" ADD CONSTRAINT "creator_commercial_live_releases_first_admin_users_id_fk" FOREIGN KEY ("first_admin") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_commercial_live_releases" ADD CONSTRAINT "creator_commercial_live_releases_second_admin_users_id_fk" FOREIGN KEY ("second_admin") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airbharath_commission_ledger" ADD CONSTRAINT "commission_conservation" CHECK ("airbharath_commission_ledger"."creator_paise"+"airbharath_commission_ledger"."commission_paise"="airbharath_commission_ledger"."distributable_paise" AND "airbharath_commission_ledger"."commission_paise">=0 AND "airbharath_commission_ledger"."revision">0 AND ("airbharath_commission_ledger"."scope" LIKE 'test:%' OR "airbharath_commission_ledger"."scope" LIKE 'live:%'));--> statement-breakpoint
ALTER TABLE "creator_commercial_agreements" ADD CONSTRAINT "commercial_offer_fixed" CHECK ("creator_commercial_agreements"."arrangement" IN ('standard_0','sponsored_20') AND "creator_commercial_agreements"."duration_months" IN (3,6,12) AND ("creator_commercial_agreements"."scope" LIKE 'test:%' OR "creator_commercial_agreements"."scope" LIKE 'live:%') AND length("creator_commercial_agreements"."reason") BETWEEN 10 AND 1000);--> statement-breakpoint
ALTER TABLE "creator_course_commercial_quotes" ADD CONSTRAINT "commercial_quote_lifetime" CHECK ("creator_course_commercial_quotes"."expires_at"="creator_course_commercial_quotes"."created_at"+interval '15 minutes' AND ("creator_course_commercial_quotes"."scope" LIKE 'test:%' OR "creator_course_commercial_quotes"."scope" LIKE 'live:%') AND "creator_course_commercial_quotes"."arrangement" IN ('standard_0','sponsored_20'));
--> statement-breakpoint
-- Empty reviewed catalogue: no real contract/accounting schedule is registered.
-- Activation requires a separately reviewed source catalogue AND additive SQL registration.
CREATE FUNCTION creator_live_release_registered(release_id text,legal_hash text,accounting_hash text,source_hash text,founder_hash text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT false $$;
--> statement-breakpoint
CREATE FUNCTION creator_commercial_database_identity() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT jsonb_build_object('name',current_database(),'user',current_user,'oid',(SELECT oid::text FROM pg_database WHERE datname=current_database()),'address',host(inet_server_addr()),'port',inet_server_port()) $$;
--> statement-breakpoint
CREATE FUNCTION creator_live_release_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT creator_live_release_registered(NEW.id,NEW.legal_hash,NEW.accounting_hash,NEW.source_hash,NEW.founder_approval_hash) OR (NEW.database_identity-'user') IS DISTINCT FROM (creator_commercial_database_identity()-'user') OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=NEW.database_identity->>'user' AND NOT rolsuper) OR NEW.legal_hash<>encode(sha256(convert_to(NEW.legal_body,'UTF8')),'hex') OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.first_admin AND role='admin') OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.second_admin AND role='admin') THEN RAISE EXCEPTION 'separately approved canonical legal/accounting release required; live sponsorship disabled'; END IF;RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER creator_live_release_guard BEFORE INSERT ON creator_commercial_live_releases FOR EACH ROW EXECUTE FUNCTION creator_live_release_guard();
CREATE TRIGGER creator_live_release_immutable BEFORE UPDATE OR DELETE ON creator_commercial_live_releases FOR EACH ROW EXECUTE FUNCTION creator_money_immutable();
CREATE TRIGGER creator_live_release_no_truncate BEFORE TRUNCATE ON creator_commercial_live_releases FOR EACH STATEMENT EXECUTE FUNCTION creator_money_immutable();
REVOKE ALL ON creator_commercial_live_releases FROM PUBLIC;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION creator_commercial_scope_guard(wanted text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r creator_commercial_rollout_events; ident jsonb; live creator_commercial_live_releases;
BEGIN
 IF wanted LIKE 'live:%' THEN
  SELECT * INTO live FROM creator_commercial_live_releases WHERE scope=wanted;
  IF live.id IS NULL OR live.payout_execution OR live.database_identity IS DISTINCT FROM creator_commercial_database_identity() OR NOT creator_live_release_registered(live.id,live.legal_hash,live.accounting_hash,live.source_hash,live.founder_approval_hash) THEN RAISE EXCEPTION 'approved commercial collection release required; sponsored payouts remain disabled'; END IF;RETURN;
 END IF;
 SELECT * INTO r FROM creator_commercial_rollout_events WHERE scope=wanted;
 SELECT jsonb_build_object('name',current_database(),'user',current_user,'oid',(SELECT oid::text FROM pg_database WHERE datname=current_database()),'system',(SELECT system_identifier::text FROM pg_control_system()),'address',host(inet_server_addr()),'port',inet_server_port()) INTO ident;
 IF r.id IS NULL OR NOT r.synthetic OR wanted NOT LIKE 'test:%' OR current_database() !~ '^airbharath_test_[a-z0-9_]{1,40}$' OR inet_server_addr() IS NULL OR host(inet_server_addr()) NOT IN ('127.0.0.1','::1') OR r.expires_at<=clock_timestamp() OR r.database_identity IS DISTINCT FROM ident THEN RAISE EXCEPTION 'commercial activation disabled: approved isolated synthetic identity required'; END IF;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION creator_commercial_offer_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE live creator_commercial_live_releases;
BEGIN
 PERFORM creator_commercial_scope_guard(NEW.scope);PERFORM id FROM users WHERE id=NEW.creator_id FOR UPDATE;
 IF NEW.creator_id=NEW.proposed_by OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.proposed_by AND role='admin') OR NEW.legal_hash<>encode(sha256(convert_to(NEW.legal_body,'UTF8')),'hex') OR NEW.command_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'authorized exact commercial offer required'; END IF;
 IF NEW.scope LIKE 'test:%' THEN
  IF NEW.legal_version<>'synthetic-sponsored-creator-v1' OR NEW.legal_hash<>(SELECT legal_hash FROM creator_commercial_rollout_events WHERE scope=NEW.scope) THEN RAISE EXCEPTION 'sealed synthetic offer required'; END IF;
 ELSE
  SELECT * INTO live FROM creator_commercial_live_releases WHERE scope=NEW.scope;
  IF NEW.legal_version IS DISTINCT FROM live.legal_version OR NEW.legal_hash IS DISTINCT FROM live.legal_hash OR NEW.legal_body IS DISTINCT FROM live.legal_body THEN RAISE EXCEPTION 'registered commercial schedule required'; END IF;
 END IF;RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION creator_commercial_record_scope(wanted uuid,scope text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE o orders; q creator_course_commercial_quotes; live creator_commercial_live_releases;
BEGIN
 SELECT * INTO o FROM orders WHERE id=wanted;SELECT * INTO q FROM creator_course_commercial_quotes WHERE id=o.creator_commercial_quote_id;
 IF q.id IS NULL OR q.scope IS DISTINCT FROM scope OR q.evidence IS DISTINCT FROM o.purchase_evidence THEN RAISE EXCEPTION 'original immutable commercial quote required'; END IF;
 IF scope LIKE 'test:%' THEN PERFORM creator_commercial_scope_guard(scope);RETURN;END IF;
 SELECT * INTO live FROM creator_commercial_live_releases WHERE creator_commercial_live_releases.scope=creator_commercial_record_scope.scope;
 IF live.id IS NULL OR live.database_identity IS DISTINCT FROM creator_commercial_database_identity() OR live.legal_hash IS DISTINCT FROM q.evidence->'commercial'->>'legalHash' THEN RAISE EXCEPTION 'original approved commercial financial scope required'; END IF;
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION creator_commercial_event_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a creator_commercial_agreements; approved creator_commercial_events; g workspace_access_grants; m workspace_memberships; o workspace_membership_orders;
BEGIN
 SELECT * INTO a FROM creator_commercial_agreements WHERE id=NEW.agreement_id;
 PERFORM creator_commercial_scope_guard(a.scope);PERFORM 1 FROM users WHERE id=a.creator_id FOR UPDATE;
 IF NEW.creator_id IS DISTINCT FROM a.creator_id OR NEW.command_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'bound commercial actor/evidence required'; END IF;
 SELECT * INTO approved FROM creator_commercial_events WHERE agreement_id=a.id AND action='approved';
 IF NEW.action='approved' THEN
  IF NEW.actor_id IN (a.proposed_by,a.creator_id) OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.actor_id AND role='admin') OR NOT EXISTS(SELECT 1 FROM users WHERE id=a.proposed_by AND role='admin') OR EXISTS(SELECT 1 FROM creator_commercial_events WHERE agreement_id=a.id) THEN RAISE EXCEPTION 'second independent approval required'; END IF;
 ELSIF NEW.action IN ('accepted','declined') THEN
  IF NEW.actor_id<>a.creator_id OR approved.id IS NULL OR clock_timestamp()>=approved.created_at+interval '14 days' OR EXISTS(SELECT 1 FROM creator_commercial_events WHERE agreement_id=a.id AND action IN ('accepted','declined','withdrawn')) OR NOT EXISTS(SELECT 1 FROM users WHERE id=approved.actor_id AND role='admin') OR NOT EXISTS(SELECT 1 FROM users WHERE id=a.proposed_by AND role='admin') THEN RAISE EXCEPTION 'current private Creator consent required'; END IF;
  IF NEW.action='accepted' THEN
   SELECT * INTO g FROM workspace_access_grants WHERE id=NEW.grant_id AND user_id=a.creator_id;
   IF g.id IS NULL OR g.status<>'active' OR g.created_at<a.created_at OR g.starts_at<approved.created_at OR g.request_key<>NEW.request_key OR g.environment<>(CASE WHEN a.scope LIKE 'live:%' THEN 'production' ELSE 'test' END) OR g.expires_at IS DISTINCT FROM (((g.starts_at AT TIME ZONE 'Asia/Kolkata')+make_interval(months=>a.duration_months)) AT TIME ZONE 'Asia/Kolkata') OR g.starts_at IS DISTINCT FROM NEW.effective_at OR g.granted_by<>a.proposed_by OR EXISTS(SELECT 1 FROM workspace_memberships mm JOIN workspace_membership_orders oo ON oo.id=mm.membership_order_id LEFT JOIN workspace_refund_completions rr ON rr.membership_order_id=oo.id WHERE mm.user_id=a.creator_id AND oo.activation_state='fulfilled' AND rr.id IS NULL AND mm.ends_at>clock_timestamp()) OR EXISTS(SELECT 1 FROM creator_commercial_events e JOIN creator_commercial_agreements aa ON aa.id=e.agreement_id WHERE e.creator_id=a.creator_id AND e.action='accepted' AND aa.arrangement='sponsored_20' AND NOT EXISTS(SELECT 1 FROM creator_commercial_events ender WHERE ender.agreement_id=e.agreement_id AND ender.action IN ('replaced_paid','released_0') AND ender.effective_at<=clock_timestamp())) THEN RAISE EXCEPTION 'independent conflict-free grant at acceptance required'; END IF;
  END IF;
 ELSIF NEW.action='withdrawn' THEN
  IF NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.actor_id AND role='admin') OR EXISTS(SELECT 1 FROM creator_commercial_events WHERE agreement_id=a.id AND action IN ('accepted','declined','withdrawn')) THEN RAISE EXCEPTION 'only an unaccepted offer may be withdrawn'; END IF;
 ELSIF NEW.action='replaced_paid' THEN
  SELECT * INTO m FROM workspace_memberships WHERE id=NEW.membership_id AND user_id=a.creator_id;
  SELECT * INTO o FROM workspace_membership_orders WHERE id=m.membership_order_id;
  IF m.id IS NULL OR o.activation_state<>'fulfilled' OR o.financial_state<>'captured' OR a.scope<>o.provider_mode||':'||o.provider_account_id OR NEW.actor_id<>a.creator_id OR NEW.effective_at IS DISTINCT FROM greatest(m.starts_at,o.fulfilled_at) OR NOT EXISTS(SELECT 1 FROM creator_commercial_events WHERE agreement_id=a.id AND action='accepted') THEN RAISE EXCEPTION 'verified paid replacement required'; END IF;
 ELSIF NEW.action='released_0' THEN
  IF NEW.actor_id<>a.creator_id OR NEW.grant_id IS NULL OR EXISTS(SELECT 1 FROM creator_commercial_events ended WHERE ended.agreement_id=a.id AND ended.action IN ('replaced_paid','released_0')) OR NOT EXISTS(SELECT 1 FROM creator_commercial_events old_accept WHERE old_accept.agreement_id=a.id AND old_accept.action='accepted') OR NOT EXISTS(SELECT 1 FROM creator_commercial_agreements replacement JOIN creator_commercial_events approval ON approval.agreement_id=replacement.id AND approval.action='approved' WHERE replacement.creator_id=a.creator_id AND replacement.scope=a.scope AND replacement.arrangement='standard_0' AND encode(sha256(convert_to(replacement.id::text,'UTF8')),'hex')=NEW.command_hash AND approval.created_at+interval '14 days'>clock_timestamp() AND EXISTS(SELECT 1 FROM users WHERE id=approval.actor_id AND role='admin') AND EXISTS(SELECT 1 FROM users WHERE id=replacement.proposed_by AND role='admin')) THEN RAISE EXCEPTION 'explicit independently approved permanent zero replacement required'; END IF;
 ELSE RAISE EXCEPTION 'invalid commercial event'; END IF;
 RETURN NEW;
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION creator_commercial_quote_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e creator_commercial_events; a creator_commercial_agreements;
BEGIN
 IF NEW.arrangement='sponsored_20' OR NEW.agreement_id IS NULL THEN PERFORM creator_commercial_scope_guard(NEW.scope); END IF;PERFORM 1 FROM users WHERE id=NEW.creator_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM courses WHERE id=NEW.course_id AND instructor_id=NEW.creator_id AND workspace_project_id IS NOT NULL AND is_published AND workspace_state='live') OR NEW.learner_id=NEW.creator_id OR NEW.evidence->'commercial'->>'quoteId' IS DISTINCT FROM NEW.id::text OR NEW.evidence->'commercial'->>'arrangement' IS DISTINCT FROM NEW.arrangement OR NEW.evidence->'commercial'->>'scope' IS DISTINCT FROM NEW.scope OR NEW.evidence->'commercial'->>'synthetic' IS DISTINCT FROM (CASE WHEN NEW.scope LIKE 'test:%' THEN 'true' ELSE 'false' END) OR NEW.evidence->'commercial'->>'version' IS DISTINCT FROM '1' OR NEW.evidence->'commercial'->>'calculationVersion' IS DISTINCT FROM 'fixed-share-paise-v1' OR NEW.evidence->'commercial'->>'agreementId' IS DISTINCT FROM NEW.agreement_id::text OR NEW.evidence->'commercial'->>'effectiveEventId' IS DISTINCT FROM NEW.effective_event_id::text OR NEW.evidence->>'creatorId' IS DISTINCT FROM NEW.creator_id::text THEN RAISE EXCEPTION 'owned frozen commercial course quote required'; END IF;
 SELECT event.* INTO e FROM creator_commercial_events event JOIN creator_commercial_agreements aa ON aa.id=event.agreement_id WHERE event.creator_id=NEW.creator_id AND event.action IN ('accepted','replaced_paid','released_0') AND aa.scope=NEW.scope AND event.effective_at<=NEW.created_at ORDER BY event.sequence DESC LIMIT 1;
 IF e.id IS NOT NULL THEN
  SELECT * INTO a FROM creator_commercial_agreements WHERE id=e.agreement_id;
  IF NEW.arrangement IS DISTINCT FROM (CASE WHEN e.action IN ('replaced_paid','released_0') THEN 'standard_0' ELSE a.arrangement END) OR NEW.agreement_id IS DISTINCT FROM e.agreement_id OR NEW.effective_event_id IS DISTINCT FROM e.id OR NEW.evidence->'commercial'->>'legalHash' IS DISTINCT FROM a.legal_hash OR NEW.evidence->'commercial'->>'legalVersion' IS DISTINCT FROM a.legal_version THEN RAISE EXCEPTION 'current frozen commercial authority required'; END IF;
 ELSIF NEW.arrangement<>'standard_0' OR NEW.agreement_id IS NOT NULL OR NEW.effective_event_id IS NOT NULL THEN RAISE EXCEPTION 'standard quote required without commercial history'; END IF;
 IF abs(extract(epoch FROM (NEW.created_at-clock_timestamp())))>5 THEN RAISE EXCEPTION 'server-current freeze required'; END IF;RETURN NEW;
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION airbharath_commission_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o orders; f jsonb; previous airbharath_commission_ledger; d bigint; a bigint;
BEGIN
 SELECT * INTO o FROM orders WHERE id=NEW.order_id;PERFORM 1 FROM users WHERE id=o.creator_id FOR UPDATE;
 PERFORM creator_commercial_record_scope(NEW.order_id,NEW.scope);SELECT creator_commercial_financial_facts(o.id) INTO f;
 SELECT * INTO previous FROM airbharath_commission_ledger WHERE order_id=o.id ORDER BY revision DESC LIMIT 1;
 d:=(f->>'grossPaise')::bigint-(f->>'taxPaise')::bigint-(f->>'refundedPaise')::bigint+(f->>'refundTaxPaise')::bigint-(f->>'feePaise')::bigint-(f->>'confirmedLossPaise')::bigint+(f->>'approvedAdjustmentPaise')::bigint;
 a:=CASE WHEN f->>'grossPaise'=f->>'refundedPaise' THEN 0 ELSE (greatest(d,0)*2000+5000)/10000 END;
 IF EXISTS(SELECT 1 FROM course_payment_checks WHERE order_id=o.id AND (scope<>NEW.scope OR issue IS NOT NULL)) OR o.creator_id IS DISTINCT FROM NEW.creator_id OR o.purchase_evidence->'commercial'->>'arrangement' IS DISTINCT FROM 'sponsored_20' OR o.purchase_evidence->'commercial'->>'scope' IS DISTINCT FROM NEW.scope OR NEW.evidence->>'paymentId' IS DISTINCT FROM o.razorpay_payment_id OR NOT (f->>'feeKnown')::boolean OR NEW.financial_hash IS DISTINCT FROM f->>'financialHash' OR NEW.revision<>coalesce(previous.revision,0)+1 OR NEW.distributable_paise<>d OR NEW.commission_paise<>a OR NEW.delta_paise<>a-coalesce(previous.commission_paise,0) OR NEW.evidence->>'recoveryAuthorized' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'exact frozen synthetic commission evidence required'; END IF;
 RETURN NEW;
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION creator_ledger_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o orders; c course_payment_checks;
BEGIN
 IF NEW.kind='commercial_share' THEN
  IF NOT EXISTS(SELECT 1 FROM airbharath_commission_ledger a WHERE a.id=NEW.commercial_allocation_id AND a.order_id=NEW.order_id AND a.creator_id=NEW.creator_id AND a.scope=NEW.scope AND a.delta_paise=NEW.commission_paise AND NEW.evidence->>'paymentId'=(SELECT razorpay_payment_id FROM orders WHERE id=NEW.order_id)) THEN RAISE EXCEPTION 'bound commission pair required'; END IF;
  PERFORM creator_commercial_record_scope(NEW.order_id,NEW.scope);RETURN NEW;
 END IF;
 SELECT * INTO o FROM orders WHERE id=NEW.order_id;
 PERFORM 1 FROM users WHERE id=o.creator_id FOR UPDATE;
 SELECT * INTO c FROM course_payment_checks WHERE order_id=o.id;
 IF o.status NOT IN ('paid','refunded','chargeback') OR o.creator_id IS DISTINCT FROM NEW.creator_id OR o.purchase_evidence IS NULL OR c.scope IS DISTINCT FROM NEW.scope OR NEW.evidence->>'paymentId' IS DISTINCT FROM o.razorpay_payment_id OR NEW.commission_paise<>0 OR NEW.kind NOT IN ('sale','fee','fee_adjustment','refund','dispute','adjustment') THEN RAISE EXCEPTION 'bound paid Creator evidence required'; END IF;
 IF NEW.kind='sale' AND (NEW.source_key<>'sale' OR NEW.gross_paise<>round(o.amount*100) OR NEW.tax_paise<>(o.purchase_evidence->>'taxPaise')::int OR NEW.fee_paise<>0) THEN RAISE EXCEPTION 'frozen quote required'; END IF;
 IF NEW.kind='fee' AND (NEW.source_key<>'fee' OR NEW.fee_paise<0 OR NEW.fee_tax_paise<0 OR NEW.fee_tax_paise>NEW.fee_paise OR NEW.gross_paise<>0 OR NEW.tax_paise<>0 OR NEW.fee_paise IS DISTINCT FROM (NEW.evidence->'provider'->>'fee')::int OR NEW.fee_tax_paise IS DISTINCT FROM (NEW.evidence->'provider'->>'tax')::int) THEN RAISE EXCEPTION 'actual gateway fee required'; END IF;
 IF NEW.kind='fee_adjustment' AND (NEW.gross_paise<>0 OR NEW.tax_paise<>0 OR NEW.fee_paise+coalesce((SELECT sum(fee_paise) FROM creator_ledger WHERE order_id=o.id AND kind IN ('fee','fee_adjustment')),0) IS DISTINCT FROM (NEW.evidence->'provider'->>'fee')::int OR NEW.fee_tax_paise+coalesce((SELECT sum(fee_tax_paise) FROM creator_ledger WHERE order_id=o.id AND kind IN ('fee','fee_adjustment')),0) IS DISTINCT FROM (NEW.evidence->'provider'->>'tax')::int) THEN RAISE EXCEPTION 'canonical actual fee adjustment required'; END IF;
 IF NEW.kind='refund' AND (NEW.gross_paise>=0 OR NEW.tax_paise>0 OR NEW.fee_paise<>0 OR -NEW.gross_paise+coalesce((SELECT sum(-gross_paise) FROM creator_ledger WHERE order_id=o.id AND kind='refund'),0)>round(o.amount*100)) THEN RAISE EXCEPTION 'invalid cumulative refund'; END IF;
 RETURN NEW;
END $$;
