CREATE TABLE "workspace_course_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"position" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_lessons_position_unique" UNIQUE("module_id","position") DEFERRABLE INITIALLY DEFERRED,
	CONSTRAINT "workspace_lessons_content_check" CHECK (length(btrim("workspace_course_lessons"."title")) BETWEEN 2 AND 200 AND length("workspace_course_lessons"."summary") <= 1000 AND length("workspace_course_lessons"."content") <= 20000),
	CONSTRAINT "workspace_lessons_version_time_check" CHECK ("workspace_course_lessons"."position" >= 0 AND "workspace_course_lessons"."version" > 0 AND "workspace_course_lessons"."updated_at" >= "workspace_course_lessons"."created_at")
);
--> statement-breakpoint
CREATE TABLE "workspace_course_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"position" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_modules_position_unique" UNIQUE("project_id","position") DEFERRABLE INITIALLY DEFERRED,
	CONSTRAINT "workspace_modules_content_check" CHECK (length(btrim("workspace_course_modules"."title")) BETWEEN 2 AND 200 AND length("workspace_course_modules"."description") <= 1000),
	CONSTRAINT "workspace_modules_version_time_check" CHECK ("workspace_course_modules"."position" >= 0 AND "workspace_course_modules"."version" > 0 AND "workspace_course_modules"."updated_at" >= "workspace_course_modules"."created_at")
);
--> statement-breakpoint
CREATE TABLE "workspace_course_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"creator_profile_id" uuid NOT NULL,
	"draft_id" uuid NOT NULL,
	"approved_submission_id" uuid NOT NULL,
	"status" text DEFAULT 'building' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_projects_state_check" CHECK ("workspace_course_projects"."status" = 'building' AND "workspace_course_projects"."version" > 0 AND "workspace_course_projects"."updated_at" >= "workspace_course_projects"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_modules_owner_idx" ON "workspace_course_modules" USING btree ("id","project_id","user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_projects_source_idx" ON "workspace_course_projects" USING btree ("approved_submission_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_projects_owner_idx" ON "workspace_course_projects" USING btree ("id","user_id");
--> statement-breakpoint
CREATE INDEX "workspace_projects_draft_idx" ON "workspace_course_projects" USING btree ("user_id","draft_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_submissions_build_owner_idx" ON "workspace_course_submissions" USING btree ("id","user_id","creator_profile_id","draft_id");
--> statement-breakpoint
ALTER TABLE "workspace_course_lessons" ADD CONSTRAINT "workspace_lessons_module_owner_fk" FOREIGN KEY ("module_id","project_id","user_id") REFERENCES "public"."workspace_course_modules"("id","project_id","user_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_course_modules" ADD CONSTRAINT "workspace_modules_project_owner_fk" FOREIGN KEY ("project_id","user_id") REFERENCES "public"."workspace_course_projects"("id","user_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_course_projects" ADD CONSTRAINT "workspace_projects_approved_owner_fk" FOREIGN KEY ("approved_submission_id","user_id","creator_profile_id","draft_id") REFERENCES "public"."workspace_course_submissions"("id","user_id","creator_profile_id","draft_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_course_projects" ADD CONSTRAINT "workspace_projects_profile_owner_fk" FOREIGN KEY ("creator_profile_id","user_id") REFERENCES "public"."workspace_creator_profiles"("id","user_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
-- A project is an immutable identity/reference to an approved submission. Builder
-- work changes independent module/lesson versions; no mutable project metadata.
CREATE FUNCTION workspace_build_project_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s workspace_course_submissions%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'course project identity is immutable'; END IF;
  SELECT * INTO s FROM workspace_course_submissions WHERE id = NEW.approved_submission_id FOR SHARE;
  IF s.id IS NULL OR s.review_status <> 'approved' OR s.review_completed_at IS NULL
    OR s.user_id <> NEW.user_id OR s.creator_profile_id <> NEW.creator_profile_id OR s.draft_id <> NEW.draft_id
    OR NEW.version <> 1 OR NEW.created_at <> NEW.updated_at OR NEW.created_at < s.review_completed_at
    OR NOT EXISTS (SELECT 1 FROM workspace_course_review_events e WHERE e.submission_id = s.id
      AND e.action = 'approved' AND e.to_status = 'approved' AND e.transition_version = s.version AND e.created_at = s.review_completed_at)
  THEN RAISE EXCEPTION 'authoritative owned approval required'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_build_project_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_course_projects
FOR EACH ROW EXECUTE FUNCTION workspace_build_project_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_build_item_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.version <> 1 OR NEW.created_at <> NEW.updated_at THEN RAISE EXCEPTION 'invalid initial builder version/time'; END IF;
  ELSE
    IF NEW.id <> OLD.id OR NEW.user_id <> OLD.user_id OR NEW.project_id <> OLD.project_id
      OR NEW.created_at <> OLD.created_at OR NEW.version <> OLD.version + 1 OR NEW.updated_at < OLD.updated_at
    THEN RAISE EXCEPTION 'invalid builder ownership/version/time change'; END IF;
    IF TG_TABLE_NAME = 'workspace_course_lessons' AND to_jsonb(NEW)->>'module_id' IS DISTINCT FROM to_jsonb(OLD)->>'module_id'
    THEN RAISE EXCEPTION 'lesson parent is immutable'; END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_build_module_guard BEFORE INSERT OR UPDATE ON workspace_course_modules
FOR EACH ROW EXECUTE FUNCTION workspace_build_item_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_build_lesson_guard BEFORE INSERT OR UPDATE ON workspace_course_lessons
FOR EACH ROW EXECUTE FUNCTION workspace_build_item_guard();
--> statement-breakpoint
-- Reordering is atomic: temporary position collisions are permitted inside the
-- transaction, but committed positions must be unique and contiguous from zero.
CREATE FUNCTION workspace_build_positions_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent uuid; n bigint; first_position integer; last_position integer;
BEGIN
  IF TG_TABLE_NAME = 'workspace_course_modules' THEN
    IF TG_OP = 'DELETE' THEN parent := OLD.project_id; ELSE parent := NEW.project_id; END IF;
    SELECT count(*), min(position), max(position) INTO n, first_position, last_position FROM workspace_course_modules WHERE project_id = parent;
  ELSE
    IF TG_OP = 'DELETE' THEN parent := OLD.module_id; ELSE parent := NEW.module_id; END IF;
    SELECT count(*), min(position), max(position) INTO n, first_position, last_position FROM workspace_course_lessons WHERE module_id = parent;
  END IF;
  IF n > 0 AND (first_position <> 0 OR last_position <> n - 1) THEN RAISE EXCEPTION 'builder positions must be contiguous'; END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workspace_build_module_positions AFTER INSERT OR UPDATE OR DELETE ON workspace_course_modules
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_build_positions_guard();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workspace_build_lesson_positions AFTER INSERT OR UPDATE OR DELETE ON workspace_course_lessons
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_build_positions_guard();
