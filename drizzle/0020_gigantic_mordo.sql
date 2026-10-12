CREATE TABLE "workspace_refund_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"membership_order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_account_id" text NOT NULL,
	"provider_mode" text NOT NULL,
	"provider_payment_id" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"currency" text NOT NULL,
	"state" text DEFAULT 'prepared' NOT NULL,
	"provider_refund_id" text,
	"started_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"evidence_hash" text,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_refund_attempt_request_unique" UNIQUE("request_id"),
	CONSTRAINT "workspace_refund_attempt_order_unique" UNIQUE("membership_order_id"),
	CONSTRAINT "workspace_refund_attempt_snapshot_unique" UNIQUE("id","membership_order_id","user_id"),
	CONSTRAINT "workspace_refund_attempt_check" CHECK ("workspace_refund_attempts"."amount_paise" > 0 AND "workspace_refund_attempts"."currency" = 'INR' AND "workspace_refund_attempts"."provider_mode" = 'test' AND "workspace_refund_attempts"."provider_payment_id" ~ '^pay_[A-Za-z0-9]{6,80}$' AND "workspace_refund_attempts"."state" IN ('prepared','processing','completed','failed','uncertain') AND ("workspace_refund_attempts"."provider_refund_id" IS NULL OR "workspace_refund_attempts"."provider_refund_id" ~ '^rfnd_[A-Za-z0-9]{6,80}$') AND ("workspace_refund_attempts"."evidence_hash" IS NULL OR "workspace_refund_attempts"."evidence_hash" ~ '^[a-f0-9]{64}$') AND ("workspace_refund_attempts"."state" <> 'completed' OR ("workspace_refund_attempts"."provider_refund_id" IS NOT NULL AND "workspace_refund_attempts"."evidence_hash" IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "workspace_refund_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_account_id" text NOT NULL,
	"provider_mode" text NOT NULL,
	"provider_payment_id" text NOT NULL,
	"provider_refund_id" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"currency" text NOT NULL,
	"evidence_hash" text NOT NULL,
	"confirmed_at" timestamp with time zone NOT NULL,
	"evidence" jsonb NOT NULL,
	CONSTRAINT "workspace_refund_completion_order_unique" UNIQUE("membership_order_id"),
	CONSTRAINT "workspace_refund_completion_provider_unique" UNIQUE("provider_account_id","provider_mode","provider_refund_id"),
	CONSTRAINT "workspace_refund_completion_check" CHECK ("workspace_refund_completions"."amount_paise" > 0 AND "workspace_refund_completions"."currency" = 'INR' AND "workspace_refund_completions"."provider_mode" = 'test' AND "workspace_refund_completions"."provider_refund_id" ~ '^rfnd_[A-Za-z0-9]{6,80}$' AND "workspace_refund_completions"."provider_payment_id" ~ '^pay_[A-Za-z0-9]{6,80}$' AND "workspace_refund_completions"."evidence_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "workspace_refund_notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_order_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_refund_notice_unique" UNIQUE("membership_order_id","kind"),
	CONSTRAINT "workspace_refund_notice_kind_check" CHECK ("workspace_refund_notices"."kind" IN ('received','rejected','initiated','completed'))
);
--> statement-breakpoint
CREATE TABLE "workspace_refund_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_order_id" uuid NOT NULL,
	"evidence_hash" text NOT NULL,
	"outcome" text NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_refund_observation_unique" UNIQUE("membership_order_id","evidence_hash"),
	CONSTRAINT "workspace_refund_observation_check" CHECK ("workspace_refund_observations"."evidence_hash" ~ '^[a-f0-9]{64}$' AND "workspace_refund_observations"."outcome" IN ('none','processing','partial_review','full','mismatch_review'))
);
--> statement-breakpoint
CREATE TABLE "workspace_refund_policy_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"policy_version" text NOT NULL,
	"policy_content_hash" text NOT NULL,
	"accepted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_refund_policy_user_version_unique" UNIQUE("user_id","policy_version"),
	CONSTRAINT "workspace_refund_policy_acceptance_snapshot_unique" UNIQUE("id","user_id","policy_version","policy_content_hash","accepted_at"),
	CONSTRAINT "workspace_refund_policy_acceptance_time_check" CHECK ("workspace_refund_policy_acceptances"."accepted_at" = "workspace_refund_policy_acceptances"."created_at")
);
--> statement-breakpoint
CREATE TABLE "workspace_refund_policy_versions" (
	"policy_version" text PRIMARY KEY NOT NULL,
	"content_hash" text NOT NULL,
	"canonical_content" text NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_policy_version_hash_unique" UNIQUE("policy_version","content_hash"),
	CONSTRAINT "workspace_refund_policy_content_check" CHECK ("workspace_refund_policy_versions"."policy_version" ~ '^workspace_refund_policy_[a-zA-Z0-9_]+$' AND "workspace_refund_policy_versions"."content_hash" = encode(sha256(convert_to("workspace_refund_policy_versions"."canonical_content", 'UTF8')), 'hex'))
);
--> statement-breakpoint
CREATE TABLE "workspace_refund_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"membership_order_id" uuid NOT NULL,
	"request_key" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"requested_at" timestamp with time zone NOT NULL,
	"eligibility_deadline" timestamp with time zone NOT NULL,
	"amount_paise" integer NOT NULL,
	"currency" text NOT NULL,
	"decision" text DEFAULT 'requested' NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_refund_request_order_unique" UNIQUE("membership_order_id"),
	CONSTRAINT "workspace_refund_request_key_unique" UNIQUE("user_id","request_key"),
	CONSTRAINT "workspace_refund_request_owner_unique" UNIQUE("id","membership_order_id","user_id"),
	CONSTRAINT "workspace_refund_request_check" CHECK ("workspace_refund_requests"."requested_at" = "workspace_refund_requests"."created_at" AND "workspace_refund_requests"."requested_at" <= "workspace_refund_requests"."eligibility_deadline" AND "workspace_refund_requests"."amount_paise" > 0 AND "workspace_refund_requests"."currency" = 'INR' AND "workspace_refund_requests"."payload_hash" ~ '^[a-f0-9]{64}$' AND "workspace_refund_requests"."reason" IN ('mistake','unsuitable','technical','changed_mind','other') AND ("workspace_refund_requests"."note" IS NULL OR length("workspace_refund_requests"."note") <= 2000) AND (("workspace_refund_requests"."decision" = 'requested' AND "workspace_refund_requests"."decided_by" IS NULL AND "workspace_refund_requests"."decided_at" IS NULL AND "workspace_refund_requests"."rejection_reason" IS NULL) OR ("workspace_refund_requests"."decision" IN ('approved','rejected') AND "workspace_refund_requests"."decided_by" IS NOT NULL AND "workspace_refund_requests"."decided_at" >= "workspace_refund_requests"."requested_at" AND (("workspace_refund_requests"."decision" = 'approved' AND "workspace_refund_requests"."rejection_reason" IS NULL) OR ("workspace_refund_requests"."decision" = 'rejected' AND length(trim("workspace_refund_requests"."rejection_reason")) BETWEEN 1 AND 2000 AND "workspace_refund_requests"."rejection_reason" IS NOT NULL)))))
);
--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD COLUMN "refund_policy_acceptance_id" uuid;--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD COLUMN "refund_policy_version" text;--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD COLUMN "refund_policy_content_hash" text;--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD COLUMN "refund_policy_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workspace_refund_attempts" ADD CONSTRAINT "workspace_refund_attempts_request_id_membership_order_id_user_id_workspace_refund_requests_id_membership_order_id_user_id_fk" FOREIGN KEY ("request_id","membership_order_id","user_id") REFERENCES "public"."workspace_refund_requests"("id","membership_order_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_refund_completions" ADD CONSTRAINT "workspace_refund_completions_membership_order_id_user_id_workspace_membership_orders_id_user_id_fk" FOREIGN KEY ("membership_order_id","user_id") REFERENCES "public"."workspace_membership_orders"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_refund_notices" ADD CONSTRAINT "workspace_refund_notices_membership_order_id_workspace_membership_orders_id_fk" FOREIGN KEY ("membership_order_id") REFERENCES "public"."workspace_membership_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_refund_observations" ADD CONSTRAINT "workspace_refund_observations_membership_order_id_workspace_membership_orders_id_fk" FOREIGN KEY ("membership_order_id") REFERENCES "public"."workspace_membership_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_refund_policy_acceptances" ADD CONSTRAINT "workspace_refund_policy_acceptances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_refund_policy_acceptances" ADD CONSTRAINT "workspace_refund_policy_acceptance_document_fk" FOREIGN KEY ("policy_version","policy_content_hash") REFERENCES "public"."workspace_refund_policy_versions"("policy_version","content_hash") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_refund_requests" ADD CONSTRAINT "workspace_refund_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_refund_requests" ADD CONSTRAINT "workspace_refund_requests_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_refund_requests" ADD CONSTRAINT "workspace_refund_requests_membership_order_id_user_id_workspace_membership_orders_id_user_id_fk" FOREIGN KEY ("membership_order_id","user_id") REFERENCES "public"."workspace_membership_orders"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_refund_provider_id_idx" ON "workspace_refund_attempts" USING btree ("provider_account_id","provider_mode","provider_refund_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_refund_policy_current_idx" ON "workspace_refund_policy_versions" USING btree ("is_current") WHERE "workspace_refund_policy_versions"."is_current";--> statement-breakpoint
CREATE INDEX "workspace_refund_queue_idx" ON "workspace_refund_requests" USING btree ("decision","requested_at");--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD CONSTRAINT "workspace_orders_refund_policy_snapshot_fk" FOREIGN KEY ("refund_policy_acceptance_id","user_id","refund_policy_version","refund_policy_content_hash","refund_policy_accepted_at") REFERENCES "public"."workspace_refund_policy_acceptances"("id","user_id","policy_version","policy_content_hash","accepted_at") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD CONSTRAINT "workspace_orders_refund_policy_snapshot_check" CHECK (("workspace_membership_orders"."refund_policy_acceptance_id" IS NULL AND "workspace_membership_orders"."refund_policy_version" IS NULL AND "workspace_membership_orders"."refund_policy_content_hash" IS NULL AND "workspace_membership_orders"."refund_policy_accepted_at" IS NULL) OR ("workspace_membership_orders"."refund_policy_acceptance_id" IS NOT NULL AND "workspace_membership_orders"."refund_policy_version" IS NOT NULL AND "workspace_membership_orders"."refund_policy_content_hash" IS NOT NULL AND "workspace_membership_orders"."refund_policy_accepted_at" IS NOT NULL AND "workspace_membership_orders"."refund_policy_accepted_at" <= "workspace_membership_orders"."created_at"));
--> statement-breakpoint
CREATE FUNCTION workspace_refund_policy_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Workspace Refund Policy acceptance history is immutable' USING ERRCODE='23514';
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_refund_policy_acceptance_history_guard BEFORE UPDATE OR DELETE ON workspace_refund_policy_acceptances FOR EACH ROW EXECUTE FUNCTION workspace_refund_policy_history_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_refund_policy_acceptance_truncate_guard BEFORE TRUNCATE ON workspace_refund_policy_acceptances FOR EACH STATEMENT EXECUTE FUNCTION workspace_refund_policy_history_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_refund_policy_versions_truncate_guard BEFORE TRUNCATE ON workspace_refund_policy_versions FOR EACH STATEMENT EXECUTE FUNCTION workspace_refund_policy_history_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_refund_policy_document_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'Workspace Refund Policy documents cannot be deleted' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'is_current') IS DISTINCT FROM (to_jsonb(OLD)-'is_current') THEN
    RAISE EXCEPTION 'Contractual text requires a new Refund Policy version' USING ERRCODE='23514';
  END IF;
  IF NEW.canonical_content::jsonb->>'version' IS DISTINCT FROM NEW.policy_version
     OR (NEW.canonical_content::jsonb->>'effectiveAt')::timestamptz IS DISTINCT FROM NEW.effective_at THEN
    RAISE EXCEPTION 'Refund Policy document metadata mismatch' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_refund_policy_document_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_refund_policy_versions FOR EACH ROW EXECUTE FUNCTION workspace_refund_policy_document_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_refund_policy_acceptance_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d workspace_refund_policy_versions;
BEGIN
  SELECT * INTO d FROM workspace_refund_policy_versions WHERE policy_version=NEW.policy_version AND content_hash=NEW.policy_content_hash AND is_current FOR SHARE;
  IF NOT FOUND OR NEW.accepted_at < d.effective_at OR NEW.accepted_at > clock_timestamp() THEN
    RAISE EXCEPTION 'Acceptance requires current effective Refund Policy and server time' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_refund_policy_acceptance_insert_guard BEFORE INSERT ON workspace_refund_policy_acceptances FOR EACH ROW EXECUTE FUNCTION workspace_refund_policy_acceptance_insert_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_new_order_refund_policy_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d workspace_refund_policy_versions;
BEGIN
  -- Prospective only: existing nullable snapshots are preserved; no historical UPDATE/backfill.
  SELECT * INTO d FROM workspace_refund_policy_versions WHERE is_current FOR SHARE;
  IF NOT FOUND OR NEW.refund_policy_acceptance_id IS NULL
     OR NEW.refund_policy_version IS DISTINCT FROM d.policy_version
     OR NEW.refund_policy_content_hash IS DISTINCT FROM d.content_hash
     OR NEW.refund_policy_accepted_at IS NULL OR NEW.refund_policy_accepted_at < d.effective_at
     OR NEW.refund_policy_accepted_at > NEW.created_at OR NEW.created_at > clock_timestamp() THEN
    RAISE EXCEPTION 'New Workspace orders require current Refund Policy acceptance' USING ERRCODE='23514';
  END IF;
  -- Composite FK verifies acceptance ID, owner, version, hash and timestamp together.
  -- Existing workspace_financial_orders_guard protects all new snapshot columns on UPDATE.
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_new_order_refund_policy_guard BEFORE INSERT ON workspace_membership_orders FOR EACH ROW EXECUTE FUNCTION workspace_new_order_refund_policy_guard();

--> statement-breakpoint
INSERT INTO workspace_refund_policy_versions (policy_version,content_hash,canonical_content,effective_at,is_current) VALUES ('workspace_refund_policy_2026_01','fe79d0c69ecc7bf38c8c7ca714818c9a3b083454ed3f6e1de32bd2dd0e14b7dc',$workspace_refund${"version":"workspace_refund_policy_2026_01","effectiveAt":"2026-10-12T12:00:00.000Z","title":"AirBharath Workspace Refund Policy","sections":[{"title":"Who this policy covers","paragraphs":["This policy applies to paid AirBharath Workspace memberships provided by Eresha Technology Innovators Pvt. Ltd., operating the AirBharath brand, at West Patel Nagar, New Delhi 110008, India. Contact academy@airbharath.in for support.","This policy is separate from the Creator Terms. Both current agreements must be explicitly accepted before a new membership purchase."]},{"title":"Your 72-hour request window","paragraphs":["You may request a full refund within exactly 72 elapsed hours of the authoritative successful-payment time recorded for your Workspace order. The deadline is that payment time plus 72 hours. A request recorded by our server at or before the displayed deadline is timely. Browser time does not decide eligibility.","Order creation, browser confirmation, Early Access, membership start and the 9 November 2026 launch date do not start or extend this window. If payment timing has not been authoritatively established, contact support rather than assuming a refund deadline.","Submitting a timely request preserves it for later AirBharath review, even when the review occurs after the 72-hour deadline."]},{"title":"Request and review","paragraphs":["Use Request refund in your authenticated Workspace membership area. Choose a reason; additional details are optional. Do not supply card, bank account or UPI details. There is one self-service refund case per order.","AirBharath reviews requests and may approve or reject them under this policy, the Creator Terms and applicable law. Rejection includes a recorded reason and ends that self-service case. You may contact support separately; an exception is not promised.","A flag, suspension or allegation of materially false information does not automatically deny an otherwise timely request. Relevant facts require a deliberate review and decision."]},{"title":"Full amount and original payment method","paragraphs":["V1 supports a full refund only: the entire captured Workspace order total actually paid after coupon discounts and GST. There are no partial, percentage, custom-amount, downgrade, wallet-credit or Workspace-credit refunds under this policy.","No AirBharath administration fee, processing fee or Razorpay merchant fee is deducted from your refundable amount. Merchant processing charges borne by AirBharath are separate.","Approved refunds are initiated against the original captured payment through its payment provider and returned through the original payment method. We do not collect alternative payout details. Arrival may take additional provider and bank processing time; we do not guarantee a particular bank-credit date."]},{"title":"Approval, processing and completed refunds","paragraphs":["Approval leads to provider refund initiation; approval and initiation do not mean a refund has completed or that money has reached your bank. A processing problem may require reconciliation and review.","Your membership remains usable while a request is pending, approved, processing or uncertain, unless an independent account restriction applies. Rejection does not change the paid term.","Only authoritative provider confirmation of the full refund ends the paid Workspace entitlement from the affected membership. Your creator profile, private drafts, review history and builder content are retained for historical/read access under the existing access rules. Paid editing requires a new paid entitlement; refund does not authorize publication."]},{"title":"Coupons and policy history","paragraphs":["A refund does not restore coupon usage capacity or reverse historical redemption. The same user cannot reuse a consumed coupon merely because the order was refunded. Order and coupon attribution remain recorded.","Future contractual changes require a new policy version and new acceptance for new purchases. Existing order snapshots and paid memberships are not invalidated simply because later policy wording changes."]},{"title":"Applicable law and contact","paragraphs":["This policy operates subject to applicable Indian law and does not remove mandatory legal rights. Disputes may be brought before courts of competent jurisdiction in New Delhi, India, consistently with the Creator Terms. Contact academy@airbharath.in for questions."]}]}$workspace_refund$,'2026-10-12T12:00:00.000Z',true);
--> statement-breakpoint
CREATE FUNCTION workspace_refund_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Workspace refund evidence is append-only' USING ERRCODE='23514'; END $$;
--> statement-breakpoint
CREATE FUNCTION workspace_refund_request_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o workspace_membership_orders; p workspace_payment_attempts; actor_role text;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Refund cases cannot be deleted' USING ERRCODE='23514'; END IF;
 SELECT * INTO o FROM workspace_membership_orders WHERE id=NEW.membership_order_id FOR UPDATE;
 IF TG_OP='INSERT' THEN
  -- The insert itself determines durable request time; caller-supplied/backdated time is ignored.
  NEW.requested_at := clock_timestamp(); NEW.created_at := NEW.requested_at;
  SELECT * INTO p FROM workspace_payment_attempts WHERE membership_order_id=o.id AND winner FOR SHARE;
  IF o.id IS NULL OR NEW.user_id IS DISTINCT FROM o.user_id OR o.financial_state<>'captured' OR o.activation_state NOT IN ('fulfilled','pending_activation') OR o.review_reason IS NOT NULL
   OR o.paid_at IS NULL OR o.refund_eligible_until IS NULL OR o.refund_eligible_until IS DISTINCT FROM o.paid_at+interval '72 hours'
   OR NEW.eligibility_deadline IS DISTINCT FROM o.refund_eligible_until OR NEW.amount_paise IS DISTINCT FROM o.total_paise OR NEW.currency IS DISTINCT FROM o.currency
   OR NEW.requested_at<o.paid_at OR NEW.requested_at>clock_timestamp() OR NEW.requested_at>NEW.eligibility_deadline OR NEW.decision<>'requested'
   OR p.id IS NULL OR p.state<>'captured' OR p.refunded_paise<>0 OR p.provider_payment_id IS DISTINCT FROM o.winning_payment_id OR p.amount_paise IS DISTINCT FROM o.total_paise OR p.currency IS DISTINCT FROM o.currency
   OR EXISTS(SELECT 1 FROM workspace_refund_completions WHERE membership_order_id=o.id) THEN
    RAISE EXCEPTION 'Refund request must snapshot a timely owned captured payment' USING ERRCODE='23514';
  END IF;
 ELSE
  IF (to_jsonb(NEW)-ARRAY['decision','decided_by','decided_at','rejection_reason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['decision','decided_by','decided_at','rejection_reason'])
    OR OLD.decision<>'requested' OR NEW.decision NOT IN ('approved','rejected') OR NEW.decided_at>clock_timestamp() THEN
   RAISE EXCEPTION 'Refund snapshots and terminal decisions are immutable' USING ERRCODE='23514';
  END IF;
  SELECT role INTO actor_role FROM users WHERE id=NEW.decided_by FOR SHARE;
  IF actor_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Refund decisions require a persisted admin' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_refund_request_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_refund_requests FOR EACH ROW EXECUTE FUNCTION workspace_refund_request_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_refund_attempt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o workspace_membership_orders; r workspace_refund_requests;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Refund attempts cannot be deleted' USING ERRCODE='23514'; END IF;
 SELECT * INTO o FROM workspace_membership_orders WHERE id=NEW.membership_order_id FOR UPDATE;
 SELECT * INTO r FROM workspace_refund_requests WHERE id=NEW.request_id;
 IF r.id IS NULL OR r.decision<>'approved' OR NEW.user_id IS DISTINCT FROM o.user_id OR NEW.membership_order_id IS DISTINCT FROM r.membership_order_id
  OR NEW.provider_account_id IS DISTINCT FROM o.provider_account_id OR NEW.provider_mode IS DISTINCT FROM o.provider_mode OR NEW.provider_payment_id IS DISTINCT FROM o.winning_payment_id
  OR NEW.amount_paise IS DISTINCT FROM o.total_paise OR NEW.currency IS DISTINCT FROM o.currency THEN
  RAISE EXCEPTION 'Refund attempt must match approved full payment' USING ERRCODE='23514';
 END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.state<>'prepared' OR NEW.started_at IS NOT NULL OR NEW.provider_refund_id IS NOT NULL OR NEW.evidence_hash IS NOT NULL THEN RAISE EXCEPTION 'Refund intent must be prepared before submission' USING ERRCODE='23514'; END IF;
 ELSE
  IF (to_jsonb(NEW)-ARRAY['state','provider_refund_id','started_at','last_checked_at','evidence_hash','error_code']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','provider_refund_id','started_at','last_checked_at','evidence_hash','error_code'])
   OR OLD.state='completed' OR (OLD.provider_refund_id IS NOT NULL AND NEW.provider_refund_id IS DISTINCT FROM OLD.provider_refund_id)
   OR (NEW.state='prepared' AND NOT (OLD.state='failed' AND OLD.error_code='definitive_rejection' AND OLD.provider_refund_id IS NULL))
   OR (OLD.state='prepared' AND NEW.state NOT IN ('uncertain','completed'))
   OR (NEW.started_at IS DISTINCT FROM OLD.started_at AND NOT ((OLD.state='prepared' AND NEW.state='uncertain' AND NEW.started_at IS NOT NULL) OR (OLD.state='failed' AND OLD.error_code='definitive_rejection' AND NEW.state='prepared' AND NEW.started_at IS NULL))) THEN
    RAISE EXCEPTION 'Invalid refund execution transition or identity rewrite' USING ERRCODE='23514';
  END IF;
 END IF;
 IF NEW.state='completed' AND NOT EXISTS(SELECT 1 FROM workspace_refund_completions c WHERE c.membership_order_id=o.id AND c.provider_refund_id=NEW.provider_refund_id AND c.evidence_hash=NEW.evidence_hash) THEN
  RAISE EXCEPTION 'Completed attempt requires authoritative full-refund evidence' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_refund_attempt_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_refund_attempts FOR EACH ROW EXECUTE FUNCTION workspace_refund_attempt_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_refund_completion_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o workspace_membership_orders; p jsonb; r jsonb;
BEGIN
 SELECT * INTO o FROM workspace_membership_orders WHERE id=NEW.membership_order_id FOR UPDATE;
 p:=NEW.evidence->'payment'; r:=NEW.evidence->'refund';
 IF o.id IS NULL OR o.financial_state<>'captured' OR o.winning_payment_id IS NULL OR NEW.user_id IS DISTINCT FROM o.user_id
  OR NEW.provider_account_id IS DISTINCT FROM o.provider_account_id OR NEW.provider_mode IS DISTINCT FROM o.provider_mode OR NEW.provider_payment_id IS DISTINCT FROM o.winning_payment_id
  OR NEW.amount_paise IS DISTINCT FROM o.total_paise OR NEW.currency IS DISTINCT FROM o.currency OR NEW.confirmed_at>clock_timestamp()
  OR NEW.evidence->>'rule' IS DISTINCT FROM 'razorpay_full_refund_fetch_v1'
  OR p->>'accountId' IS DISTINCT FROM o.provider_account_id OR p->>'mode' IS DISTINCT FROM o.provider_mode OR p->>'id' IS DISTINCT FROM o.winning_payment_id OR p->>'orderId' IS DISTINCT FROM o.provider_order_id
  OR p->>'state' IS DISTINCT FROM 'captured' OR p->>'currency' IS DISTINCT FROM o.currency OR (p->>'amountPaise')::integer IS DISTINCT FROM o.total_paise
  OR (p->>'refundedPaise')::integer IS DISTINCT FROM o.total_paise OR p->>'refundStatus' IS DISTINCT FROM 'full'
  OR r->>'id' IS DISTINCT FROM NEW.provider_refund_id OR r->>'paymentId' IS DISTINCT FROM o.winning_payment_id OR r->>'accountId' IS DISTINCT FROM o.provider_account_id OR r->>'mode' IS DISTINCT FROM o.provider_mode
  OR r->>'status' IS DISTINCT FROM 'processed' OR r->>'currency' IS DISTINCT FROM o.currency OR (r->>'amountPaise')::integer IS DISTINCT FROM o.total_paise THEN
   RAISE EXCEPTION 'Full refund requires exact scoped processed provider evidence' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_refund_completion_insert_guard BEFORE INSERT ON workspace_refund_completions FOR EACH ROW EXECUTE FUNCTION workspace_refund_completion_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_refund_approval_complete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM workspace_refund_requests r WHERE r.id=NEW.id AND r.decision='approved' AND NOT EXISTS(SELECT 1 FROM workspace_refund_attempts a WHERE a.request_id=r.id)) THEN
  RAISE EXCEPTION 'Refund approval must commit a durable provider intent' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workspace_refund_approval_complete AFTER INSERT OR UPDATE ON workspace_refund_requests DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_refund_approval_complete();
--> statement-breakpoint
CREATE FUNCTION workspace_membership_refund_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM id FROM workspace_membership_orders WHERE id=NEW.membership_order_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM workspace_refund_completions WHERE membership_order_id=NEW.membership_order_id) THEN RAISE EXCEPTION 'Refunded payment cannot grant a new membership' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_membership_refund_insert_guard BEFORE INSERT ON workspace_memberships FOR EACH ROW EXECUTE FUNCTION workspace_membership_refund_insert_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_refund_completion_history_guard BEFORE UPDATE OR DELETE ON workspace_refund_completions FOR EACH ROW EXECUTE FUNCTION workspace_refund_history_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_refund_observation_history_guard BEFORE UPDATE OR DELETE ON workspace_refund_observations FOR EACH ROW EXECUTE FUNCTION workspace_refund_history_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_refund_notice_history_guard BEFORE UPDATE OR DELETE ON workspace_refund_notices FOR EACH ROW EXECUTE FUNCTION workspace_refund_history_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_refund_requests_truncate_guard BEFORE TRUNCATE ON workspace_refund_requests FOR EACH STATEMENT EXECUTE FUNCTION workspace_refund_history_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_refund_attempts_truncate_guard BEFORE TRUNCATE ON workspace_refund_attempts FOR EACH STATEMENT EXECUTE FUNCTION workspace_refund_history_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_refund_completions_truncate_guard BEFORE TRUNCATE ON workspace_refund_completions FOR EACH STATEMENT EXECUTE FUNCTION workspace_refund_history_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_refund_observations_truncate_guard BEFORE TRUNCATE ON workspace_refund_observations FOR EACH STATEMENT EXECUTE FUNCTION workspace_refund_history_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_refund_notices_truncate_guard BEFORE TRUNCATE ON workspace_refund_notices FOR EACH STATEMENT EXECUTE FUNCTION workspace_refund_history_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_refund_notice_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.kind='completed' AND NOT EXISTS(SELECT 1 FROM workspace_refund_completions WHERE membership_order_id=NEW.membership_order_id))
  OR (NEW.kind='received' AND NOT EXISTS(SELECT 1 FROM workspace_refund_requests WHERE membership_order_id=NEW.membership_order_id))
  OR (NEW.kind='rejected' AND NOT EXISTS(SELECT 1 FROM workspace_refund_requests WHERE membership_order_id=NEW.membership_order_id AND decision='rejected'))
  OR (NEW.kind='initiated' AND NOT EXISTS(SELECT 1 FROM workspace_refund_attempts WHERE membership_order_id=NEW.membership_order_id AND provider_refund_id IS NOT NULL AND state IN ('processing','completed'))) THEN
  RAISE EXCEPTION 'Refund notices require the corresponding committed workflow fact' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_refund_notice_insert_guard BEFORE INSERT ON workspace_refund_notices FOR EACH ROW EXECUTE FUNCTION workspace_refund_notice_insert_guard();
