CREATE TABLE "workspace_publication_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"request_key" uuid NOT NULL,
	"command_hash" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_publication_event_request" UNIQUE("actor_id","request_key")
);
--> statement-breakpoint
CREATE TABLE "workspace_publication_lessons" (
	"project_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"lms_id" uuid NOT NULL,
	CONSTRAINT "workspace_publication_lessons_project_id_source_id_pk" PRIMARY KEY("project_id","source_id"),
	CONSTRAINT "workspace_publication_lessons_lms_id_unique" UNIQUE("lms_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_publication_modules" (
	"project_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"lms_id" uuid NOT NULL,
	CONSTRAINT "workspace_publication_modules_project_id_source_id_pk" PRIMARY KEY("project_id","source_id"),
	CONSTRAINT "workspace_publication_modules_lms_id_unique" UNIQUE("lms_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_publication_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"amount_paise" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"decided_by" uuid,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "workspace_publication_price_number" UNIQUE("project_id","number"),
	CONSTRAINT "workspace_publication_price_check" CHECK ("workspace_publication_prices"."number">0 AND "workspace_publication_prices"."amount_paise" BETWEEN 1 AND 100000000 AND "workspace_publication_prices"."currency"='INR' AND "workspace_publication_prices"."status" IN ('proposed','approved','rejected') AND ("workspace_publication_prices"."decided_by" IS NULL OR "workspace_publication_prices"."decided_by"<>"workspace_publication_prices"."user_id") AND (("workspace_publication_prices"."status"='proposed' AND "workspace_publication_prices"."decided_by" IS NULL AND "workspace_publication_prices"."decided_at" IS NULL) OR ("workspace_publication_prices"."status"<>'proposed' AND "workspace_publication_prices"."decided_by" IS NOT NULL AND "workspace_publication_prices"."decided_at" IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "workspace_publication_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"price_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"authority" text NOT NULL,
	"trust_version" integer,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_publication_release_number" UNIQUE("project_id","number")
);
--> statement-breakpoint
CREATE TABLE "workspace_publication_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"feedback" text DEFAULT '' NOT NULL,
	"decided_by" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_publication_revision_number" UNIQUE("project_id","number"),
	CONSTRAINT "workspace_publication_revision_check" CHECK ("workspace_publication_revisions"."number">0 AND "workspace_publication_revisions"."content_hash" ~ '^[a-f0-9]{64}$' AND "workspace_publication_revisions"."status" IN ('submitted','under_review','changes_requested','approved') AND ("workspace_publication_revisions"."decided_by" IS NULL OR "workspace_publication_revisions"."decided_by"<>"workspace_publication_revisions"."user_id") AND ("workspace_publication_revisions"."status" NOT IN ('approved','changes_requested') OR "workspace_publication_revisions"."decided_by" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "workspace_publication_states" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"course_id" uuid,
	"current_revision_id" uuid,
	"current_price_id" uuid,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_publication_states_course_id_unique" UNIQUE("course_id"),
	CONSTRAINT "workspace_publication_state_check" CHECK ("workspace_publication_states"."version">=0 AND "workspace_publication_states"."status" IN ('draft','live','unpublished','suspended') AND ("workspace_publication_states"."status"<>'live' OR ("workspace_publication_states"."course_id" IS NOT NULL AND "workspace_publication_states"."current_revision_id" IS NOT NULL AND "workspace_publication_states"."current_price_id" IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "workspace_trust_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_profile_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"trusted" boolean NOT NULL,
	"version" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_trust_event_version" UNIQUE("creator_profile_id","version")
);
--> statement-breakpoint
CREATE TABLE "workspace_trusted_creators" (
	"creator_profile_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"trusted" boolean DEFAULT false NOT NULL,
	"version" integer NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_trust_version_check" CHECK ("workspace_trusted_creators"."version">0)
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "workspace_project_id" uuid;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "workspace_state" text;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "workspace_revision_id" uuid;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "workspace_retired" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "content_format" text DEFAULT 'markdown' NOT NULL;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "workspace_retired" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_publication_events" ADD CONSTRAINT "workspace_publication_events_project_id_workspace_course_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."workspace_course_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_events" ADD CONSTRAINT "workspace_publication_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_lessons" ADD CONSTRAINT "workspace_publication_lessons_project_id_workspace_course_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."workspace_course_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_lessons" ADD CONSTRAINT "workspace_publication_lessons_lms_id_lessons_id_fk" FOREIGN KEY ("lms_id") REFERENCES "public"."lessons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_modules" ADD CONSTRAINT "workspace_publication_modules_project_id_workspace_course_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."workspace_course_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_modules" ADD CONSTRAINT "workspace_publication_modules_lms_id_modules_id_fk" FOREIGN KEY ("lms_id") REFERENCES "public"."modules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_prices" ADD CONSTRAINT "workspace_publication_prices_project_id_workspace_course_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."workspace_course_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_prices" ADD CONSTRAINT "workspace_publication_prices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_prices" ADD CONSTRAINT "workspace_publication_prices_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_prices" ADD CONSTRAINT "workspace_price_owner_fk" FOREIGN KEY ("project_id","user_id") REFERENCES "public"."workspace_course_projects"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_releases" ADD CONSTRAINT "workspace_publication_releases_project_id_workspace_course_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."workspace_course_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_releases" ADD CONSTRAINT "workspace_publication_releases_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_releases" ADD CONSTRAINT "workspace_publication_releases_revision_id_workspace_publication_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."workspace_publication_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_releases" ADD CONSTRAINT "workspace_publication_releases_price_id_workspace_publication_prices_id_fk" FOREIGN KEY ("price_id") REFERENCES "public"."workspace_publication_prices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_releases" ADD CONSTRAINT "workspace_publication_releases_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_revisions" ADD CONSTRAINT "workspace_publication_revisions_project_id_workspace_course_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."workspace_course_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_revisions" ADD CONSTRAINT "workspace_publication_revisions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_revisions" ADD CONSTRAINT "workspace_publication_revisions_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_revisions" ADD CONSTRAINT "workspace_revision_owner_fk" FOREIGN KEY ("project_id","user_id") REFERENCES "public"."workspace_course_projects"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_states" ADD CONSTRAINT "workspace_publication_states_project_id_workspace_course_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."workspace_course_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_states" ADD CONSTRAINT "workspace_publication_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_states" ADD CONSTRAINT "workspace_publication_states_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_states" ADD CONSTRAINT "workspace_publication_states_current_revision_id_workspace_publication_revisions_id_fk" FOREIGN KEY ("current_revision_id") REFERENCES "public"."workspace_publication_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_states" ADD CONSTRAINT "workspace_publication_states_current_price_id_workspace_publication_prices_id_fk" FOREIGN KEY ("current_price_id") REFERENCES "public"."workspace_publication_prices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_states" ADD CONSTRAINT "workspace_publication_owner_fk" FOREIGN KEY ("project_id","user_id") REFERENCES "public"."workspace_course_projects"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_trust_events" ADD CONSTRAINT "workspace_trust_events_creator_profile_id_workspace_creator_profiles_id_fk" FOREIGN KEY ("creator_profile_id") REFERENCES "public"."workspace_creator_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_trust_events" ADD CONSTRAINT "workspace_trust_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_trusted_creators" ADD CONSTRAINT "workspace_trusted_creators_creator_profile_id_workspace_creator_profiles_id_fk" FOREIGN KEY ("creator_profile_id") REFERENCES "public"."workspace_creator_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_trusted_creators" ADD CONSTRAINT "workspace_trusted_creators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_trusted_creators" ADD CONSTRAINT "workspace_trust_owner_fk" FOREIGN KEY ("creator_profile_id","user_id") REFERENCES "public"."workspace_creator_profiles"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_publication_event_project" ON "workspace_publication_events" USING btree ("project_id","created_at");--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_workspace_project_id_workspace_course_projects_id_fk" FOREIGN KEY ("workspace_project_id") REFERENCES "public"."workspace_course_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_workspace_revision_id_workspace_publication_revisions_id_fk" FOREIGN KEY ("workspace_revision_id") REFERENCES "public"."workspace_publication_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_workspace_project_id_unique" UNIQUE("workspace_project_id");
-- Preserve immutable submission, decision, mapping and audit history. No historical LMS rows are rewritten.
--> statement-breakpoint
CREATE FUNCTION workspace_publication_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Creator publication history is retained' USING ERRCODE='23514'; END $$;
--> statement-breakpoint
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['workspace_publication_events','workspace_trust_events','workspace_publication_releases','workspace_publication_modules','workspace_publication_lessons'] LOOP
 EXECUTE format('CREATE TRIGGER publication_history_immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION workspace_publication_history_guard()',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['workspace_publication_events','workspace_trust_events','workspace_publication_releases','workspace_publication_modules','workspace_publication_lessons','workspace_publication_states','workspace_publication_revisions','workspace_publication_prices','workspace_trusted_creators'] LOOP
 EXECUTE format('CREATE TRIGGER publication_no_truncate BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION workspace_publication_history_guard()',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['workspace_publication_states','workspace_publication_revisions','workspace_publication_prices','workspace_trusted_creators'] LOOP
 EXECUTE format('CREATE TRIGGER publication_no_delete BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION workspace_publication_history_guard()',t);
 END LOOP;
END $$;
--> statement-breakpoint
CREATE FUNCTION workspace_publication_decision_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='workspace_publication_revisions' THEN
  IF TG_OP='INSERT' THEN
   IF NEW.status<>'submitted' OR NEW.decided_by IS NOT NULL OR NEW.snapshot->>'projectId'<>NEW.project_id::text OR NEW.snapshot->>'ownerId'<>NEW.user_id::text THEN RAISE EXCEPTION 'Invalid frozen course identity'; END IF;
  ELSE
   IF (to_jsonb(NEW)-ARRAY['status','feedback','decided_by','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','feedback','decided_by','updated_at']) OR OLD.status NOT IN ('submitted','under_review') OR NEW.status NOT IN ('under_review','approved','changes_requested') OR (OLD.status='under_review' AND NEW.status='under_review') THEN RAISE EXCEPTION 'Immutable revision or invalid review transition'; END IF;
  END IF;
 ELSIF TG_TABLE_NAME='workspace_publication_prices' THEN
  IF TG_OP='INSERT' THEN
   IF NEW.status<>'proposed' THEN RAISE EXCEPTION 'Price must be proposed first'; END IF;
  ELSE
   IF (to_jsonb(NEW)-ARRAY['status','note','decided_by','decided_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','note','decided_by','decided_at']) OR OLD.status<>'proposed' OR NEW.status NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Immutable price or invalid decision'; END IF;
  END IF;
 END IF;
 IF NEW.decided_by IS NOT NULL AND (NEW.decided_by=NEW.user_id OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.decided_by AND role='admin')) THEN RAISE EXCEPTION 'Independent Admin decision required'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER publication_revision_guard BEFORE INSERT OR UPDATE ON workspace_publication_revisions FOR EACH ROW EXECUTE FUNCTION workspace_publication_decision_guard();
--> statement-breakpoint
CREATE TRIGGER publication_price_guard BEFORE INSERT OR UPDATE ON workspace_publication_prices FOR EACH ROW EXECUTE FUNCTION workspace_publication_decision_guard();
--> statement-breakpoint
CREATE UNIQUE INDEX workspace_one_pending_price ON workspace_publication_prices(project_id) WHERE status='proposed';
--> statement-breakpoint
CREATE FUNCTION workspace_publication_release_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r workspace_publication_revisions; p workspace_publication_prices; c courses; t workspace_trusted_creators;
BEGIN
 SELECT * INTO r FROM workspace_publication_revisions WHERE id=NEW.revision_id;
 SELECT * INTO p FROM workspace_publication_prices WHERE id=NEW.price_id;
 SELECT * INTO c FROM courses WHERE id=NEW.course_id;
 IF r.project_id IS DISTINCT FROM NEW.project_id OR p.project_id IS DISTINCT FROM NEW.project_id OR c.workspace_project_id IS DISTINCT FROM NEW.project_id OR p.status<>'approved' OR p.decided_by=r.user_id OR c.price<>p.amount_paise::numeric/100 OR NEW.number<1 THEN RAISE EXCEPTION 'Publication scope or approved price mismatch'; END IF;
 IF NEW.authority='admin_approved' THEN
  IF r.status<>'approved' OR NEW.trust_version IS NOT NULL THEN RAISE EXCEPTION 'Content approval required'; END IF;
 ELSIF NEW.authority='trusted' THEN
  SELECT tc.* INTO t FROM workspace_trusted_creators tc JOIN workspace_course_projects cp ON cp.creator_profile_id=tc.creator_profile_id WHERE cp.id=NEW.project_id;
  IF r.status<>'submitted' OR NOT COALESCE(t.trusted,false) OR NEW.trust_version IS DISTINCT FROM t.version THEN RAISE EXCEPTION 'Current Trusted Creator privilege required'; END IF;
 ELSE RAISE EXCEPTION 'Invalid publication authority'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER publication_release_guard BEFORE INSERT ON workspace_publication_releases FOR EACH ROW EXECUTE FUNCTION workspace_publication_release_guard();
--> statement-breakpoint
-- Existing Admin editor endpoints cannot mutate a Creator publication behind approval.
CREATE FUNCTION workspace_lms_publication_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rowdata jsonb; course uuid; project uuid; oldproject uuid;
BEGIN
 rowdata:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_TABLE_NAME='courses' THEN
  project:=(rowdata->>'workspace_project_id')::uuid;
  IF TG_OP='UPDATE' THEN oldproject:=OLD.workspace_project_id; IF oldproject IS NOT NULL AND project IS DISTINCT FROM oldproject THEN RAISE EXCEPTION 'Immutable Creator course ownership'; END IF; END IF;
 ELSIF TG_TABLE_NAME IN ('lessons','lesson_materials') THEN
  IF TG_TABLE_NAME='lessons' THEN SELECT m.course_id INTO course FROM modules m WHERE m.id=(rowdata->>'module_id')::uuid;
  ELSE SELECT m.course_id INTO course FROM lessons l JOIN modules m ON m.id=l.module_id WHERE l.id=(rowdata->>'lesson_id')::uuid; END IF;
  SELECT workspace_project_id INTO project FROM courses WHERE id=course;
 ELSE SELECT workspace_project_id INTO project FROM courses WHERE id=(rowdata->>'course_id')::uuid;
 END IF;
 IF project IS NOT NULL AND current_setting('airbharath.workspace_publishing',true) IS DISTINCT FROM project::text THEN RAISE EXCEPTION 'Use Creator publishing to manage this course' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
--> statement-breakpoint
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['courses','modules','lessons','lesson_materials','course_authors','course_sections','videos'] LOOP
 EXECUTE format('CREATE TRIGGER creator_lms_write_guard BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION workspace_lms_publication_guard()',t);
END LOOP; END $$;
--> statement-breakpoint
-- Deferred proof allows atomic course mirror + state + audit writes in any statement order.
CREATE FUNCTION workspace_publication_state_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s workspace_publication_states; c courses; r workspace_publication_releases;
BEGIN
 SELECT * INTO s FROM workspace_publication_states WHERE project_id=NEW.project_id;
 IF (TG_OP='INSERT' AND NEW.version<>1) OR (TG_OP='UPDATE' AND (NEW.version<>OLD.version+1 OR NEW.user_id<>OLD.user_id OR NEW.project_id<>OLD.project_id)) THEN RAISE EXCEPTION 'Monotonic publication version required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM workspace_publication_events e WHERE e.project_id=NEW.project_id AND (e.result->>'version')::integer=NEW.version) THEN RAISE EXCEPTION 'Publication audit required'; END IF;
 IF s.course_id IS NOT NULL THEN
  SELECT * INTO c FROM courses WHERE id=s.course_id;
  SELECT * INTO r FROM workspace_publication_releases WHERE project_id=s.project_id ORDER BY number DESC LIMIT 1;
  IF c.workspace_project_id IS DISTINCT FROM s.project_id OR c.workspace_state IS DISTINCT FROM s.status OR c.is_published IS DISTINCT FROM (s.status='live') OR r.course_id IS DISTINCT FROM s.course_id OR r.revision_id IS DISTINCT FROM s.current_revision_id OR r.price_id IS DISTINCT FROM s.current_price_id THEN RAISE EXCEPTION 'Publication mirror mismatch'; END IF;
 END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER publication_state_proof AFTER INSERT OR UPDATE ON workspace_publication_states DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_publication_state_proof();
--> statement-breakpoint
CREATE FUNCTION workspace_trust_proof() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (TG_OP='INSERT' AND NEW.version<>1) OR (TG_OP='UPDATE' AND (NEW.version<>OLD.version+1 OR NEW.creator_profile_id<>OLD.creator_profile_id OR NEW.user_id<>OLD.user_id)) OR NOT EXISTS(SELECT 1 FROM workspace_trust_events e JOIN users u ON u.id=e.actor_id WHERE e.creator_profile_id=NEW.creator_profile_id AND e.version=NEW.version AND e.trusted=NEW.trusted AND e.actor_id<>NEW.user_id AND u.role='admin' AND length(btrim(e.reason))>=5) THEN RAISE EXCEPTION 'Audited independent Admin trust decision required'; END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER publication_trust_proof AFTER INSERT OR UPDATE ON workspace_trusted_creators DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_trust_proof();
--> statement-breakpoint
CREATE FUNCTION workspace_lms_ownership_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE oldcourse uuid; oldproject uuid;
BEGIN
 IF TG_TABLE_NAME='lessons' THEN SELECT course_id INTO oldcourse FROM modules WHERE id=OLD.module_id;
 ELSIF TG_TABLE_NAME='lesson_materials' THEN SELECT m.course_id INTO oldcourse FROM lessons l JOIN modules m ON m.id=l.module_id WHERE l.id=OLD.lesson_id;
 ELSE oldcourse:=OLD.course_id; END IF;
 SELECT workspace_project_id INTO oldproject FROM courses WHERE id=oldcourse;
 IF oldproject IS NOT NULL AND current_setting('airbharath.workspace_publishing',true) IS DISTINCT FROM oldproject::text THEN RAISE EXCEPTION 'Immutable Creator LMS ownership'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['modules','lessons','lesson_materials','course_authors','course_sections','videos'] LOOP
 EXECUTE format('CREATE TRIGGER creator_lms_owner_guard BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION workspace_lms_ownership_guard()',t);
END LOOP; END $$;
--> statement-breakpoint
CREATE FUNCTION workspace_publication_decision_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE action_name text; entity_key text; decision_time timestamptz;
BEGIN
 IF TG_TABLE_NAME='workspace_publication_revisions' THEN
  entity_key:='revisionId';decision_time:=NEW.updated_at;
  action_name:=CASE NEW.status WHEN 'submitted' THEN 'submit' WHEN 'under_review' THEN 'start_review' WHEN 'approved' THEN 'approve_content' ELSE 'request_changes' END;
 ELSE
  entity_key:='priceId';decision_time:=COALESCE(NEW.decided_at,NEW.created_at);
  action_name:=CASE NEW.status WHEN 'proposed' THEN 'propose_price' WHEN 'approved' THEN 'approve_price' ELSE 'reject_price' END;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM workspace_publication_events e WHERE e.project_id=NEW.project_id AND e.action=action_name AND e.result->>entity_key=NEW.id::text AND e.created_at=decision_time AND (NEW.decided_by IS NULL OR e.actor_id=NEW.decided_by)) THEN RAISE EXCEPTION 'Publication submission/decision audit required'; END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER publication_revision_proof AFTER INSERT OR UPDATE ON workspace_publication_revisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_publication_decision_proof();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER publication_price_proof AFTER INSERT OR UPDATE ON workspace_publication_prices DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_publication_decision_proof();
--> statement-breakpoint
CREATE FUNCTION workspace_publication_mapping_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE project uuid;
BEGIN
 IF TG_TABLE_NAME='workspace_publication_modules' THEN
 SELECT c.workspace_project_id INTO project FROM modules m JOIN courses c ON c.id=m.course_id WHERE m.id=NEW.lms_id;
 IF NOT EXISTS(SELECT 1 FROM workspace_publication_revisions r, jsonb_array_elements(r.snapshot->'modules') m WHERE r.project_id=NEW.project_id AND m->>'id'=NEW.source_id::text) THEN RAISE EXCEPTION 'Invalid source module scope'; END IF;
 ELSE
 SELECT c.workspace_project_id INTO project FROM lessons l JOIN modules m ON m.id=l.module_id JOIN courses c ON c.id=m.course_id WHERE l.id=NEW.lms_id;
 IF NOT EXISTS(SELECT 1 FROM workspace_publication_revisions r, jsonb_array_elements(r.snapshot->'lessons') l WHERE r.project_id=NEW.project_id AND l->>'id'=NEW.source_id::text) THEN RAISE EXCEPTION 'Invalid source lesson scope'; END IF;
 END IF;
 IF project IS DISTINCT FROM NEW.project_id THEN RAISE EXCEPTION 'Invalid LMS mapping scope'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER publication_module_mapping BEFORE INSERT ON workspace_publication_modules FOR EACH ROW EXECUTE FUNCTION workspace_publication_mapping_guard();
--> statement-breakpoint
CREATE TRIGGER publication_lesson_mapping BEFORE INSERT ON workspace_publication_lessons FOR EACH ROW EXECUTE FUNCTION workspace_publication_mapping_guard();
