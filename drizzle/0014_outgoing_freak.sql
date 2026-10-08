CREATE TABLE "workspace_course_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"creator_profile_id" uuid NOT NULL,
	"request_key" uuid NOT NULL,
	"creation_hash" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"target_learner" text NOT NULL,
	"learning_outcomes" jsonb NOT NULL,
	"outline" jsonb NOT NULL,
	"tentative_price_paise" integer,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_drafts_category_check" CHECK ("workspace_course_drafts"."category" IN ('pilot_flight_crew', 'cabin_crew', 'aircraft_maintenance', 'ground_operations', 'airport_operations', 'aviation_safety', 'aviation_security', 'flight_operations', 'aviation_management', 'aviation_hospitality', 'aviation_trainer', 'aviation_career', 'drone_uav', 'defence_aviation', 'other_aviation')),
	CONSTRAINT "workspace_drafts_status_check" CHECK ("workspace_course_drafts"."status" = 'draft' AND "workspace_course_drafts"."currency" = 'INR'),
	CONSTRAINT "workspace_drafts_version_time_check" CHECK ("workspace_course_drafts"."version" > 0 AND "workspace_course_drafts"."updated_at" >= "workspace_course_drafts"."created_at"),
	CONSTRAINT "workspace_drafts_price_check" CHECK ("workspace_course_drafts"."tentative_price_paise" IS NULL OR "workspace_course_drafts"."tentative_price_paise" BETWEEN 1 AND 100000000),
	CONSTRAINT "workspace_drafts_text_check" CHECK (length("workspace_course_drafts"."title") BETWEEN 3 AND 200 AND length("workspace_course_drafts"."description") BETWEEN 50 AND 5000 AND length("workspace_course_drafts"."target_learner") BETWEEN 1 AND 1000 AND "workspace_course_drafts"."creation_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "workspace_drafts_json_check" CHECK (CASE WHEN jsonb_typeof("workspace_course_drafts"."learning_outcomes") = 'array' AND jsonb_typeof("workspace_course_drafts"."outline") = 'array' THEN jsonb_array_length("workspace_course_drafts"."learning_outcomes") BETWEEN 1 AND 10 AND jsonb_array_length("workspace_course_drafts"."outline") <= 20 ELSE false END)
);
--> statement-breakpoint
CREATE TABLE "workspace_creator_profile_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"creator_profile_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"professional_headline" text DEFAULT '' NOT NULL,
	"short_bio" text DEFAULT '' NOT NULL,
	"primary_aviation_category" text NOT NULL,
	"professional_profile_url" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_profile_details_category_check" CHECK ("workspace_creator_profile_details"."primary_aviation_category" IN ('pilot_flight_crew', 'cabin_crew', 'aircraft_maintenance', 'ground_operations', 'airport_operations', 'aviation_safety', 'aviation_security', 'flight_operations', 'aviation_management', 'aviation_hospitality', 'aviation_trainer', 'aviation_career', 'drone_uav', 'defence_aviation', 'other_aviation')),
	CONSTRAINT "workspace_profile_details_version_check" CHECK ("workspace_creator_profile_details"."version" > 0),
	CONSTRAINT "workspace_profile_details_time_check" CHECK ("workspace_creator_profile_details"."updated_at" >= "workspace_creator_profile_details"."created_at"),
	CONSTRAINT "workspace_profile_details_content_check" CHECK (length("workspace_creator_profile_details"."display_name") BETWEEN 2 AND 100 AND length("workspace_creator_profile_details"."professional_headline") <= 160 AND length("workspace_creator_profile_details"."short_bio") <= 1000 AND ("workspace_creator_profile_details"."professional_profile_url" IS NULL OR (length("workspace_creator_profile_details"."professional_profile_url") <= 2048 AND "workspace_creator_profile_details"."professional_profile_url" LIKE 'https://%')))
);
--> statement-breakpoint
ALTER TABLE "workspace_course_drafts" ADD CONSTRAINT "workspace_course_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_course_drafts" ADD CONSTRAINT "workspace_drafts_owner_fk" FOREIGN KEY ("creator_profile_id","user_id") REFERENCES "public"."workspace_creator_profiles"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_creator_profile_details" ADD CONSTRAINT "workspace_creator_profile_details_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_creator_profile_details" ADD CONSTRAINT "workspace_profile_details_owner_fk" FOREIGN KEY ("creator_profile_id","user_id") REFERENCES "public"."workspace_creator_profiles"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_drafts_request_owner_idx" ON "workspace_course_drafts" USING btree ("user_id","request_key");--> statement-breakpoint
CREATE INDEX "workspace_drafts_owner_updated_idx" ON "workspace_course_drafts" USING btree ("user_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_profile_details_owner_idx" ON "workspace_creator_profile_details" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_profile_details_profile_idx" ON "workspace_creator_profile_details" USING btree ("creator_profile_id");--> statement-breakpoint
-- Mutable content with immutable identity/ownership and no hard-delete path.
CREATE FUNCTION workspace_guard_creator_content() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Workspace creator content must be retained' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.version <> 1 OR NEW.updated_at <> NEW.created_at THEN
      RAISE EXCEPTION 'Invalid initial Workspace content version' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.creator_profile_id IS DISTINCT FROM OLD.creator_profile_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.version <> OLD.version + 1 OR NEW.updated_at < OLD.updated_at THEN
    RAISE EXCEPTION 'Invalid Workspace content ownership or version transition' USING ERRCODE = '23514';
  END IF;
  IF TG_TABLE_NAME = 'workspace_course_drafts' THEN
    IF NEW.request_key IS DISTINCT FROM OLD.request_key OR NEW.creation_hash IS DISTINCT FROM OLD.creation_hash THEN
      RAISE EXCEPTION 'Workspace creation request is immutable' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER workspace_drafts_content_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_course_drafts
FOR EACH ROW EXECUTE FUNCTION workspace_guard_creator_content();
--> statement-breakpoint
CREATE TRIGGER workspace_profile_details_content_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_creator_profile_details
FOR EACH ROW EXECUTE FUNCTION workspace_guard_creator_content();
