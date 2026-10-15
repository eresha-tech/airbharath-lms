CREATE TABLE "workspace_influencer_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"influencer_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_influencer_history_version_unique" UNIQUE("influencer_id","version")
);
--> statement-breakpoint
CREATE TABLE "workspace_influencers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "workspace_influencer_definition_check" CHECK (length("workspace_influencers"."display_name") BETWEEN 1 AND 120 AND ("workspace_influencers"."description" IS NULL OR length("workspace_influencers"."description") BETWEEN 1 AND 500) AND "workspace_influencers"."status" IN ('active','inactive') AND "workspace_influencers"."version">0)
);
--> statement-breakpoint
ALTER TABLE "workspace_coupons" ADD COLUMN "influencer_id" uuid;--> statement-breakpoint
ALTER TABLE "workspace_influencer_history" ADD CONSTRAINT "workspace_influencer_history_influencer_id_workspace_influencers_id_fk" FOREIGN KEY ("influencer_id") REFERENCES "public"."workspace_influencers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_influencer_history" ADD CONSTRAINT "workspace_influencer_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_influencers" ADD CONSTRAINT "workspace_influencers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_influencers" ADD CONSTRAINT "workspace_influencers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_coupons" ADD CONSTRAINT "workspace_coupons_influencer_id_workspace_influencers_id_fk" FOREIGN KEY ("influencer_id") REFERENCES "public"."workspace_influencers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- Existing immutable coupon guard automatically includes the new influencer_id.
-- No backfill: historical source labels are not inferred to be influencer identities.
CREATE FUNCTION workspace_influencer_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Influencer identity is historical' USING ERRCODE='23514'; END IF;
 PERFORM id FROM users WHERE id=NEW.updated_by AND role='admin' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Persisted admin required' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
   IF NEW.version<>1 OR NEW.created_by<>NEW.updated_by THEN RAISE EXCEPTION 'Invalid influencer origin' USING ERRCODE='23514'; END IF;
 ELSE
   IF NEW.id<>OLD.id OR NEW.created_by<>OLD.created_by OR NEW.created_at<>OLD.created_at OR NEW.version<>OLD.version+1 OR NEW.updated_at<=OLD.updated_at THEN
     RAISE EXCEPTION 'Influencer origin/version is immutable' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NEW;
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_influencer_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_influencers FOR EACH ROW EXECUTE FUNCTION workspace_influencer_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_influencer_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' OR pg_trigger_depth()<2 THEN RAISE EXCEPTION 'Influencer history is append-only and trigger-owned' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_influencer_history_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_influencer_history FOR EACH ROW EXECUTE FUNCTION workspace_influencer_history_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_influencer_history_append() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO workspace_influencer_history(influencer_id,actor_id,version,snapshot,created_at)
 VALUES(NEW.id,NEW.updated_by,NEW.version,jsonb_build_object('displayName',NEW.display_name,'description',NEW.description,'status',NEW.status),NEW.updated_at);
 RETURN NULL;
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_influencer_history_append AFTER INSERT OR UPDATE ON workspace_influencers FOR EACH ROW EXECUTE FUNCTION workspace_influencer_history_append();
--> statement-breakpoint
CREATE FUNCTION workspace_coupon_influencer_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM id FROM users WHERE id=NEW.created_by AND role='admin' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Persisted admin required' USING ERRCODE='23514'; END IF;
 IF NEW.source_type='influencer' AND NEW.influencer_id IS NULL THEN RAISE EXCEPTION 'New influencer coupon requires stable identity' USING ERRCODE='23514'; END IF;
 IF NEW.influencer_id IS NOT NULL THEN
   PERFORM id FROM workspace_influencers WHERE id=NEW.influencer_id AND status='active' FOR SHARE;
   IF NOT FOUND OR NEW.source_type<>'influencer' THEN RAISE EXCEPTION 'Active influencer required' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_coupon_influencer_guard BEFORE INSERT ON workspace_coupons FOR EACH ROW EXECUTE FUNCTION workspace_coupon_influencer_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_coupon_paid_evidence_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c workspace_coupons; o workspace_membership_orders;
BEGIN
 PERFORM id FROM users WHERE id=NEW.user_id FOR UPDATE;
 SELECT * INTO c FROM workspace_coupons WHERE id=NEW.coupon_id FOR UPDATE;
 IF TG_OP='INSERT' THEN
   IF c.influencer_id IS NOT NULL THEN
     PERFORM id FROM workspace_influencers WHERE id=c.influencer_id AND status='active' FOR SHARE;
     IF NOT FOUND THEN RAISE EXCEPTION 'Influencer campaign paused' USING ERRCODE='23514'; END IF;
   END IF;
 END IF;
 IF NEW.status='redeemed' THEN
   SELECT * INTO o FROM workspace_membership_orders WHERE id=NEW.membership_order_id FOR UPDATE;
   IF o.financial_state<>'captured' OR o.paid_at IS NULL OR o.activation_state='held_for_review' OR NOT EXISTS (
     SELECT 1 FROM workspace_payment_attempts p WHERE p.membership_order_id=o.id AND p.winner
     AND p.provider_payment_id=o.winning_payment_id AND p.state='captured' AND p.amount_paise=o.total_paise
     AND p.currency=o.currency AND p.captured_at=o.paid_at AND p.capture_time_source IS NOT NULL
   ) THEN RAISE EXCEPTION 'Paid redemption requires authoritative eligible capture' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_coupon_paid_evidence_guard BEFORE INSERT OR UPDATE ON workspace_coupon_redemptions FOR EACH ROW EXECUTE FUNCTION workspace_coupon_paid_evidence_guard();
