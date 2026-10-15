CREATE TABLE "workspace_access_grant_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"request_key" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_grant_event_context_check" CHECK ("workspace_access_grant_events"."action" IN ('granted','revoked','expired') AND length(btrim("workspace_access_grant_events"."reason")) BETWEEN 10 AND 1000 AND "workspace_access_grant_events"."payload_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "workspace_access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"creator_profile_id" uuid NOT NULL,
	"eligibility_attempt_id" uuid NOT NULL,
	"source" text DEFAULT 'admin_complimentary' NOT NULL,
	"scope" text DEFAULT 'creator_workspace' NOT NULL,
	"environment" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"granted_by" uuid NOT NULL,
	"request_key" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"terms_version" text NOT NULL,
	"terms_content_hash" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"close_reason" text,
	CONSTRAINT "workspace_grant_context_check" CHECK ("workspace_access_grants"."source"='admin_complimentary' AND "workspace_access_grants"."scope"='creator_workspace' AND "workspace_access_grants"."environment" IN ('development','test','production') AND "workspace_access_grants"."payload_hash" ~ '^[a-f0-9]{64}$' AND length(btrim("workspace_access_grants"."reason")) BETWEEN 10 AND 1000),
	CONSTRAINT "workspace_grant_term_check" CHECK ("workspace_access_grants"."starts_at">="workspace_access_grants"."created_at" AND "workspace_access_grants"."starts_at"<="workspace_access_grants"."created_at"+interval '30 days' AND "workspace_access_grants"."expires_at">"workspace_access_grants"."starts_at" AND "workspace_access_grants"."expires_at"<=((("workspace_access_grants"."starts_at" AT TIME ZONE 'Asia/Kolkata')+interval '12 months') AT TIME ZONE 'Asia/Kolkata')),
	CONSTRAINT "workspace_grant_status_check" CHECK (("workspace_access_grants"."status"='active' AND "workspace_access_grants"."closed_at" IS NULL AND "workspace_access_grants"."closed_by" IS NULL AND "workspace_access_grants"."close_reason" IS NULL) OR ("workspace_access_grants"."status" IN ('revoked','expired') AND "workspace_access_grants"."closed_at" IS NOT NULL AND "workspace_access_grants"."closed_at">="workspace_access_grants"."created_at" AND "workspace_access_grants"."closed_by" IS NOT NULL AND length(btrim("workspace_access_grants"."close_reason")) BETWEEN 10 AND 1000 AND ("workspace_access_grants"."status"<>'expired' OR "workspace_access_grants"."closed_at">="workspace_access_grants"."expires_at")))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_grant_owner_idx" ON "workspace_access_grants" USING btree ("id","user_id");--> statement-breakpoint
ALTER TABLE "workspace_access_grant_events" ADD CONSTRAINT "workspace_access_grant_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_access_grant_events" ADD CONSTRAINT "workspace_grant_event_owner_fk" FOREIGN KEY ("grant_id","user_id") REFERENCES "public"."workspace_access_grants"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_access_grants" ADD CONSTRAINT "workspace_access_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_access_grants" ADD CONSTRAINT "workspace_access_grants_eligibility_attempt_id_workspace_eligibility_attempts_id_fk" FOREIGN KEY ("eligibility_attempt_id") REFERENCES "public"."workspace_eligibility_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_access_grants" ADD CONSTRAINT "workspace_access_grants_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_access_grants" ADD CONSTRAINT "workspace_access_grants_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_access_grants" ADD CONSTRAINT "workspace_grant_profile_owner_fk" FOREIGN KEY ("creator_profile_id","user_id") REFERENCES "public"."workspace_creator_profiles"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_access_grants" ADD CONSTRAINT "workspace_grant_terms_fk" FOREIGN KEY ("terms_version","terms_content_hash") REFERENCES "public"."workspace_creator_terms_versions"("terms_version","content_hash") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_grant_event_actor_key_idx" ON "workspace_access_grant_events" USING btree ("actor_id","request_key");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_grant_event_action_idx" ON "workspace_access_grant_events" USING btree ("grant_id","action");--> statement-breakpoint
CREATE INDEX "workspace_grant_event_created_idx" ON "workspace_access_grant_events" USING btree ("created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_grant_actor_key_idx" ON "workspace_access_grants" USING btree ("granted_by","request_key");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_grant_open_owner_idx" ON "workspace_access_grants" USING btree ("user_id","environment") WHERE "workspace_access_grants"."status"='active';--> statement-breakpoint
CREATE INDEX "workspace_grant_owner_expiry_idx" ON "workspace_access_grants" USING btree ("user_id","environment","expires_at");--> statement-breakpoint
CREATE INDEX "workspace_grant_created_idx" ON "workspace_access_grants" USING btree ("created_at","id");
--> statement-breakpoint
-- Administrative authorization history is append-only; only explicit closure is mutable.
CREATE FUNCTION workspace_grant_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor uuid; owner uuid; a workspace_eligibility_attempts; t workspace_creator_terms_versions;
BEGIN
 IF TG_OP IN ('DELETE','TRUNCATE') THEN RAISE EXCEPTION 'Grant history is retained' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='workspace_access_grant_events' THEN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Grant events are immutable' USING ERRCODE='23514'; END IF;
  actor:=NEW.actor_id; owner:=NEW.user_id;
 ELSE
  actor:=CASE WHEN TG_OP='INSERT' THEN NEW.granted_by ELSE NEW.closed_by END; owner:=NEW.user_id;
  IF TG_OP='UPDATE' AND (OLD.status<>'active' OR NEW.status NOT IN ('expired','revoked') OR
   (to_jsonb(NEW)-ARRAY['status','closed_at','closed_by','close_reason']) IS DISTINCT FROM
   (to_jsonb(OLD)-ARRAY['status','closed_at','closed_by','close_reason'])) THEN
   RAISE EXCEPTION 'Grant terms are immutable' USING ERRCODE='23514';
  END IF;
 END IF;
 PERFORM id FROM users WHERE id IN (actor,owner) ORDER BY id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=actor AND role='admin') THEN RAISE EXCEPTION 'Persisted administrator required' USING ERRCODE='42501'; END IF;
 IF TG_TABLE_NAME='workspace_access_grants' AND TG_OP='INSERT' THEN
  IF NEW.status<>'active' OR NEW.created_at>clock_timestamp() OR NEW.created_at<clock_timestamp()-interval '1 minute' THEN RAISE EXCEPTION 'Invalid grant creation' USING ERRCODE='23514'; END IF;
  SELECT * INTO a FROM workspace_eligibility_attempts WHERE id=NEW.eligibility_attempt_id;
  SELECT * INTO t FROM workspace_creator_terms_versions WHERE is_current;
  IF a.user_id IS DISTINCT FROM owner OR a.result<>'eligible' OR a.eligible_until<=NEW.starts_at OR
   a.id IS DISTINCT FROM (SELECT id FROM workspace_eligibility_attempts WHERE user_id=owner ORDER BY decided_at DESC,id DESC LIMIT 1) OR
   NOT EXISTS(SELECT 1 FROM workspace_eligibility_settings WHERE id=a.settings_id AND is_current) OR
   NOT EXISTS(SELECT 1 FROM workspace_policy_versions WHERE id=a.policy_id AND is_current) OR
   t.terms_version IS DISTINCT FROM NEW.terms_version OR t.content_hash IS DISTINCT FROM NEW.terms_content_hash OR t.effective_at>NEW.created_at OR
   NOT EXISTS(SELECT 1 FROM workspace_creator_profiles WHERE id=NEW.creator_profile_id AND user_id=owner AND status='enabled') THEN
   RAISE EXCEPTION 'Eligible identity and current Creator Terms required' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_grants_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_access_grants FOR EACH ROW EXECUTE FUNCTION workspace_grant_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_grants_no_truncate BEFORE TRUNCATE ON workspace_access_grants FOR EACH STATEMENT EXECUTE FUNCTION workspace_grant_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_grant_events_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_access_grant_events FOR EACH ROW EXECUTE FUNCTION workspace_grant_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_grant_events_no_truncate BEFORE TRUNCATE ON workspace_access_grant_events FOR EACH STATEMENT EXECUTE FUNCTION workspace_grant_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_grant_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g workspace_access_grants; e workspace_access_grant_events;
BEGIN
 SELECT * INTO g FROM workspace_access_grants WHERE id=CASE WHEN TG_TABLE_NAME='workspace_access_grants' THEN NEW.id ELSE NEW.grant_id END;
 SELECT * INTO e FROM workspace_access_grant_events WHERE grant_id=g.id AND action='granted';
 IF e.id IS NULL OR e.user_id<>g.user_id OR e.actor_id<>g.granted_by OR e.reason<>g.reason OR e.request_key<>g.request_key OR e.payload_hash<>g.payload_hash OR e.created_at<>g.created_at THEN RAISE EXCEPTION 'Grant and matching audit must commit together' USING ERRCODE='23514'; END IF;
 IF g.status<>'active' AND NOT EXISTS(SELECT 1 FROM workspace_access_grant_events WHERE grant_id=g.id AND action=g.status AND actor_id=g.closed_by AND reason=g.close_reason AND created_at=g.closed_at) THEN RAISE EXCEPTION 'Grant closure needs durable audit' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM workspace_access_grant_events WHERE grant_id=g.id AND action<>'granted' AND (action<>g.status OR actor_id<>g.closed_by OR reason<>g.close_reason OR created_at<>g.closed_at)) THEN RAISE EXCEPTION 'Audit must match grant transition' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END; $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workspace_grant_complete AFTER INSERT OR UPDATE ON workspace_access_grants DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_grant_complete();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workspace_grant_event_complete AFTER INSERT ON workspace_access_grant_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_grant_complete();
--> statement-breakpoint
-- Extend only the identity-completion branch; paid order/membership invariants remain unchanged.
CREATE OR REPLACE FUNCTION workspace_phase15b_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o workspace_membership_orders; m workspace_memberships;
BEGIN
 IF TG_TABLE_NAME='workspace_creator_profiles' THEN
   IF NOT EXISTS(SELECT 1 FROM workspace_memberships WHERE creator_profile_id=NEW.id AND user_id=NEW.user_id AND fulfilled_at=NEW.created_at) AND NOT EXISTS(SELECT 1 FROM workspace_access_grants WHERE creator_profile_id=NEW.id AND user_id=NEW.user_id AND created_at=NEW.created_at) THEN
     RAISE EXCEPTION 'Creator identity must commit with membership fulfillment or audited administrative grant' USING ERRCODE='23514';
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
