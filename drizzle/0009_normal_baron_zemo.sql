CREATE TYPE "public"."workspace_eligibility_result" AS ENUM('eligible', 'ineligible');--> statement-breakpoint
CREATE TABLE "workspace_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"settings_id" uuid NOT NULL,
	"action" text DEFAULT 'eligibility_settings_published' NOT NULL,
	"previous_settings_id" uuid NOT NULL,
	"request_key" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_audit_events_action_check" CHECK ("workspace_audit_events"."action" = 'eligibility_settings_published')
);
--> statement-breakpoint
CREATE TABLE "workspace_eligibility_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"settings_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"submission_key" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"category" text NOT NULL,
	"aviation_profession" text DEFAULT '' NOT NULL,
	"experience_option" text NOT NULL,
	"experience_months" integer NOT NULL,
	"professional_status" text NOT NULL,
	"professional_status_detail" text DEFAULT '' NOT NULL,
	"professional_profile_url" text NOT NULL,
	"teaching_category" text NOT NULL,
	"course_idea" text NOT NULL,
	"declarations" jsonb NOT NULL,
	"source" text DEFAULT 'automatic' NOT NULL,
	"evaluator_version" text NOT NULL,
	"result" "workspace_eligibility_result" NOT NULL,
	"reasons" jsonb NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"decided_at" timestamp with time zone NOT NULL,
	"eligible_until" timestamp with time zone,
	"reapply_at" timestamp with time zone,
	"accepted_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_eligibility_attempts_dates_check" CHECK (("workspace_eligibility_attempts"."result" = 'eligible' AND "workspace_eligibility_attempts"."eligible_until" IS NOT NULL AND "workspace_eligibility_attempts"."eligible_until" > "workspace_eligibility_attempts"."decided_at" AND "workspace_eligibility_attempts"."reapply_at" IS NULL) OR ("workspace_eligibility_attempts"."result" = 'ineligible' AND "workspace_eligibility_attempts"."reapply_at" IS NOT NULL AND "workspace_eligibility_attempts"."reapply_at" > "workspace_eligibility_attempts"."decided_at" AND "workspace_eligibility_attempts"."eligible_until" IS NULL)),
	CONSTRAINT "workspace_eligibility_attempts_source_check" CHECK ("workspace_eligibility_attempts"."source" = 'automatic'),
	CONSTRAINT "workspace_eligibility_attempts_text_check" CHECK (length("workspace_eligibility_attempts"."course_idea") BETWEEN 1 AND 200 AND length("workspace_eligibility_attempts"."professional_profile_url") <= 2048 AND length("workspace_eligibility_attempts"."aviation_profession") <= 120 AND length("workspace_eligibility_attempts"."professional_status_detail") <= 120),
	CONSTRAINT "workspace_eligibility_attempts_experience_check" CHECK ("workspace_eligibility_attempts"."experience_months" = CASE "workspace_eligibility_attempts"."experience_option" WHEN 'under_one' THEN 0 WHEN 'one_year' THEN 12 WHEN 'two_years' THEN 24 WHEN 'three_to_five' THEN 36 WHEN 'six_to_ten' THEN 72 WHEN 'eleven_to_fifteen' THEN 132 WHEN 'sixteen_to_twenty' THEN 192 WHEN 'twenty_plus' THEN 240 ELSE -1 END AND "workspace_eligibility_attempts"."experience_months" >= 0),
	CONSTRAINT "workspace_eligibility_attempts_declarations_check" CHECK ("workspace_eligibility_attempts"."declarations" @> '{"adult":true,"expertise":true,"accuracy":true,"eligibilityOnly":true,"courseReview":true,"audience":true,"authorizedClaims":true}'::jsonb)
);
--> statement-breakpoint
CREATE TABLE "workspace_eligibility_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer NOT NULL,
	"config" jsonb NOT NULL,
	"configuration_hash" text NOT NULL,
	"evaluator_version" text NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_by" uuid,
	CONSTRAINT "workspace_eligibility_settings_version_unique" UNIQUE("version"),
	CONSTRAINT "workspace_eligibility_settings_version_check" CHECK ("workspace_eligibility_settings"."version" > 0),
	CONSTRAINT "workspace_eligibility_settings_bounds_check" CHECK (("workspace_eligibility_settings"."config"->>'minimumExperienceMonths')::integer BETWEEN 1 AND 600 AND ("workspace_eligibility_settings"."config"->>'eligibilityValidityDays')::integer BETWEEN 1 AND 90 AND ("workspace_eligibility_settings"."config"->>'cooldownDays')::integer BETWEEN 1 AND 90 AND "workspace_eligibility_settings"."config"->>'timezone' = 'Asia/Kolkata' AND jsonb_typeof("workspace_eligibility_settings"."config"->'profileRequired') = 'boolean' AND jsonb_array_length("workspace_eligibility_settings"."config"->'allowedCategories') BETWEEN 1 AND 15)
);
--> statement-breakpoint
CREATE TABLE "workspace_policy_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" text NOT NULL,
	"kind" text DEFAULT 'eligibility' NOT NULL,
	"declarations" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_policy_versions_version_unique" UNIQUE("version"),
	CONSTRAINT "workspace_policy_versions_kind_check" CHECK ("workspace_policy_versions"."kind" = 'eligibility')
);
--> statement-breakpoint
ALTER TABLE "workspace_audit_events" ADD CONSTRAINT "workspace_audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_audit_events" ADD CONSTRAINT "workspace_audit_events_settings_id_workspace_eligibility_settings_id_fk" FOREIGN KEY ("settings_id") REFERENCES "public"."workspace_eligibility_settings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_audit_events" ADD CONSTRAINT "workspace_audit_events_previous_settings_id_workspace_eligibility_settings_id_fk" FOREIGN KEY ("previous_settings_id") REFERENCES "public"."workspace_eligibility_settings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_eligibility_attempts" ADD CONSTRAINT "workspace_eligibility_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_eligibility_attempts" ADD CONSTRAINT "workspace_eligibility_attempts_settings_id_workspace_eligibility_settings_id_fk" FOREIGN KEY ("settings_id") REFERENCES "public"."workspace_eligibility_settings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_eligibility_attempts" ADD CONSTRAINT "workspace_eligibility_attempts_policy_id_workspace_policy_versions_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."workspace_policy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_eligibility_settings" ADD CONSTRAINT "workspace_eligibility_settings_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_audit_events_actor_key_idx" ON "workspace_audit_events" USING btree ("actor_id","request_key");--> statement-breakpoint
CREATE INDEX "workspace_audit_events_settings_created_idx" ON "workspace_audit_events" USING btree ("settings_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_eligibility_attempts_user_key_idx" ON "workspace_eligibility_attempts" USING btree ("user_id","submission_key");--> statement-breakpoint
CREATE INDEX "workspace_eligibility_attempts_user_decided_idx" ON "workspace_eligibility_attempts" USING btree ("user_id","decided_at");--> statement-breakpoint
CREATE INDEX "workspace_eligibility_attempts_result_decided_idx" ON "workspace_eligibility_attempts" USING btree ("result","decided_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_eligibility_settings_current_idx" ON "workspace_eligibility_settings" USING btree ("is_current") WHERE "workspace_eligibility_settings"."is_current" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_policy_versions_current_idx" ON "workspace_policy_versions" USING btree ("kind") WHERE "workspace_policy_versions"."is_current" = true;
--> statement-breakpoint
-- Initial approved configuration and recoverable declaration text. No account or application seeding.
INSERT INTO "workspace_eligibility_settings" ("id", "version", "config", "configuration_hash", "evaluator_version", "is_current")
VALUES ('22222222-2222-4222-8222-222222222222', 1, '{"minimumExperienceMonths":24,"allowedCategories":["pilot_flight_crew","cabin_crew","aircraft_maintenance","ground_operations","airport_operations","aviation_safety","aviation_security","flight_operations","aviation_management","aviation_hospitality","aviation_trainer","aviation_career","drone_uav","defence_aviation","other_aviation"],"profileRequired":true,"eligibilityValidityDays":30,"cooldownDays":7,"launchAt":"2026-11-08T18:30:00.000Z","timezone":"Asia/Kolkata"}'::jsonb, 'eb1c999c828766fb84b23ff9fd5b1987acdf7afaa78629f776c4ec3708c688a2', 'workspace-eligibility-v1', true);
--> statement-breakpoint
INSERT INTO "workspace_policy_versions" ("id", "version", "kind", "declarations", "content_hash", "is_current")
VALUES ('33333333-3333-4333-8333-333333333333', 'workspace-eligibility-declarations-v1', 'eligibility', '{"adult":"I confirm that I am 18 years of age or older and legally able to enter into the AirBharath Workspace Creator agreement.","expertise":"I confirm that I have genuine aviation experience or expertise relevant to the subject I intend to teach.","accuracy":"I confirm that the information I have provided is accurate.","eligibilityOnly":"I understand that Workspace eligibility does not mean my future courses are approved.","courseReview":"I understand that courses may be separately reviewed before publication.","audience":"I understand that creators are initially responsible for bringing and promoting to their own audience or network.","authorizedClaims":"I will not represent a course as DGCA, airline, government or regulatory approved unless I have genuine authorization."}'::jsonb, '76fc9ebced39d41f83deea4aa468bb4b35b98efc9c5e9d5ba95404a413e08885', true);
--> statement-breakpoint
-- Immutable history is enforced in PostgreSQL, in addition to service boundaries.
CREATE FUNCTION workspace_phase13_immutable_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Workspace history cannot be updated or deleted' USING ERRCODE = '23514';
END;
$$;
--> statement-breakpoint
CREATE FUNCTION workspace_phase13_version_pointer_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Published Workspace versions cannot be deleted' USING ERRCODE = '23514';
  END IF;
  IF (to_jsonb(NEW) - 'is_current') IS DISTINCT FROM (to_jsonb(OLD) - 'is_current') THEN
    RAISE EXCEPTION 'Publish a new Workspace version instead of editing history' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER workspace_eligibility_attempts_immutable BEFORE UPDATE OR DELETE ON workspace_eligibility_attempts
FOR EACH ROW EXECUTE FUNCTION workspace_phase13_immutable_history();
--> statement-breakpoint
CREATE TRIGGER workspace_audit_events_immutable BEFORE UPDATE OR DELETE ON workspace_audit_events
FOR EACH ROW EXECUTE FUNCTION workspace_phase13_immutable_history();
--> statement-breakpoint
CREATE TRIGGER workspace_eligibility_settings_immutable BEFORE UPDATE OR DELETE ON workspace_eligibility_settings
FOR EACH ROW EXECUTE FUNCTION workspace_phase13_version_pointer_only();
--> statement-breakpoint
CREATE TRIGGER workspace_policy_versions_immutable BEFORE UPDATE OR DELETE ON workspace_policy_versions
FOR EACH ROW EXECUTE FUNCTION workspace_phase13_version_pointer_only();
