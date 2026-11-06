CREATE TABLE "course_finance_runs" (
	"scope" text PRIMARY KEY NOT NULL,
	"dispute_skip" integer DEFAULT 0 NOT NULL,
	"disputes_checked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "course_payment_checks" (
	"order_id" uuid PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"payment_id" text,
	"last_checked_at" timestamp with time zone,
	"next_check_at" timestamp with time zone DEFAULT now() NOT NULL,
	"issue" text,
	CONSTRAINT "course_payment_checks_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "course_payment_inbox" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"hash" text NOT NULL,
	"payment_id" text NOT NULL,
	"dispute_id" text,
	"state" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "creator_finance_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"request_key" uuid NOT NULL,
	"command_hash" text NOT NULL,
	"action" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"evidence" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_finance_request" UNIQUE("actor_id","request_key")
);
--> statement-breakpoint
CREATE TABLE "creator_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"source_key" text NOT NULL,
	"kind" text NOT NULL,
	"gross_paise" integer DEFAULT 0 NOT NULL,
	"tax_paise" integer DEFAULT 0 NOT NULL,
	"fee_paise" integer DEFAULT 0 NOT NULL,
	"fee_tax_paise" integer DEFAULT 0 NOT NULL,
	"net_paise" integer NOT NULL,
	"commission_paise" integer DEFAULT 0 NOT NULL,
	"evidence" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_ledger_source" UNIQUE("order_id","source_key"),
	CONSTRAINT "creator_ledger_money" CHECK ("creator_ledger"."commission_paise"=0 AND "creator_ledger"."net_paise"="creator_ledger"."gross_paise"-"creator_ledger"."tax_paise"-"creator_ledger"."fee_paise")
);
--> statement-breakpoint
CREATE TABLE "creator_payees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"encrypted" text NOT NULL,
	"masked" text NOT NULL,
	"policy_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"payee_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"approved_by" uuid NOT NULL,
	"state" text DEFAULT 'approved' NOT NULL,
	"bank_reference" text,
	"initiated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_payout_bank_reference" UNIQUE("bank_reference"),
	CONSTRAINT "creator_payout_money" CHECK ("creator_payouts"."amount_paise">0 AND "creator_payouts"."approved_by"<>"creator_payouts"."creator_id" AND "creator_payouts"."state" IN ('approved','initiated','uncertain','confirmed','failed','cancelled'))
);
--> statement-breakpoint
ALTER TABLE "course_payment_checks" ADD CONSTRAINT "course_payment_checks_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_finance_events" ADD CONSTRAINT "creator_finance_events_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_finance_events" ADD CONSTRAINT "creator_finance_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_ledger" ADD CONSTRAINT "creator_ledger_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_ledger" ADD CONSTRAINT "creator_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_payees" ADD CONSTRAINT "creator_payees_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_payouts" ADD CONSTRAINT "creator_payouts_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_payouts" ADD CONSTRAINT "creator_payouts_payee_id_creator_payees_id_fk" FOREIGN KEY ("payee_id") REFERENCES "public"."creator_payees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_payouts" ADD CONSTRAINT "creator_payouts_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_payouts" ADD CONSTRAINT "creator_payouts_initiated_by_users_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_inbox_due" ON "course_payment_inbox" USING btree ("state","next_attempt_at");--> statement-breakpoint
CREATE INDEX "creator_ledger_owner" ON "creator_ledger" USING btree ("creator_id","created_at");--> statement-breakpoint
-- Existing orders are not rewritten. Historical recovery binds only after a
-- successful authenticated provider lookup against the frozen order amount.
INSERT INTO course_payment_checks(order_id,scope,issue) SELECT id,'unbound','historical_reconciliation_required' FROM orders WHERE status IN ('pending','paid','refunded','chargeback');
--> statement-breakpoint
CREATE FUNCTION creator_money_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'immutable financial evidence'; END $$;
--> statement-breakpoint
CREATE TRIGGER creator_ledger_immutable BEFORE UPDATE OR DELETE ON creator_ledger FOR EACH ROW EXECUTE FUNCTION creator_money_immutable();
CREATE TRIGGER creator_ledger_no_truncate BEFORE TRUNCATE ON creator_ledger FOR EACH STATEMENT EXECUTE FUNCTION creator_money_immutable();
CREATE TRIGGER creator_payee_immutable BEFORE UPDATE OR DELETE ON creator_payees FOR EACH ROW EXECUTE FUNCTION creator_money_immutable();
CREATE TRIGGER creator_payee_no_truncate BEFORE TRUNCATE ON creator_payees FOR EACH STATEMENT EXECUTE FUNCTION creator_money_immutable();
CREATE TRIGGER creator_finance_event_immutable BEFORE UPDATE OR DELETE ON creator_finance_events FOR EACH ROW EXECUTE FUNCTION creator_money_immutable();
CREATE TRIGGER creator_finance_event_no_truncate BEFORE TRUNCATE ON creator_finance_events FOR EACH STATEMENT EXECUTE FUNCTION creator_money_immutable();
CREATE TRIGGER creator_payout_no_delete BEFORE DELETE ON creator_payouts FOR EACH ROW EXECUTE FUNCTION creator_money_immutable();
CREATE TRIGGER creator_payout_no_truncate BEFORE TRUNCATE ON creator_payouts FOR EACH STATEMENT EXECUTE FUNCTION creator_money_immutable();
--> statement-breakpoint
CREATE FUNCTION creator_ledger_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o orders; c course_payment_checks;
BEGIN
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
CREATE TRIGGER creator_ledger_guard BEFORE INSERT ON creator_ledger FOR EACH ROW EXECUTE FUNCTION creator_ledger_guard();
--> statement-breakpoint
CREATE FUNCTION creator_finance_event_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.action='save_payee' THEN
  IF NEW.actor_id<>NEW.creator_id OR NOT EXISTS(SELECT 1 FROM creator_payees WHERE id=NEW.entity_id AND creator_id=NEW.creator_id) THEN RAISE EXCEPTION 'owner payee acceptance required'; END IF;
 ELSIF NEW.actor_id=NEW.creator_id OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.actor_id AND role='admin') OR length(btrim(NEW.evidence))<5 THEN RAISE EXCEPTION 'independent persisted Admin evidence required'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER creator_finance_event_guard BEFORE INSERT ON creator_finance_events FOR EACH ROW EXECUTE FUNCTION creator_finance_event_guard();
--> statement-breakpoint
CREATE FUNCTION creator_payee_proof() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM creator_finance_events WHERE entity_id=NEW.id AND actor_id=NEW.creator_id AND action='save_payee') OR NEW.policy_version<>'creator-monthly-bank-2026-01' THEN RAISE EXCEPTION 'immutable settlement policy acceptance required'; END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER creator_payee_proof AFTER INSERT ON creator_payees DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION creator_payee_proof();
--> statement-breakpoint
CREATE FUNCTION creator_payout_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v creator_finance_events; net bigint; matured bigint; reserved bigint; p creator_payees; cutoff timestamptz;
BEGIN
 PERFORM 1 FROM users WHERE id=NEW.creator_id FOR UPDATE;
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
CREATE TRIGGER creator_payout_guard BEFORE INSERT OR UPDATE ON creator_payouts FOR EACH ROW EXECUTE FUNCTION creator_payout_guard();
--> statement-breakpoint
CREATE FUNCTION creator_payout_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e creator_finance_events; expected_action text;
BEGIN
 expected_action:=CASE NEW.state WHEN 'approved' THEN 'approve_payout' WHEN 'initiated' THEN 'initiate_payout' WHEN 'uncertain' THEN 'uncertain_payout' WHEN 'confirmed' THEN 'confirm_payout' WHEN 'failed' THEN 'fail_payout' WHEN 'cancelled' THEN 'cancel_payout' END;
 SELECT * INTO e FROM creator_finance_events WHERE entity_id=NEW.id AND action=expected_action ORDER BY created_at DESC,id DESC LIMIT 1;
 IF NEW.state='uncertain' AND TG_OP='UPDATE' AND OLD.state='approved' AND (NEW.initiated_by IS DISTINCT FROM e.actor_id OR NEW.initiated_by=NEW.approved_by) THEN RAISE EXCEPTION 'independent uncertain bank execution required'; END IF;
 IF e.id IS NULL OR e.creator_id<>NEW.creator_id OR NEW.state='approved' AND e.actor_id<>NEW.approved_by OR NEW.state='initiated' AND (e.actor_id<>NEW.initiated_by OR NEW.initiated_by=NEW.approved_by OR NEW.bank_reference IS NULL) OR NEW.state IN ('confirmed','failed') AND e.actor_id=NEW.initiated_by THEN RAISE EXCEPTION 'independent bank settlement audit required'; END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER creator_payout_proof AFTER INSERT OR UPDATE ON creator_payouts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION creator_payout_proof();

--> statement-breakpoint
CREATE FUNCTION course_check_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'UPDATE' THEN RAISE EXCEPTION 'retained payment recovery required'; END IF;
 IF NEW.order_id<>OLD.order_id OR OLD.scope<>'unbound' AND NEW.scope<>OLD.scope OR OLD.payment_id IS NOT NULL AND NEW.payment_id IS DISTINCT FROM OLD.payment_id THEN RAISE EXCEPTION 'bound payment identity immutable'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER course_check_guard BEFORE UPDATE OR DELETE ON course_payment_checks FOR EACH ROW EXECUTE FUNCTION course_check_guard();
CREATE TRIGGER course_check_no_truncate BEFORE TRUNCATE ON course_payment_checks FOR EACH STATEMENT EXECUTE FUNCTION creator_money_immutable();
--> statement-breakpoint
CREATE FUNCTION course_order_recovery_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.created_at IS DISTINCT FROM OLD.created_at OR OLD.status='paid' AND (NEW.razorpay_payment_id IS DISTINCT FROM OLD.razorpay_payment_id OR NEW.status NOT IN ('paid','refunded','chargeback')) THEN RAISE EXCEPTION 'captured payment identity immutable'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER course_order_recovery_guard BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION course_order_recovery_guard();
--> statement-breakpoint
CREATE FUNCTION course_paid_proof() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.creator_id IS NOT NULL AND NEW.status='paid' THEN
  IF NOT EXISTS(SELECT 1 FROM creator_ledger WHERE order_id=NEW.id AND creator_id=NEW.creator_id AND kind='sale' AND evidence->>'paymentId'=NEW.razorpay_payment_id) OR NOT EXISTS(SELECT 1 FROM course_payment_checks WHERE order_id=NEW.id AND payment_id=NEW.razorpay_payment_id) THEN RAISE EXCEPTION 'atomic paid earnings and payment evidence required'; END IF;
 END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER course_paid_proof AFTER INSERT OR UPDATE ON orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION course_paid_proof();
--> statement-breakpoint
CREATE FUNCTION course_inbox_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'retained webhook inbox required'; END IF;
 IF (NEW.id,NEW.scope,NEW.hash,NEW.payment_id,NEW.dispute_id,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.scope,OLD.hash,OLD.payment_id,OLD.dispute_id,OLD.created_at) OR NEW.attempts<OLD.attempts OR NEW.state NOT IN ('pending','done') OR OLD.state='done' AND NEW.state<>'done' THEN RAISE EXCEPTION 'immutable webhook identity and monotonic processing required'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER course_inbox_guard BEFORE UPDATE OR DELETE ON course_payment_inbox FOR EACH ROW EXECUTE FUNCTION course_inbox_guard();
CREATE TRIGGER course_inbox_no_truncate BEFORE TRUNCATE ON course_payment_inbox FOR EACH STATEMENT EXECUTE FUNCTION creator_money_immutable();
--> statement-breakpoint
-- Balance corrections require an immutable proposal and a second independent
-- Admin's statement evidence. No generic mutable balance or commission field.
CREATE FUNCTION creator_adjustment_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p creator_finance_events;
BEGIN
 IF NEW.kind='adjustment' THEN
  SELECT * INTO p FROM creator_finance_events WHERE id=(NEW.evidence->>'proposalId')::uuid AND action='propose_adjustment';
  IF p.creator_id IS DISTINCT FROM NEW.creator_id OR p.entity_id IS DISTINCT FROM NEW.order_id OR p.actor_id::text IS NOT DISTINCT FROM NEW.evidence->>'approvedBy' OR NEW.net_paise IS DISTINCT FROM (p.evidence::jsonb->>'netPaise')::int OR NOT EXISTS(SELECT 1 FROM creator_finance_events WHERE entity_id=NEW.order_id AND action='approve_adjustment' AND actor_id::text=NEW.evidence->>'approvedBy' AND evidence::jsonb->>'proposalId'=p.id::text) THEN RAISE EXCEPTION 'independent evidenced balance adjustment required'; END IF;
 END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER creator_adjustment_proof AFTER INSERT ON creator_ledger DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION creator_adjustment_proof();
--> statement-breakpoint
CREATE FUNCTION creator_bank_execution_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v creator_finance_events; net bigint; reserved bigint;
BEGIN
 PERFORM 1 FROM users WHERE id=NEW.creator_id FOR UPDATE;
 IF OLD.state='approved' AND NEW.state IN ('initiated','uncertain') THEN
  SELECT * INTO v FROM creator_finance_events WHERE entity_id=NEW.payee_id AND action IN ('verify_payee','reject_payee') ORDER BY created_at DESC,id DESC LIMIT 1;
  IF v.action IS DISTINCT FROM 'verify_payee' OR NOT EXISTS(SELECT 1 FROM course_finance_runs WHERE scope=NEW.scope AND disputes_checked_at>now()-interval '24 hours') OR EXISTS(SELECT 1 FROM course_payment_checks c JOIN orders o ON o.id=c.order_id WHERE o.creator_id=NEW.creator_id AND o.status IN ('paid','refunded','chargeback') AND (c.scope<>NEW.scope OR c.issue IS NOT NULL OR c.last_checked_at IS NULL OR c.last_checked_at<now()-interval '24 hours')) OR EXISTS(SELECT 1 FROM course_payment_inbox WHERE scope=NEW.scope AND state='pending') THEN RAISE EXCEPTION 'reconcile and verify payee again before bank execution'; END IF;
  SELECT coalesce(sum(net_paise),0) INTO net FROM creator_ledger WHERE creator_id=NEW.creator_id AND scope=NEW.scope;
  SELECT coalesce(sum(amount_paise),0) INTO reserved FROM creator_payouts WHERE creator_id=NEW.creator_id AND scope=NEW.scope AND state NOT IN ('failed','cancelled');
  IF net<reserved THEN RAISE EXCEPTION 'refund or chargeback changed available proceeds; cancel and reapprove'; END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER creator_bank_execution_guard BEFORE UPDATE ON creator_payouts FOR EACH ROW EXECUTE FUNCTION creator_bank_execution_guard();
