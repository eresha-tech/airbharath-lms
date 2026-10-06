CREATE TABLE "workspace_coupon_plans" (
	"coupon_id" uuid NOT NULL,
	"plan_code" text NOT NULL,
	CONSTRAINT "workspace_coupon_plans_coupon_id_plan_code_pk" PRIMARY KEY("coupon_id","plan_code"),
	CONSTRAINT "workspace_coupon_plans_code_check" CHECK ("workspace_coupon_plans"."plan_code" IN ('quarterly','half_yearly','yearly'))
);
--> statement-breakpoint
CREATE TABLE "workspace_coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text DEFAULT 'workspace_membership' NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"discount_type" text NOT NULL,
	"discount_value" integer NOT NULL,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"usage_limit" integer,
	"campaign_name" text NOT NULL,
	"source_type" text NOT NULL,
	"source_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "workspace_coupons_definition_check" CHECK ("workspace_coupons"."scope" = 'workspace_membership' AND "workspace_coupons"."code" ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$' AND "workspace_coupons"."status" IN ('active','paused','archived') AND (("workspace_coupons"."discount_type" = 'fixed' AND "workspace_coupons"."discount_value" BETWEEN 1 AND 100000000) OR ("workspace_coupons"."discount_type" = 'percentage' AND "workspace_coupons"."discount_value" BETWEEN 1 AND 9999)) AND ("workspace_coupons"."usage_limit" IS NULL OR "workspace_coupons"."usage_limit" > 0) AND ("workspace_coupons"."starts_at" IS NULL OR "workspace_coupons"."expires_at" IS NULL OR "workspace_coupons"."starts_at" < "workspace_coupons"."expires_at") AND length("workspace_coupons"."campaign_name") BETWEEN 1 AND 120 AND length("workspace_coupons"."source_name") BETWEEN 1 AND 120 AND "workspace_coupons"."source_type" IN ('influencer','partner','institution','founder','organic_campaign','internal','other') AND "workspace_coupons"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "workspace_membership_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"version" integer NOT NULL,
	"display_name" text NOT NULL,
	"duration_months" integer NOT NULL,
	"base_price_paise" integer NOT NULL,
	"tax_rate_bps" integer DEFAULT 1800 NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_by" uuid,
	CONSTRAINT "workspace_plans_definition_check" CHECK ("workspace_membership_plans"."version" > 0 AND length("workspace_membership_plans"."display_name") BETWEEN 1 AND 80 AND "workspace_membership_plans"."base_price_paise" BETWEEN 1 AND 100000000 AND "workspace_membership_plans"."tax_rate_bps" = 1800 AND "workspace_membership_plans"."currency" = 'INR' AND (("workspace_membership_plans"."code" = 'quarterly' AND "workspace_membership_plans"."duration_months" = 3) OR ("workspace_membership_plans"."code" = 'half_yearly' AND "workspace_membership_plans"."duration_months" = 6) OR ("workspace_membership_plans"."code" = 'yearly' AND "workspace_membership_plans"."duration_months" = 12)))
);
--> statement-breakpoint
ALTER TABLE "workspace_audit_events" DROP CONSTRAINT "workspace_audit_events_action_check";--> statement-breakpoint
ALTER TABLE "workspace_audit_events" ALTER COLUMN "settings_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_audit_events" ALTER COLUMN "previous_settings_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_audit_events" ADD COLUMN "coupon_id" uuid;--> statement-breakpoint
ALTER TABLE "workspace_audit_events" ADD COLUMN "before_status" text;--> statement-breakpoint
ALTER TABLE "workspace_audit_events" ADD COLUMN "after_status" text;--> statement-breakpoint
ALTER TABLE "workspace_coupon_plans" ADD CONSTRAINT "workspace_coupon_plans_coupon_id_workspace_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."workspace_coupons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_coupons" ADD CONSTRAINT "workspace_coupons_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_membership_plans" ADD CONSTRAINT "workspace_membership_plans_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_coupons_scope_code_idx" ON "workspace_coupons" USING btree ("scope","code");--> statement-breakpoint
CREATE INDEX "workspace_coupons_status_created_idx" ON "workspace_coupons" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_plans_code_version_idx" ON "workspace_membership_plans" USING btree ("code","version");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_plans_current_idx" ON "workspace_membership_plans" USING btree ("code") WHERE "workspace_membership_plans"."is_current" = true;--> statement-breakpoint
ALTER TABLE "workspace_audit_events" ADD CONSTRAINT "workspace_audit_events_coupon_id_workspace_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."workspace_coupons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_audit_events_coupon_created_idx" ON "workspace_audit_events" USING btree ("coupon_id","created_at");--> statement-breakpoint
ALTER TABLE "workspace_audit_events" ADD CONSTRAINT "workspace_audit_events_action_check" CHECK (("workspace_audit_events"."action" = 'eligibility_settings_published' AND "workspace_audit_events"."settings_id" IS NOT NULL AND "workspace_audit_events"."previous_settings_id" IS NOT NULL AND "workspace_audit_events"."coupon_id" IS NULL AND "workspace_audit_events"."before_status" IS NULL AND "workspace_audit_events"."after_status" IS NULL) OR ("workspace_audit_events"."action" IN ('coupon_created', 'coupon_status_changed') AND "workspace_audit_events"."settings_id" IS NULL AND "workspace_audit_events"."previous_settings_id" IS NULL AND "workspace_audit_events"."coupon_id" IS NOT NULL AND "workspace_audit_events"."after_status" IS NOT NULL AND "workspace_audit_events"."after_status" IN ('active','paused','archived') AND (("workspace_audit_events"."action" = 'coupon_created' AND "workspace_audit_events"."before_status" IS NULL AND "workspace_audit_events"."after_status" = 'active') OR ("workspace_audit_events"."action" = 'coupon_status_changed' AND "workspace_audit_events"."before_status" IS NOT NULL AND "workspace_audit_events"."before_status" IN ('active','paused') AND "workspace_audit_events"."before_status" <> "workspace_audit_events"."after_status"))));
--> statement-breakpoint
-- Deterministic approved plan versions only. No campaign coupon is seeded.
INSERT INTO workspace_membership_plans (id,code,version,display_name,duration_months,base_price_paise,tax_rate_bps,currency,is_current,available,published_at) VALUES
('14000000-0000-4000-8000-000000000001','quarterly',1,'Quarterly',3,499900,1800,'INR',true,true,'2026-10-06T00:00:00Z'),
('14000000-0000-4000-8000-000000000002','half_yearly',1,'Half-Yearly',6,899900,1800,'INR',true,true,'2026-10-06T00:00:00Z'),
('14000000-0000-4000-8000-000000000003','yearly',1,'Yearly',12,1699900,1800,'INR',true,true,'2026-10-06T00:00:00Z');
--> statement-breakpoint
CREATE FUNCTION workspace_phase14_plan_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Workspace plan history is immutable' USING ERRCODE = '23514'; END IF;
  IF (to_jsonb(NEW) - 'is_current') IS DISTINCT FROM (to_jsonb(OLD) - 'is_current') THEN
    RAISE EXCEPTION 'Publish a successor plan version; historical definitions are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER workspace_membership_plans_immutable BEFORE UPDATE OR DELETE ON workspace_membership_plans FOR EACH ROW EXECUTE FUNCTION workspace_phase14_plan_immutable();
--> statement-breakpoint
CREATE FUNCTION workspace_phase14_coupon_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Archive Workspace coupons instead of deleting' USING ERRCODE = '23514'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','version','updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','version','updated_at'])
    OR OLD.status = 'archived' OR NEW.status = OLD.status OR NEW.version <> OLD.version + 1 OR NEW.updated_at < OLD.updated_at THEN
    RAISE EXCEPTION 'Coupon definitions are immutable; only versioned status transitions are allowed' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER workspace_coupons_immutable BEFORE UPDATE OR DELETE ON workspace_coupons FOR EACH ROW EXECUTE FUNCTION workspace_phase14_coupon_immutable();
--> statement-breakpoint
CREATE FUNCTION workspace_phase14_applicability_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Coupon applicability is immutable' USING ERRCODE = '23514'; END IF;
  PERFORM id FROM workspace_coupons WHERE id = NEW.coupon_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM workspace_audit_events WHERE coupon_id = NEW.coupon_id AND action = 'coupon_created') THEN
    RAISE EXCEPTION 'Create a new coupon for different applicability' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER workspace_coupon_plans_immutable BEFORE INSERT OR UPDATE OR DELETE ON workspace_coupon_plans FOR EACH ROW EXECUTE FUNCTION workspace_phase14_applicability_immutable();
--> statement-breakpoint
-- At commit require normalized applicability, a paid-only offer and append-only actor evidence.
CREATE FUNCTION workspace_phase14_coupon_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_action text; expected_before text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    expected_action := 'coupon_created'; expected_before := NULL;
    IF NEW.status <> 'active' OR NEW.version <> 1 OR NOT EXISTS (SELECT 1 FROM workspace_coupon_plans WHERE coupon_id = NEW.id) OR EXISTS (
      SELECT 1 FROM workspace_coupon_plans cp LEFT JOIN workspace_membership_plans p ON p.code = cp.plan_code AND p.is_current
      WHERE cp.coupon_id = NEW.id AND (p.id IS NULL OR
        CASE WHEN NEW.discount_type = 'fixed' THEN NEW.discount_value ELSE round(p.base_price_paise::numeric * NEW.discount_value / 10000) END >= p.base_price_paise)
    ) THEN RAISE EXCEPTION 'Coupon must have applicable current plans and a positive paid base' USING ERRCODE = '23514'; END IF;
  ELSE
    expected_action := 'coupon_status_changed'; expected_before := OLD.status;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM workspace_audit_events WHERE coupon_id = NEW.id
    AND action = expected_action AND after_status = NEW.status
    AND before_status IS NOT DISTINCT FROM expected_before AND created_at >= NEW.updated_at) THEN
    RAISE EXCEPTION 'Coupon creation/status change requires audit evidence in the same transaction' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workspace_coupons_complete AFTER INSERT OR UPDATE ON workspace_coupons DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_phase14_coupon_complete();
