CREATE TABLE "workspace_course_review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"actor_admin_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"transition_version" integer NOT NULL,
	"feedback" text,
	"note" text,
	"request_key" uuid NOT NULL,
	"command_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_review_events_hash_check" CHECK ("workspace_course_review_events"."command_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "workspace_review_events_transition_check" CHECK (("workspace_course_review_events"."action" = 'review_started' AND "workspace_course_review_events"."from_status" = 'submitted' AND "workspace_course_review_events"."to_status" = 'under_review' AND "workspace_course_review_events"."transition_version" = 2 AND "workspace_course_review_events"."feedback" IS NULL AND "workspace_course_review_events"."note" IS NULL) OR ("workspace_course_review_events"."action" = 'changes_requested' AND "workspace_course_review_events"."from_status" = 'under_review' AND "workspace_course_review_events"."to_status" = 'changes_requested' AND "workspace_course_review_events"."transition_version" = 3 AND "workspace_course_review_events"."feedback" IS NOT NULL AND length(btrim("workspace_course_review_events"."feedback")) BETWEEN 10 AND 2000 AND "workspace_course_review_events"."note" IS NULL) OR ("workspace_course_review_events"."action" = 'approved' AND "workspace_course_review_events"."from_status" = 'under_review' AND "workspace_course_review_events"."to_status" = 'approved' AND "workspace_course_review_events"."transition_version" = 3 AND "workspace_course_review_events"."feedback" IS NULL AND ("workspace_course_review_events"."note" IS NULL OR length("workspace_course_review_events"."note") <= 1000))),
	CONSTRAINT "workspace_review_events_plain_check" CHECK (replace(replace(coalesce("workspace_course_review_events"."feedback", ''), chr(10), ''), chr(9), '') !~ '[<>[:cntrl:]]' AND replace(replace(coalesce("workspace_course_review_events"."note", ''), chr(10), ''), chr(9), '') !~ '[<>[:cntrl:]]')
);
--> statement-breakpoint
CREATE TABLE "workspace_course_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"creator_profile_id" uuid NOT NULL,
	"submission_number" integer NOT NULL,
	"draft_version" integer NOT NULL,
	"content_hash" text NOT NULL,
	"request_key" uuid NOT NULL,
	"command_hash" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"target_learner" text NOT NULL,
	"learning_outcomes" jsonb NOT NULL,
	"outline" jsonb NOT NULL,
	"tentative_price_paise" integer,
	"currency" text DEFAULT 'INR' NOT NULL,
	"review_status" text DEFAULT 'submitted' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"review_started_at" timestamp with time zone,
	"review_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_submissions_identity_check" CHECK ("workspace_course_submissions"."submission_number" > 0 AND "workspace_course_submissions"."draft_version" > 0 AND "workspace_course_submissions"."content_hash" ~ '^[a-f0-9]{64}$' AND "workspace_course_submissions"."command_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "workspace_submissions_category_check" CHECK ("workspace_course_submissions"."category" IN ('pilot_flight_crew', 'cabin_crew', 'aircraft_maintenance', 'ground_operations', 'airport_operations', 'aviation_safety', 'aviation_security', 'flight_operations', 'aviation_management', 'aviation_hospitality', 'aviation_trainer', 'aviation_career', 'drone_uav', 'defence_aviation', 'other_aviation')),
	CONSTRAINT "workspace_submissions_content_check" CHECK ("workspace_course_submissions"."currency" = 'INR' AND length("workspace_course_submissions"."title") BETWEEN 3 AND 200 AND length("workspace_course_submissions"."description") BETWEEN 50 AND 5000 AND length("workspace_course_submissions"."target_learner") BETWEEN 1 AND 1000 AND ("workspace_course_submissions"."tentative_price_paise" IS NULL OR "workspace_course_submissions"."tentative_price_paise" BETWEEN 1 AND 100000000)),
	CONSTRAINT "workspace_submissions_json_check" CHECK (CASE WHEN jsonb_typeof("workspace_course_submissions"."learning_outcomes") = 'array' AND jsonb_typeof("workspace_course_submissions"."outline") = 'array' THEN jsonb_array_length("workspace_course_submissions"."learning_outcomes") BETWEEN 1 AND 10 AND jsonb_array_length("workspace_course_submissions"."outline") <= 20 ELSE false END),
	CONSTRAINT "workspace_submissions_lifecycle_check" CHECK ("workspace_course_submissions"."created_at" = "workspace_course_submissions"."submitted_at" AND "workspace_course_submissions"."updated_at" >= "workspace_course_submissions"."submitted_at" AND (("workspace_course_submissions"."review_status" = 'submitted' AND "workspace_course_submissions"."version" = 1 AND "workspace_course_submissions"."review_started_at" IS NULL AND "workspace_course_submissions"."review_completed_at" IS NULL AND "workspace_course_submissions"."updated_at" = "workspace_course_submissions"."submitted_at") OR ("workspace_course_submissions"."review_status" = 'under_review' AND "workspace_course_submissions"."version" = 2 AND "workspace_course_submissions"."review_started_at" IS NOT NULL AND "workspace_course_submissions"."review_started_at" >= "workspace_course_submissions"."submitted_at" AND "workspace_course_submissions"."review_completed_at" IS NULL AND "workspace_course_submissions"."updated_at" = "workspace_course_submissions"."review_started_at") OR ("workspace_course_submissions"."review_status" IN ('changes_requested', 'approved') AND "workspace_course_submissions"."version" = 3 AND "workspace_course_submissions"."review_started_at" IS NOT NULL AND "workspace_course_submissions"."review_started_at" >= "workspace_course_submissions"."submitted_at" AND "workspace_course_submissions"."review_completed_at" IS NOT NULL AND "workspace_course_submissions"."review_completed_at" >= "workspace_course_submissions"."review_started_at" AND "workspace_course_submissions"."updated_at" = "workspace_course_submissions"."review_completed_at")))
);
--> statement-breakpoint
ALTER TABLE "workspace_course_review_events" ADD CONSTRAINT "workspace_course_review_events_submission_id_workspace_course_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."workspace_course_submissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_course_review_events" ADD CONSTRAINT "workspace_course_review_events_actor_admin_user_id_users_id_fk" FOREIGN KEY ("actor_admin_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_drafts_composite_owner_idx" ON "workspace_course_drafts" USING btree ("id","user_id","creator_profile_id");
--> statement-breakpoint
ALTER TABLE "workspace_course_submissions" ADD CONSTRAINT "workspace_submissions_draft_owner_fk" FOREIGN KEY ("draft_id","user_id","creator_profile_id") REFERENCES "public"."workspace_course_drafts"("id","user_id","creator_profile_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_review_events_request_idx" ON "workspace_course_review_events" USING btree ("actor_admin_user_id","request_key");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_review_events_transition_idx" ON "workspace_course_review_events" USING btree ("submission_id","transition_version");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_submissions_number_idx" ON "workspace_course_submissions" USING btree ("draft_id","submission_number");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_submissions_request_idx" ON "workspace_course_submissions" USING btree ("user_id","request_key");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_submissions_open_idx" ON "workspace_course_submissions" USING btree ("draft_id") WHERE "workspace_course_submissions"."review_status" IN ('submitted', 'under_review');--> statement-breakpoint
CREATE INDEX "workspace_submissions_queue_idx" ON "workspace_course_submissions" USING btree ("review_status","submitted_at","id");--> statement-breakpoint
CREATE INDEX "workspace_submissions_owner_idx" ON "workspace_course_submissions" USING btree ("user_id","draft_id","submission_number");
--> statement-breakpoint
-- Submission snapshots originate in a locked owned draft and are never rewritten/deleted.
CREATE FUNCTION workspace_guard_course_submission() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d workspace_course_drafts%ROWTYPE; prior workspace_course_submissions%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Workspace submissions must be retained' USING ERRCODE = '23514'; END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO d FROM workspace_course_drafts WHERE id = NEW.draft_id FOR UPDATE;
    SELECT * INTO prior FROM workspace_course_submissions WHERE draft_id = NEW.draft_id ORDER BY submission_number DESC LIMIT 1;
    IF d.id IS NULL OR NEW.user_id <> d.user_id OR NEW.creator_profile_id <> d.creator_profile_id
      OR NEW.draft_version <> d.version OR NEW.review_status <> 'submitted' OR NEW.version <> 1
      OR NEW.submission_number <> coalesce(prior.submission_number, 0) + 1
      OR (prior.id IS NOT NULL AND prior.review_status <> 'changes_requested')
      OR ROW(NEW.title, NEW.category, NEW.description, NEW.target_learner, NEW.learning_outcomes, NEW.outline, NEW.tentative_price_paise, NEW.currency)
        IS DISTINCT FROM ROW(d.title, d.category, d.description, d.target_learner, d.learning_outcomes, d.outline, d.tentative_price_paise, d.currency)
      OR (prior.id IS NOT NULL AND (NEW.content_hash = prior.content_hash OR
        ROW(NEW.title, NEW.category, NEW.description, NEW.target_learner, NEW.learning_outcomes, NEW.outline, NEW.tentative_price_paise, NEW.currency)
          IS NOT DISTINCT FROM ROW(prior.title, prior.category, prior.description, prior.target_learner, prior.learning_outcomes, prior.outline, prior.tentative_price_paise, prior.currency))) THEN
      RAISE EXCEPTION 'Invalid Workspace submission source or sequence' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  -- All fields except lifecycle are immutable, including request/hash/identity/created time.
  IF (to_jsonb(NEW) - ARRAY['review_status','version','review_started_at','review_completed_at','updated_at'])
      IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['review_status','version','review_started_at','review_completed_at','updated_at'])
    OR NEW.version <> OLD.version + 1 OR NEW.updated_at < OLD.updated_at
    OR NOT ((OLD.review_status = 'submitted' AND NEW.review_status = 'under_review' AND NEW.review_started_at = NEW.updated_at AND NEW.review_completed_at IS NULL)
      OR (OLD.review_status = 'under_review' AND NEW.review_status IN ('changes_requested','approved') AND NEW.review_started_at IS NOT DISTINCT FROM OLD.review_started_at AND NEW.review_completed_at = NEW.updated_at)) THEN
    RAISE EXCEPTION 'Invalid immutable Workspace review transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER workspace_submissions_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_course_submissions
FOR EACH ROW EXECUTE FUNCTION workspace_guard_course_submission();
--> statement-breakpoint
CREATE FUNCTION workspace_guard_course_review_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s workspace_course_submissions%ROWTYPE; role_value text;
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Workspace review events are append-only' USING ERRCODE = '23514'; END IF;
  SELECT role INTO role_value FROM users WHERE id = NEW.actor_admin_user_id FOR SHARE;
  IF role_value IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Persisted admin required' USING ERRCODE = '23514'; END IF;
  PERFORM id FROM workspace_course_drafts WHERE id = (SELECT draft_id FROM workspace_course_submissions WHERE id = NEW.submission_id) FOR UPDATE;
  SELECT * INTO s FROM workspace_course_submissions WHERE id = NEW.submission_id FOR UPDATE;
  IF s.id IS NULL OR NEW.from_status <> s.review_status OR NEW.transition_version <> s.version + 1 OR NEW.created_at < s.updated_at THEN
    RAISE EXCEPTION 'Stale Workspace review event' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER workspace_review_events_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_course_review_events
FOR EACH ROW EXECUTE FUNCTION workspace_guard_course_review_event();
--> statement-breakpoint
-- Check at commit: neither an event alone nor an unaudited status mutation can commit.
CREATE FUNCTION workspace_check_course_review_consistency() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s workspace_course_submissions%ROWTYPE; e workspace_course_review_events%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME = 'workspace_course_review_events' THEN
    SELECT * INTO s FROM workspace_course_submissions WHERE id = NEW.submission_id;
    IF s.version < NEW.transition_version OR
      (NEW.to_status = 'under_review' AND s.review_started_at IS DISTINCT FROM NEW.created_at) OR
      (NEW.to_status <> 'under_review' AND (s.review_status <> NEW.to_status OR s.review_completed_at IS DISTINCT FROM NEW.created_at)) THEN
      RAISE EXCEPTION 'Workspace event lacks its lifecycle transition' USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT * INTO e FROM workspace_course_review_events WHERE submission_id = NEW.id AND transition_version = NEW.version;
    IF e.id IS NULL OR e.from_status <> OLD.review_status OR e.to_status <> NEW.review_status OR e.created_at IS DISTINCT FROM NEW.updated_at THEN
      RAISE EXCEPTION 'Workspace transition lacks its audit event' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workspace_review_events_consistent AFTER INSERT ON workspace_course_review_events
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_check_course_review_consistency();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workspace_submissions_consistent AFTER UPDATE ON workspace_course_submissions
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_check_course_review_consistency();
--> statement-breakpoint
CREATE FUNCTION workspace_guard_review_locked_draft() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE latest_status text;
BEGIN
  SELECT review_status INTO latest_status FROM workspace_course_submissions WHERE draft_id = OLD.id ORDER BY submission_number DESC LIMIT 1;
  IF latest_status IN ('submitted','under_review','approved') THEN
    RAISE EXCEPTION 'Workspace draft is review-locked' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER workspace_drafts_review_lock BEFORE UPDATE ON workspace_course_drafts
FOR EACH ROW EXECUTE FUNCTION workspace_guard_review_locked_draft();
