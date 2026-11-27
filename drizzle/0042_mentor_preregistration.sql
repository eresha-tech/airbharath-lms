CREATE TABLE "mentor_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"submission_key" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"specialisation" text NOT NULL,
	"professional_role" text NOT NULL,
	"years_experience" integer NOT NULL,
	"profile_url" text DEFAULT '' NOT NULL,
	"description" text NOT NULL,
	"adult" boolean DEFAULT true NOT NULL,
	"consent" boolean DEFAULT true NOT NULL,
	"consent_version" text NOT NULL,
	"consent_text" text NOT NULL,
	"adult_text" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mentor_application_values" CHECK ("mentor_applications"."status" IN ('submitted','under_review','shortlisted','not_selected','contacted') AND "mentor_applications"."specialisation" IN ('flight_operations','cabin_crew','ground_operations','safety_quality','maintenance','training','management_other') AND "mentor_applications"."years_experience" BETWEEN 0 AND 70 AND length("mentor_applications"."full_name") BETWEEN 2 AND 120 AND length("mentor_applications"."email") BETWEEN 3 AND 254 AND "mentor_applications"."email"=lower("mentor_applications"."email") AND length("mentor_applications"."phone")<=24 AND length("mentor_applications"."professional_role") BETWEEN 2 AND 160 AND length("mentor_applications"."profile_url")<=2048 AND length("mentor_applications"."description") BETWEEN 30 AND 2000 AND "mentor_applications"."adult" AND "mentor_applications"."consent" AND length("mentor_applications"."consent_version") BETWEEN 1 AND 120 AND length("mentor_applications"."consent_text") BETWEEN 20 AND 1000 AND length("mentor_applications"."adult_text") BETWEEN 20 AND 1000 AND "mentor_applications"."payload_hash" ~ '^[a-f0-9]{64}$' AND "mentor_applications"."version">0 AND "mentor_applications"."updated_at">="mentor_applications"."submitted_at")
);
--> statement-breakpoint
CREATE TABLE "mentor_review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"request_key" uuid NOT NULL,
	"command_hash" text NOT NULL,
	"version" integer NOT NULL,
	"status" text NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mentor_review_values" CHECK ("mentor_review_events"."status" IN ('under_review','shortlisted','not_selected','contacted') AND "mentor_review_events"."version">1 AND "mentor_review_events"."command_hash" ~ '^[a-f0-9]{64}$' AND length("mentor_review_events"."note") BETWEEN 3 AND 2000)
);
--> statement-breakpoint
CREATE TABLE "mentor_submission_limits" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"attempts" integer NOT NULL,
	CONSTRAINT "mentor_limit_values" CHECK ("mentor_submission_limits"."attempts" BETWEEN 1 AND 21)
);
--> statement-breakpoint
ALTER TABLE "mentor_applications" ADD CONSTRAINT "mentor_applications_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_review_events" ADD CONSTRAINT "mentor_review_events_application_id_mentor_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."mentor_applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_review_events" ADD CONSTRAINT "mentor_review_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_submission_limits" ADD CONSTRAINT "mentor_submission_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mentor_owner_unique" ON "mentor_applications" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mentor_email_unique" ON "mentor_applications" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "mentor_submission_unique" ON "mentor_applications" USING btree ("submission_key");--> statement-breakpoint
CREATE INDEX "mentor_queue_idx" ON "mentor_applications" USING btree ("status","specialisation","submitted_at","id");--> statement-breakpoint
CREATE INDEX "mentor_time_idx" ON "mentor_applications" USING btree ("submitted_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "mentor_review_request_unique" ON "mentor_review_events" USING btree ("actor_id","request_key");--> statement-breakpoint
CREATE UNIQUE INDEX "mentor_review_version_unique" ON "mentor_review_events" USING btree ("application_id","version");--> statement-breakpoint
-- Screening records cannot grant Creator access, publish a profile or execute money.
CREATE FUNCTION mentor_application_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor uuid; BEGIN
 IF TG_OP IN ('DELETE','TRUNCATE') THEN RAISE EXCEPTION 'mentor application history is protected'; END IF;
 actor:=nullif(current_setting('airbharath.mentor_actor',true),'')::uuid;
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM users WHERE id=actor) THEN RAISE EXCEPTION 'persisted mentor actor required'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.owner_id<>actor OR NEW.status<>'submitted' OR NEW.version<>1 OR NEW.submitted_at<>NEW.updated_at THEN RAISE EXCEPTION 'owned initial application required'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM users WHERE id=actor AND role='admin') THEN RAISE EXCEPTION 'persisted mentor administrator required'; END IF;
  IF (NEW.id,NEW.owner_id,NEW.submission_key,NEW.payload_hash,NEW.full_name,NEW.email,NEW.phone,NEW.specialisation,NEW.professional_role,NEW.years_experience,NEW.profile_url,NEW.description,NEW.adult,NEW.consent,NEW.consent_version,NEW.consent_text,NEW.adult_text,NEW.submitted_at) IS DISTINCT FROM (OLD.id,OLD.owner_id,OLD.submission_key,OLD.payload_hash,OLD.full_name,OLD.email,OLD.phone,OLD.specialisation,OLD.professional_role,OLD.years_experience,OLD.profile_url,OLD.description,OLD.adult,OLD.consent,OLD.consent_version,OLD.consent_text,OLD.adult_text,OLD.submitted_at) OR NEW.version<>OLD.version+1 OR NEW.updated_at<OLD.updated_at OR NEW.status='submitted' THEN RAISE EXCEPTION 'immutable application and monotonic review version required'; END IF;
 END IF; RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER mentor_application_identity BEFORE INSERT OR UPDATE OR DELETE ON mentor_applications FOR EACH ROW EXECUTE FUNCTION mentor_application_guard();
--> statement-breakpoint
CREATE TRIGGER mentor_application_no_truncate BEFORE TRUNCATE ON mentor_applications FOR EACH STATEMENT EXECUTE FUNCTION mentor_application_guard();
--> statement-breakpoint
CREATE FUNCTION mentor_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor uuid; BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'immutable mentor review history'; END IF;
 actor:=nullif(current_setting('airbharath.mentor_actor',true),'')::uuid;
 IF actor IS NULL OR actor<>NEW.actor_id OR NOT EXISTS(SELECT 1 FROM users WHERE id=actor AND role='admin') OR NOT EXISTS(SELECT 1 FROM mentor_applications WHERE id=NEW.application_id AND version=NEW.version AND status=NEW.status) THEN RAISE EXCEPTION 'persisted administrator and matching application review required'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER mentor_review_history BEFORE INSERT OR UPDATE OR DELETE ON mentor_review_events FOR EACH ROW EXECUTE FUNCTION mentor_review_guard();
--> statement-breakpoint
CREATE TRIGGER mentor_review_no_truncate BEFORE TRUNCATE ON mentor_review_events FOR EACH STATEMENT EXECUTE FUNCTION mentor_review_guard();
--> statement-breakpoint
CREATE FUNCTION mentor_review_proof() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM mentor_review_events WHERE application_id=NEW.id AND version=NEW.version AND status=NEW.status AND actor_id=nullif(current_setting('airbharath.mentor_actor',true),'')::uuid AND created_at=NEW.updated_at) THEN RAISE EXCEPTION 'immutable screening decision proof required'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER mentor_application_review_proof AFTER UPDATE ON mentor_applications DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION mentor_review_proof();
