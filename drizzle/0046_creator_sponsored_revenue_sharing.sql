CREATE TABLE "airbharath_commission_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"revision" integer NOT NULL,
	"financial_hash" text NOT NULL,
	"distributable_paise" integer NOT NULL,
	"creator_paise" integer NOT NULL,
	"commission_paise" integer NOT NULL,
	"delta_paise" integer NOT NULL,
	"evidence" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_financial_fact" UNIQUE("order_id","financial_hash"),
	CONSTRAINT "commission_revision" UNIQUE("order_id","revision"),
	CONSTRAINT "commission_conservation" CHECK ("airbharath_commission_ledger"."creator_paise"+"airbharath_commission_ledger"."commission_paise"="airbharath_commission_ledger"."distributable_paise" AND "airbharath_commission_ledger"."commission_paise">=0 AND "airbharath_commission_ledger"."revision">0 AND "airbharath_commission_ledger"."scope" LIKE 'test:%')
);
--> statement-breakpoint
CREATE TABLE "creator_commercial_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"arrangement" text NOT NULL,
	"duration_months" integer NOT NULL,
	"proposed_by" uuid NOT NULL,
	"reason" text NOT NULL,
	"legal_version" text NOT NULL,
	"legal_body" text NOT NULL,
	"legal_hash" text NOT NULL,
	"request_key" uuid NOT NULL,
	"command_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_offer_request" UNIQUE("proposed_by","request_key"),
	CONSTRAINT "commercial_offer_fixed" CHECK ("creator_commercial_agreements"."arrangement" IN ('standard_0','sponsored_20') AND "creator_commercial_agreements"."duration_months" IN (3,6,12) AND "creator_commercial_agreements"."scope" LIKE 'test:%' AND length("creator_commercial_agreements"."reason") BETWEEN 10 AND 1000)
);
--> statement-breakpoint
CREATE TABLE "creator_commercial_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence" bigint GENERATED ALWAYS AS IDENTITY (sequence name "creator_commercial_events_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"agreement_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"request_key" uuid NOT NULL,
	"command_hash" text NOT NULL,
	"grant_id" uuid,
	"membership_id" uuid,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_event_request" UNIQUE("actor_id","request_key"),
	CONSTRAINT "commercial_event_transition" UNIQUE("agreement_id","action"),
	CONSTRAINT "commercial_event_action" CHECK ("creator_commercial_events"."action" IN ('approved','accepted','declined','withdrawn','replaced_paid','released_0'))
);
--> statement-breakpoint
CREATE TABLE "creator_course_commercial_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"agreement_id" uuid,
	"effective_event_id" uuid,
	"scope" text NOT NULL,
	"arrangement" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "commercial_quote_lifetime" CHECK ("creator_course_commercial_quotes"."expires_at"="creator_course_commercial_quotes"."created_at"+interval '15 minutes' AND "creator_course_commercial_quotes"."scope" LIKE 'test:%' AND "creator_course_commercial_quotes"."arrangement" IN ('standard_0','sponsored_20'))
);
--> statement-breakpoint
CREATE TABLE "creator_commercial_rollout_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"run_id" uuid NOT NULL,
	"database_identity" jsonb NOT NULL,
	"legal_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"synthetic" boolean DEFAULT true NOT NULL,
	CONSTRAINT "creator_commercial_rollout_events_scope_unique" UNIQUE("scope"),
	CONSTRAINT "commercial_rollout_synthetic" CHECK ("creator_commercial_rollout_events"."synthetic"=true AND "creator_commercial_rollout_events"."scope" LIKE 'test:%' AND "creator_commercial_rollout_events"."expires_at">"creator_commercial_rollout_events"."created_at" AND "creator_commercial_rollout_events"."expires_at"<="creator_commercial_rollout_events"."created_at"+interval '4 hours' AND "creator_commercial_rollout_events"."legal_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "creator_ledger" DROP CONSTRAINT "creator_ledger_money";--> statement-breakpoint
ALTER TABLE "creator_ledger" ADD COLUMN "commercial_allocation_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "creator_commercial_quote_id" uuid;--> statement-breakpoint
ALTER TABLE "airbharath_commission_ledger" ADD CONSTRAINT "airbharath_commission_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airbharath_commission_ledger" ADD CONSTRAINT "airbharath_commission_ledger_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_commercial_agreements" ADD CONSTRAINT "creator_commercial_agreements_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_commercial_agreements" ADD CONSTRAINT "creator_commercial_agreements_proposed_by_users_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_commercial_events" ADD CONSTRAINT "creator_commercial_events_agreement_id_creator_commercial_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."creator_commercial_agreements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_commercial_events" ADD CONSTRAINT "creator_commercial_events_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_commercial_events" ADD CONSTRAINT "creator_commercial_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_commercial_events" ADD CONSTRAINT "creator_commercial_events_grant_id_workspace_access_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."workspace_access_grants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_commercial_events" ADD CONSTRAINT "creator_commercial_events_membership_id_workspace_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."workspace_memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_course_commercial_quotes" ADD CONSTRAINT "creator_course_commercial_quotes_learner_id_users_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_course_commercial_quotes" ADD CONSTRAINT "creator_course_commercial_quotes_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_course_commercial_quotes" ADD CONSTRAINT "creator_course_commercial_quotes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_course_commercial_quotes" ADD CONSTRAINT "creator_course_commercial_quotes_agreement_id_creator_commercial_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."creator_commercial_agreements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_course_commercial_quotes" ADD CONSTRAINT "creator_course_commercial_quotes_effective_event_id_creator_commercial_events_id_fk" FOREIGN KEY ("effective_event_id") REFERENCES "public"."creator_commercial_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commission_creator" ON "airbharath_commission_ledger" USING btree ("creator_id","created_at");--> statement-breakpoint
CREATE INDEX "commercial_offer_owner" ON "creator_commercial_agreements" USING btree ("creator_id","created_at");--> statement-breakpoint
CREATE INDEX "commercial_event_owner" ON "creator_commercial_events" USING btree ("creator_id","sequence");--> statement-breakpoint
CREATE INDEX "commercial_quote_owner" ON "creator_course_commercial_quotes" USING btree ("creator_id","created_at");--> statement-breakpoint
ALTER TABLE "creator_ledger" ADD CONSTRAINT "creator_ledger_commercial_allocation_id_airbharath_commission_ledger_id_fk" FOREIGN KEY ("commercial_allocation_id") REFERENCES "public"."airbharath_commission_ledger"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_creator_commercial_quote_id_creator_course_commercial_quotes_id_fk" FOREIGN KEY ("creator_commercial_quote_id") REFERENCES "public"."creator_course_commercial_quotes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_ledger" ADD CONSTRAINT "creator_ledger_commercial_allocation_id_unique" UNIQUE("commercial_allocation_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_creator_commercial_quote_id_unique" UNIQUE("creator_commercial_quote_id");--> statement-breakpoint
ALTER TABLE "creator_ledger" ADD CONSTRAINT "creator_ledger_money" CHECK (("creator_ledger"."kind"<>'commercial_share' AND "creator_ledger"."commercial_allocation_id" IS NULL AND "creator_ledger"."commission_paise"=0 AND "creator_ledger"."net_paise"="creator_ledger"."gross_paise"-"creator_ledger"."tax_paise"-"creator_ledger"."fee_paise") OR ("creator_ledger"."kind"='commercial_share' AND "creator_ledger"."commercial_allocation_id" IS NOT NULL AND "creator_ledger"."gross_paise"=0 AND "creator_ledger"."tax_paise"=0 AND "creator_ledger"."fee_paise"=0 AND "creator_ledger"."fee_tax_paise"=0 AND "creator_ledger"."net_paise"=-"creator_ledger"."commission_paise"));--> statement-breakpoint
-- No live legal/accounting capability exists in this migration. Proof expires and
-- binds the actual owned database, independently of process environment labels.
CREATE FUNCTION creator_commercial_scope_guard(wanted text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r creator_commercial_rollout_events; ident jsonb;
BEGIN
 SELECT * INTO r FROM creator_commercial_rollout_events WHERE scope=wanted;
 SELECT jsonb_build_object('name',current_database(),'user',current_user,'oid',(SELECT oid::text FROM pg_database WHERE datname=current_database()),'system',(SELECT system_identifier::text FROM pg_control_system()),'address',host(inet_server_addr()),'port',inet_server_port()) INTO ident;
 IF r.id IS NULL OR NOT r.synthetic OR wanted NOT LIKE 'test:%' OR current_database() !~ '^airbharath_test_[a-z0-9_]{1,40}$' OR host(inet_server_addr()) NOT IN ('127.0.0.1','::1') OR r.expires_at<=clock_timestamp() OR r.database_identity IS DISTINCT FROM ident THEN RAISE EXCEPTION 'commercial activation disabled: approved isolated synthetic identity required'; END IF;
END $$;
--> statement-breakpoint
CREATE FUNCTION creator_commercial_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'immutable commercial evidence'; END $$;
--> statement-breakpoint
CREATE FUNCTION creator_commercial_offer_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM creator_commercial_scope_guard(NEW.scope);
 PERFORM 1 FROM users WHERE id=NEW.creator_id FOR UPDATE;
 IF NEW.creator_id=NEW.proposed_by OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.proposed_by AND role='admin') OR NEW.legal_version<>'synthetic-sponsored-creator-v1' OR NEW.legal_hash<>(SELECT legal_hash FROM creator_commercial_rollout_events WHERE scope=NEW.scope) OR NEW.legal_hash<>encode(sha256(convert_to(NEW.legal_body,'UTF8')),'hex') OR NEW.command_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'authorized sealed synthetic offer required'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER commercial_offer_guard BEFORE INSERT ON creator_commercial_agreements FOR EACH ROW EXECUTE FUNCTION creator_commercial_offer_guard();
--> statement-breakpoint
CREATE FUNCTION creator_commercial_event_guard() RETURNS trigger LANGUAGE plpgsql AS $$
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
   IF g.id IS NULL OR g.status<>'active' OR g.created_at<a.created_at OR g.starts_at<approved.created_at OR g.request_key<>NEW.request_key OR g.environment<>'test' OR g.expires_at IS DISTINCT FROM (((g.starts_at AT TIME ZONE 'Asia/Kolkata')+make_interval(months=>a.duration_months)) AT TIME ZONE 'Asia/Kolkata') OR g.starts_at IS DISTINCT FROM NEW.effective_at OR g.granted_by<>a.proposed_by OR EXISTS(SELECT 1 FROM workspace_memberships mm JOIN workspace_membership_orders oo ON oo.id=mm.membership_order_id LEFT JOIN workspace_refund_completions rr ON rr.membership_order_id=oo.id WHERE mm.user_id=a.creator_id AND oo.activation_state='fulfilled' AND rr.id IS NULL AND mm.ends_at>clock_timestamp()) OR EXISTS(SELECT 1 FROM creator_commercial_events e JOIN creator_commercial_agreements aa ON aa.id=e.agreement_id WHERE e.creator_id=a.creator_id AND e.action='accepted' AND aa.arrangement='sponsored_20' AND NOT EXISTS(SELECT 1 FROM creator_commercial_events ender WHERE ender.agreement_id=e.agreement_id AND ender.action IN ('replaced_paid','released_0') AND ender.effective_at<=clock_timestamp())) THEN RAISE EXCEPTION 'independent conflict-free grant at acceptance required'; END IF;
  END IF;
 ELSIF NEW.action='withdrawn' THEN
  IF NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.actor_id AND role='admin') OR EXISTS(SELECT 1 FROM creator_commercial_events WHERE agreement_id=a.id AND action IN ('accepted','declined','withdrawn')) THEN RAISE EXCEPTION 'only an unaccepted offer may be withdrawn'; END IF;
 ELSIF NEW.action='replaced_paid' THEN
  SELECT * INTO m FROM workspace_memberships WHERE id=NEW.membership_id AND user_id=a.creator_id;
  SELECT * INTO o FROM workspace_membership_orders WHERE id=m.membership_order_id;
  IF m.id IS NULL OR o.activation_state<>'fulfilled' OR o.financial_state<>'captured' OR o.provider_mode<>'test' OR a.scope<>'test:'||o.provider_account_id OR NEW.actor_id<>a.creator_id OR NEW.effective_at IS DISTINCT FROM greatest(m.starts_at,o.fulfilled_at) OR NOT EXISTS(SELECT 1 FROM creator_commercial_events WHERE agreement_id=a.id AND action='accepted') THEN RAISE EXCEPTION 'verified paid replacement required'; END IF;
 ELSIF NEW.action='released_0' THEN
  IF NEW.actor_id<>a.creator_id OR NEW.grant_id IS NULL OR EXISTS(SELECT 1 FROM creator_commercial_events ended WHERE ended.agreement_id=a.id AND ended.action IN ('replaced_paid','released_0')) OR NOT EXISTS(SELECT 1 FROM creator_commercial_events old_accept WHERE old_accept.agreement_id=a.id AND old_accept.action='accepted') OR NOT EXISTS(SELECT 1 FROM creator_commercial_agreements replacement JOIN creator_commercial_events approval ON approval.agreement_id=replacement.id AND approval.action='approved' WHERE replacement.creator_id=a.creator_id AND replacement.scope=a.scope AND replacement.arrangement='standard_0' AND encode(sha256(convert_to(replacement.id::text,'UTF8')),'hex')=NEW.command_hash AND approval.created_at+interval '14 days'>clock_timestamp() AND EXISTS(SELECT 1 FROM users WHERE id=approval.actor_id AND role='admin') AND EXISTS(SELECT 1 FROM users WHERE id=replacement.proposed_by AND role='admin')) THEN RAISE EXCEPTION 'explicit independently approved permanent zero replacement required'; END IF;
 ELSE RAISE EXCEPTION 'invalid commercial event'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER commercial_event_guard BEFORE INSERT ON creator_commercial_events FOR EACH ROW EXECUTE FUNCTION creator_commercial_event_guard();
--> statement-breakpoint
CREATE FUNCTION creator_commercial_paid_replacement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a creator_commercial_agreements; m workspace_memberships;
BEGIN
 IF NEW.activation_state='fulfilled' AND OLD.activation_state IS DISTINCT FROM 'fulfilled' THEN
  SELECT * INTO m FROM workspace_memberships WHERE membership_order_id=NEW.id;
  FOR a IN SELECT aa.* FROM creator_commercial_agreements aa JOIN creator_commercial_events accepted ON accepted.agreement_id=aa.id AND accepted.action='accepted' WHERE aa.creator_id=NEW.user_id AND aa.scope=NEW.provider_mode||':'||NEW.provider_account_id AND aa.arrangement='sponsored_20' AND NOT EXISTS(SELECT 1 FROM creator_commercial_events x WHERE x.agreement_id=aa.id AND x.action IN ('replaced_paid','released_0')) LOOP
   INSERT INTO creator_commercial_events(agreement_id,creator_id,actor_id,action,request_key,command_hash,membership_id,effective_at) VALUES(a.id,a.creator_id,a.creator_id,'replaced_paid',gen_random_uuid(),encode(sha256(convert_to(NEW.id::text,'UTF8')),'hex'),m.id,greatest(m.starts_at,NEW.fulfilled_at));
  END LOOP;
 END IF;RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER commercial_paid_replacement AFTER UPDATE ON workspace_membership_orders FOR EACH ROW EXECUTE FUNCTION creator_commercial_paid_replacement();
--> statement-breakpoint
CREATE FUNCTION creator_commercial_quote_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e creator_commercial_events; a creator_commercial_agreements;
BEGIN
 PERFORM creator_commercial_scope_guard(NEW.scope);PERFORM 1 FROM users WHERE id=NEW.creator_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM courses WHERE id=NEW.course_id AND instructor_id=NEW.creator_id AND workspace_project_id IS NOT NULL AND is_published AND workspace_state='live') OR NEW.learner_id=NEW.creator_id OR NEW.evidence->'commercial'->>'quoteId' IS DISTINCT FROM NEW.id::text OR NEW.evidence->'commercial'->>'arrangement' IS DISTINCT FROM NEW.arrangement OR NEW.evidence->'commercial'->>'scope' IS DISTINCT FROM NEW.scope OR NEW.evidence->'commercial'->>'synthetic' IS DISTINCT FROM 'true' OR NEW.evidence->'commercial'->>'version' IS DISTINCT FROM '1' OR NEW.evidence->'commercial'->>'calculationVersion' IS DISTINCT FROM 'fixed-share-paise-v1' OR NEW.evidence->'commercial'->>'agreementId' IS DISTINCT FROM NEW.agreement_id::text OR NEW.evidence->'commercial'->>'effectiveEventId' IS DISTINCT FROM NEW.effective_event_id::text OR NEW.evidence->>'creatorId' IS DISTINCT FROM NEW.creator_id::text THEN RAISE EXCEPTION 'owned frozen commercial course quote required'; END IF;
 SELECT event.* INTO e FROM creator_commercial_events event JOIN creator_commercial_agreements aa ON aa.id=event.agreement_id WHERE event.creator_id=NEW.creator_id AND event.action IN ('accepted','replaced_paid','released_0') AND aa.scope=NEW.scope AND event.effective_at<=NEW.created_at ORDER BY event.sequence DESC LIMIT 1;
 IF e.id IS NOT NULL THEN
  SELECT * INTO a FROM creator_commercial_agreements WHERE id=e.agreement_id;
  IF NEW.arrangement IS DISTINCT FROM (CASE WHEN e.action IN ('replaced_paid','released_0') THEN 'standard_0' ELSE a.arrangement END) OR NEW.agreement_id IS DISTINCT FROM e.agreement_id OR NEW.effective_event_id IS DISTINCT FROM e.id OR NEW.evidence->'commercial'->>'legalHash' IS DISTINCT FROM a.legal_hash OR NEW.evidence->'commercial'->>'legalVersion' IS DISTINCT FROM a.legal_version THEN RAISE EXCEPTION 'current frozen commercial authority required'; END IF;
 ELSIF NEW.arrangement<>'standard_0' OR NEW.agreement_id IS NOT NULL OR NEW.effective_event_id IS NOT NULL THEN RAISE EXCEPTION 'standard quote required without commercial history'; END IF;
 IF abs(extract(epoch FROM (NEW.created_at-clock_timestamp())))>5 THEN RAISE EXCEPTION 'server-current freeze required'; END IF;RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER commercial_quote_guard BEFORE INSERT ON creator_course_commercial_quotes FOR EACH ROW EXECUTE FUNCTION creator_commercial_quote_guard();
--> statement-breakpoint
CREATE FUNCTION creator_commercial_order_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE q creator_course_commercial_quotes;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.creator_commercial_quote_id IS DISTINCT FROM OLD.creator_commercial_quote_id THEN RAISE EXCEPTION 'immutable commercial order reference'; END IF;RETURN NEW;
 END IF;
 IF NEW.creator_commercial_quote_id IS NULL THEN
  IF NEW.purchase_evidence ? 'commercial' OR EXISTS(SELECT 1 FROM creator_commercial_events e WHERE e.creator_id=NEW.creator_id AND e.action='accepted' AND e.effective_at<=clock_timestamp()) THEN RAISE EXCEPTION 'new sponsored purchases require frozen commercial evidence'; END IF;RETURN NEW;
 END IF;
 SELECT * INTO q FROM creator_course_commercial_quotes WHERE id=NEW.creator_commercial_quote_id;
 PERFORM creator_commercial_scope_guard(q.scope);
 IF q.id IS NULL OR q.expires_at<=clock_timestamp() OR q.learner_id<>NEW.user_id OR q.creator_id IS DISTINCT FROM NEW.creator_id OR q.course_id<>NEW.course_id OR q.evidence IS DISTINCT FROM NEW.purchase_evidence THEN RAISE EXCEPTION 'valid immutable quote binding required'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER commercial_order_guard BEFORE INSERT OR UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION creator_commercial_order_guard();
--> statement-breakpoint
-- Keep the original append-only financial guards. Sponsored settlement is deliberately
-- unavailable until an approved recovery model can distinguish debt from future earnings.
CREATE FUNCTION creator_commercial_payout_block() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM orders WHERE creator_id=NEW.creator_id AND purchase_evidence->'commercial'->>'arrangement'='sponsored_20') THEN RAISE EXCEPTION 'sponsored settlement disabled: legal/accounting and no-offset recovery approval required'; END IF;RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER commercial_payout_block BEFORE INSERT ON creator_payouts FOR EACH ROW EXECUTE FUNCTION creator_commercial_payout_block();
--> statement-breakpoint
CREATE FUNCTION creator_commercial_dispatch_block() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.submit_attempts>OLD.submit_attempts AND OLD.submit_attempts=0 AND EXISTS(SELECT 1 FROM creator_payouts p JOIN orders o ON o.creator_id=p.creator_id WHERE p.id=NEW.payout_id AND o.purchase_evidence->'commercial'->>'arrangement'='sponsored_20') THEN RAISE EXCEPTION 'sponsored first dispatch disabled pending recovery approval'; END IF;RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER commercial_dispatch_block BEFORE UPDATE ON creator_payout_jobs FOR EACH ROW EXECUTE FUNCTION creator_commercial_dispatch_block();

--> statement-breakpoint
CREATE TRIGGER creator_commercial_rollout_events_immutable BEFORE UPDATE OR DELETE ON creator_commercial_rollout_events FOR EACH ROW EXECUTE FUNCTION creator_commercial_immutable();
CREATE TRIGGER creator_commercial_rollout_events_no_truncate BEFORE TRUNCATE ON creator_commercial_rollout_events FOR EACH STATEMENT EXECUTE FUNCTION creator_commercial_immutable();

--> statement-breakpoint
CREATE TRIGGER creator_commercial_agreements_immutable BEFORE UPDATE OR DELETE ON creator_commercial_agreements FOR EACH ROW EXECUTE FUNCTION creator_commercial_immutable();
CREATE TRIGGER creator_commercial_agreements_no_truncate BEFORE TRUNCATE ON creator_commercial_agreements FOR EACH STATEMENT EXECUTE FUNCTION creator_commercial_immutable();

--> statement-breakpoint
CREATE TRIGGER creator_commercial_events_immutable BEFORE UPDATE OR DELETE ON creator_commercial_events FOR EACH ROW EXECUTE FUNCTION creator_commercial_immutable();
CREATE TRIGGER creator_commercial_events_no_truncate BEFORE TRUNCATE ON creator_commercial_events FOR EACH STATEMENT EXECUTE FUNCTION creator_commercial_immutable();

--> statement-breakpoint
CREATE TRIGGER creator_course_commercial_quotes_immutable BEFORE UPDATE OR DELETE ON creator_course_commercial_quotes FOR EACH ROW EXECUTE FUNCTION creator_commercial_immutable();
CREATE TRIGGER creator_course_commercial_quotes_no_truncate BEFORE TRUNCATE ON creator_course_commercial_quotes FOR EACH STATEMENT EXECUTE FUNCTION creator_commercial_immutable();

--> statement-breakpoint
CREATE TRIGGER airbharath_commission_ledger_immutable BEFORE UPDATE OR DELETE ON airbharath_commission_ledger FOR EACH ROW EXECUTE FUNCTION creator_commercial_immutable();
CREATE TRIGGER airbharath_commission_ledger_no_truncate BEFORE TRUNCATE ON airbharath_commission_ledger FOR EACH STATEMENT EXECUTE FUNCTION creator_commercial_immutable();
--> statement-breakpoint
CREATE FUNCTION creator_commercial_financial_facts(wanted uuid) RETURNS jsonb LANGUAGE sql STABLE AS $$
WITH b AS (SELECT * FROM creator_ledger WHERE order_id=wanted AND kind<>'commercial_share')
SELECT jsonb_build_object(
 'grossPaise',coalesce(sum(gross_paise) FILTER(WHERE kind='sale'),0),
 'taxPaise',coalesce(sum(tax_paise) FILTER(WHERE kind='sale'),0),
 'feePaise',coalesce(sum(fee_paise) FILTER(WHERE kind IN ('fee','fee_adjustment')),0),
 'feeTaxPaise',coalesce(sum(fee_tax_paise) FILTER(WHERE kind IN ('fee','fee_adjustment')),0),
 'feeKnown',count(*) FILTER(WHERE kind='fee')>0,
 'refundedPaise',-coalesce(sum(gross_paise) FILTER(WHERE kind='refund'),0),
 'refundTaxPaise',-coalesce(sum(tax_paise) FILTER(WHERE kind='refund'),0),
 'approvedAdjustmentPaise',coalesce(sum(net_paise) FILTER(WHERE kind='adjustment'),0),
 'confirmedLossPaise',-coalesce(sum(net_paise) FILTER(WHERE kind='dispute' AND EXISTS(SELECT 1 FROM b x WHERE x.kind='dispute' AND x.evidence->>'disputeId'=b.evidence->>'disputeId' AND x.evidence->>'status'='lost')),0),
 'financialHash',encode(sha256(convert_to(coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'gross',gross_paise,'tax',tax_paise,'fee',fee_paise,'feeTax',fee_tax_paise,'net',net_paise,'dispute',evidence->>'disputeId','status',evidence->>'status') ORDER BY id),'[]'::jsonb)::text,'UTF8')),'hex')) FROM b
$$;
--> statement-breakpoint
CREATE FUNCTION airbharath_commission_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o orders; f jsonb; previous airbharath_commission_ledger; d bigint; a bigint;
BEGIN
 SELECT * INTO o FROM orders WHERE id=NEW.order_id;PERFORM 1 FROM users WHERE id=o.creator_id FOR UPDATE;
 PERFORM creator_commercial_scope_guard(NEW.scope);SELECT creator_commercial_financial_facts(o.id) INTO f;
 SELECT * INTO previous FROM airbharath_commission_ledger WHERE order_id=o.id ORDER BY revision DESC LIMIT 1;
 d:=(f->>'grossPaise')::bigint-(f->>'taxPaise')::bigint-(f->>'refundedPaise')::bigint+(f->>'refundTaxPaise')::bigint-(f->>'feePaise')::bigint-(f->>'confirmedLossPaise')::bigint+(f->>'approvedAdjustmentPaise')::bigint;
 a:=CASE WHEN f->>'grossPaise'=f->>'refundedPaise' THEN 0 ELSE (greatest(d,0)*2000+5000)/10000 END;
 IF EXISTS(SELECT 1 FROM course_payment_checks WHERE order_id=o.id AND (scope<>NEW.scope OR issue IS NOT NULL)) OR o.creator_id IS DISTINCT FROM NEW.creator_id OR o.purchase_evidence->'commercial'->>'arrangement' IS DISTINCT FROM 'sponsored_20' OR o.purchase_evidence->'commercial'->>'scope' IS DISTINCT FROM NEW.scope OR NEW.evidence->>'paymentId' IS DISTINCT FROM o.razorpay_payment_id OR NOT (f->>'feeKnown')::boolean OR NEW.financial_hash IS DISTINCT FROM f->>'financialHash' OR NEW.revision<>coalesce(previous.revision,0)+1 OR NEW.distributable_paise<>d OR NEW.commission_paise<>a OR NEW.delta_paise<>a-coalesce(previous.commission_paise,0) OR NEW.evidence->>'recoveryAuthorized' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'exact frozen synthetic commission evidence required'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER commission_guard BEFORE INSERT ON airbharath_commission_ledger FOR EACH ROW EXECUTE FUNCTION airbharath_commission_guard();
--> statement-breakpoint
CREATE FUNCTION creator_commercial_pair_proof() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.delta_paise<>0 AND NOT EXISTS(SELECT 1 FROM creator_ledger l WHERE l.commercial_allocation_id=NEW.id AND l.creator_id=NEW.creator_id AND l.order_id=NEW.order_id AND l.scope=NEW.scope AND l.kind='commercial_share' AND l.commission_paise=NEW.delta_paise AND l.net_paise=-NEW.delta_paise) THEN RAISE EXCEPTION 'atomic conserved commission pair required'; END IF;RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER commercial_pair_proof AFTER INSERT ON airbharath_commission_ledger DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION creator_commercial_pair_proof();

--> statement-breakpoint
CREATE OR REPLACE FUNCTION creator_ledger_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o orders; c course_payment_checks;
BEGIN
 IF NEW.kind='commercial_share' THEN
  IF NOT EXISTS(SELECT 1 FROM airbharath_commission_ledger a WHERE a.id=NEW.commercial_allocation_id AND a.order_id=NEW.order_id AND a.creator_id=NEW.creator_id AND a.scope=NEW.scope AND a.delta_paise=NEW.commission_paise AND NEW.evidence->>'paymentId'=(SELECT razorpay_payment_id FROM orders WHERE id=NEW.order_id)) THEN RAISE EXCEPTION 'bound commission pair required'; END IF;
  PERFORM creator_commercial_scope_guard(NEW.scope);RETURN NEW;
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

--> statement-breakpoint
CREATE FUNCTION creator_commercial_release_proof() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.action='released_0' AND NOT EXISTS(SELECT 1 FROM creator_commercial_agreements replacement JOIN creator_commercial_events accepted ON accepted.agreement_id=replacement.id AND accepted.action='accepted' JOIN workspace_access_grants new_grant ON new_grant.id=accepted.grant_id WHERE replacement.creator_id=NEW.creator_id AND replacement.arrangement='standard_0' AND accepted.grant_id=NEW.grant_id AND accepted.effective_at=NEW.effective_at AND encode(sha256(convert_to(replacement.id::text,'UTF8')),'hex')=NEW.command_hash AND NOT EXISTS(SELECT 1 FROM creator_commercial_events old_accept JOIN workspace_access_grants old_grant ON old_grant.id=old_accept.grant_id WHERE old_accept.agreement_id=NEW.agreement_id AND old_accept.action='accepted' AND old_grant.expires_at>new_grant.expires_at)) THEN RAISE EXCEPTION 'atomic zero acceptance and preserved grant duration required'; END IF;RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER commercial_release_proof AFTER INSERT ON creator_commercial_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION creator_commercial_release_proof();
