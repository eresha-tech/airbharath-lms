CREATE TABLE "workspace_publication_notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_publication_notices_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "workspace_publication_prices" DROP CONSTRAINT "workspace_publication_price_check";--> statement-breakpoint
ALTER TABLE "workspace_publication_revisions" DROP CONSTRAINT "workspace_publication_revision_check";--> statement-breakpoint
ALTER TABLE "workspace_course_projects" ALTER COLUMN "approved_submission_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_course_projects" ADD COLUMN "source_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "workspace_publication_states" ADD COLUMN "guidelines" jsonb;--> statement-breakpoint
ALTER TABLE "workspace_publication_states" ADD COLUMN "moderation" jsonb;--> statement-breakpoint
ALTER TABLE "workspace_publication_notices" ADD CONSTRAINT "workspace_publication_notices_project_id_workspace_course_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."workspace_course_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_notices" ADD CONSTRAINT "workspace_publication_notices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_notices" ADD CONSTRAINT "workspace_publication_notices_event_id_workspace_publication_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."workspace_publication_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_publication_notices" ADD CONSTRAINT "workspace_notice_owner_fk" FOREIGN KEY ("project_id","user_id") REFERENCES "public"."workspace_course_projects"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_notice_owner_idx" ON "workspace_publication_notices" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "workspace_course_projects" ADD CONSTRAINT "workspace_project_draft_owner_fk" FOREIGN KEY ("draft_id","user_id","creator_profile_id") REFERENCES "public"."workspace_course_drafts"("id","user_id","creator_profile_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_projects_direct_draft_idx" ON "workspace_course_projects" USING btree ("draft_id") WHERE "workspace_course_projects"."source_snapshot" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_course_projects" ADD CONSTRAINT "workspace_project_source_check" CHECK (("workspace_course_projects"."approved_submission_id" IS NOT NULL AND "workspace_course_projects"."source_snapshot" IS NULL) OR ("workspace_course_projects"."approved_submission_id" IS NULL AND "workspace_course_projects"."source_snapshot" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "workspace_publication_prices" ADD CONSTRAINT "workspace_publication_price_check" CHECK ("workspace_publication_prices"."number">0 AND "workspace_publication_prices"."amount_paise" BETWEEN 1 AND 100000000 AND "workspace_publication_prices"."currency"='INR' AND "workspace_publication_prices"."status" IN ('proposed','approved','rejected','creator') AND ("workspace_publication_prices"."decided_by" IS NULL OR "workspace_publication_prices"."decided_by"<>"workspace_publication_prices"."user_id") AND (("workspace_publication_prices"."status" IN ('proposed','creator') AND "workspace_publication_prices"."decided_by" IS NULL AND "workspace_publication_prices"."decided_at" IS NULL) OR ("workspace_publication_prices"."status" IN ('approved','rejected') AND "workspace_publication_prices"."decided_by" IS NOT NULL AND "workspace_publication_prices"."decided_at" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "workspace_publication_revisions" ADD CONSTRAINT "workspace_publication_revision_check" CHECK ("workspace_publication_revisions"."number">0 AND "workspace_publication_revisions"."content_hash" ~ '^[a-f0-9]{64}$' AND "workspace_publication_revisions"."status" IN ('submitted','under_review','changes_requested','approved','creator') AND ("workspace_publication_revisions"."decided_by" IS NULL OR "workspace_publication_revisions"."decided_by"<>"workspace_publication_revisions"."user_id") AND ("workspace_publication_revisions"."status" NOT IN ('approved','changes_requested') OR "workspace_publication_revisions"."decided_by" IS NOT NULL));--> statement-breakpoint
-- Prospective policy only. Existing proposals, approval decisions, releases,
-- orders and financial snapshots are retained byte-for-byte.
DROP TRIGGER workspace_drafts_review_lock ON workspace_course_drafts;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION workspace_build_project_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d workspace_course_drafts; s workspace_course_submissions;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'course project identity is immutable'; END IF;
 SELECT * INTO d FROM workspace_course_drafts WHERE id=NEW.draft_id FOR SHARE;
 IF d.id IS NULL OR d.user_id<>NEW.user_id OR d.creator_profile_id<>NEW.creator_profile_id OR NEW.version<>1 OR NEW.created_at<>NEW.updated_at THEN RAISE EXCEPTION 'owned course draft required'; END IF;
 IF NEW.source_snapshot IS NOT NULL THEN
  IF NEW.approved_submission_id IS NOT NULL OR NOT coalesce(NEW.source_snapshot @> jsonb_build_object('id',d.id,'draftId',d.id,'userId',d.user_id,'creatorProfileId',d.creator_profile_id,'direct',true,'title',d.title,'category',d.category,'description',d.description,'targetLearner',d.target_learner,'learningOutcomes',d.learning_outcomes,'outline',d.outline),false) THEN RAISE EXCEPTION 'invalid direct course source'; END IF;
 ELSE
  SELECT * INTO s FROM workspace_course_submissions WHERE id=NEW.approved_submission_id FOR SHARE;
  IF s.id IS NULL OR s.user_id<>NEW.user_id OR s.creator_profile_id<>NEW.creator_profile_id OR s.draft_id<>NEW.draft_id THEN RAISE EXCEPTION 'owned legacy source required'; END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION workspace_publication_decision_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'publication version history is immutable'; END IF;
 IF NEW.status<>'creator' OR NEW.decided_by IS NOT NULL THEN RAISE EXCEPTION 'new versions are Creator controlled'; END IF;
 IF TG_TABLE_NAME='workspace_publication_revisions' THEN
  IF NEW.snapshot->>'projectId' IS DISTINCT FROM NEW.project_id::text OR NEW.snapshot->>'ownerId' IS DISTINCT FROM NEW.user_id::text THEN RAISE EXCEPTION 'invalid frozen course identity'; END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION workspace_publication_decision_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE action_name text; entity_key text;
BEGIN
 action_name:=CASE WHEN TG_TABLE_NAME='workspace_publication_revisions' THEN 'publish' ELSE 'set_price' END;
 entity_key:=CASE WHEN TG_TABLE_NAME='workspace_publication_revisions' THEN 'revisionId' ELSE 'priceId' END;
 IF NOT EXISTS(SELECT 1 FROM workspace_publication_events e WHERE e.project_id=NEW.project_id AND e.actor_id=NEW.user_id AND e.action=action_name AND e.result->>entity_key=NEW.id::text AND e.created_at=NEW.created_at) THEN RAISE EXCEPTION 'owned immutable version audit required'; END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION workspace_publication_release_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r workspace_publication_revisions; p workspace_publication_prices; c courses;
BEGIN
 SELECT * INTO r FROM workspace_publication_revisions WHERE id=NEW.revision_id;
 SELECT * INTO p FROM workspace_publication_prices WHERE id=NEW.price_id;
 SELECT * INTO c FROM courses WHERE id=NEW.course_id;
 IF r.id IS NULL OR p.id IS NULL OR c.id IS NULL OR r.project_id IS DISTINCT FROM NEW.project_id OR p.project_id IS DISTINCT FROM NEW.project_id OR p.user_id IS DISTINCT FROM r.user_id OR c.workspace_project_id IS DISTINCT FROM NEW.project_id OR p.status NOT IN ('approved','creator') OR p.currency<>'INR' OR c.price<>p.amount_paise::numeric/100 OR NEW.number<1 OR NEW.authority<>'creator' OR NEW.actor_id<>r.user_id OR NEW.trust_version IS NOT NULL THEN RAISE EXCEPTION 'owned Creator publication and price required'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION workspace_publication_state_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s workspace_publication_states; c courses; r workspace_publication_releases; p workspace_publication_prices; e workspace_publication_events;
BEGIN
 SELECT * INTO s FROM workspace_publication_states WHERE project_id=NEW.project_id;
 IF (TG_OP='INSERT' AND NEW.version<>1) OR (TG_OP='UPDATE' AND (NEW.version<>OLD.version+1 OR NEW.user_id<>OLD.user_id OR NEW.project_id<>OLD.project_id)) THEN RAISE EXCEPTION 'monotonic publication version required'; END IF;
 SELECT * INTO e FROM workspace_publication_events WHERE project_id=NEW.project_id AND (result->>'version')::integer=NEW.version;
 IF e.id IS NULL THEN RAISE EXCEPTION 'publication audit required'; END IF;
 IF e.action IN ('flag','request_corrections','moderate_unpublish','suspend','resolve') THEN
  IF e.actor_id=NEW.user_id OR length(btrim(e.note))<5 OR NOT EXISTS(SELECT 1 FROM users WHERE id=e.actor_id AND role='admin') OR e.result->'moderation' IS DISTINCT FROM NEW.moderation THEN RAISE EXCEPTION 'independent reasoned Admin moderation required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM workspace_publication_notices n WHERE n.event_id=e.id AND n.user_id=NEW.user_id AND n.project_id=NEW.project_id AND n.message=e.note) THEN RAISE EXCEPTION 'Creator moderation notice required'; END IF;
 ELSE
  IF e.actor_id<>NEW.user_id THEN RAISE EXCEPTION 'Creator control required'; END IF;
  IF TG_OP='UPDATE' AND NEW.moderation IS DISTINCT FROM OLD.moderation AND (e.action NOT IN ('appeal','submit_correction') OR (NEW.moderation-ARRAY['appeal','correction']) IS DISTINCT FROM (OLD.moderation-ARRAY['appeal','correction'])) THEN RAISE EXCEPTION 'Creator cannot lift moderation'; END IF;
  IF TG_OP='INSERT' AND NEW.moderation IS NOT NULL THEN RAISE EXCEPTION 'Admin moderation required'; END IF;
 END IF;
 IF (s.status='live' AND s.moderation->>'restriction' IN ('unpublished','suspended')) OR (e.action='publish' AND s.status<>'live') THEN RAISE EXCEPTION 'unresolved moderation restriction'; END IF;
 IF TG_OP='UPDATE' AND ((NEW.status='live' AND OLD.status<>'live' OR NEW.current_revision_id IS DISTINCT FROM OLD.current_revision_id) AND e.action<>'publish' OR NEW.current_price_id IS DISTINCT FROM OLD.current_price_id AND e.action NOT IN ('publish','set_price')) THEN RAISE EXCEPTION 'explicit publication or price operation required'; END IF;
 IF NEW.moderation IS NOT NULL AND NOT coalesce(NEW.moderation->>'restriction' IN ('none','flagged','corrections','unpublished','suspended') AND length(NEW.moderation->>'reason')>=5,false) THEN RAISE EXCEPTION 'invalid moderation case'; END IF;
 IF NEW.guidelines IS NOT NULL AND (TG_OP='INSERT' OR NEW.guidelines IS DISTINCT FROM OLD.guidelines) AND (e.action<>'accept_guidelines' OR e.result->'guidelines' IS DISTINCT FROM NEW.guidelines OR NEW.guidelines->>'actorId'<>NEW.user_id::text) THEN RAISE EXCEPTION 'explicit guidelines acknowledgment required'; END IF;
 IF s.course_id IS NOT NULL THEN
  SELECT * INTO c FROM courses WHERE id=s.course_id;
  SELECT * INTO r FROM workspace_publication_releases WHERE project_id=s.project_id ORDER BY number DESC LIMIT 1;
  SELECT * INTO p FROM workspace_publication_prices WHERE id=s.current_price_id;
  IF r.id IS NULL OR p.id IS NULL OR c.workspace_project_id IS DISTINCT FROM s.project_id OR c.workspace_state IS DISTINCT FROM s.status OR c.is_published IS DISTINCT FROM (s.status='live') OR r.course_id IS DISTINCT FROM s.course_id OR r.revision_id IS DISTINCT FROM s.current_revision_id OR p.project_id IS DISTINCT FROM s.project_id OR p.status NOT IN ('creator','approved') OR c.price IS DISTINCT FROM p.amount_paise::numeric/100 THEN RAISE EXCEPTION 'publication mirror mismatch'; END IF;
  IF r.price_id IS DISTINCT FROM s.current_price_id AND NOT EXISTS(SELECT 1 FROM workspace_publication_events pe WHERE pe.project_id=s.project_id AND pe.actor_id=s.user_id AND pe.action='set_price' AND pe.result->>'priceId'=s.current_price_id::text) THEN RAISE EXCEPTION 'price application audit required'; END IF;
 END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER publication_notice_immutable BEFORE UPDATE OR DELETE ON workspace_publication_notices FOR EACH ROW EXECUTE FUNCTION workspace_publication_history_guard();
--> statement-breakpoint
CREATE TRIGGER publication_notice_no_truncate BEFORE TRUNCATE ON workspace_publication_notices FOR EACH STATEMENT EXECUTE FUNCTION workspace_publication_history_guard();

--> statement-breakpoint
CREATE OR REPLACE FUNCTION course_sale_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c courses; p workspace_publication_prices; st workspace_publication_states; e jsonb;
BEGIN
 SELECT * INTO c FROM courses WHERE id=NEW.course_id;
 IF c.workspace_project_id IS NOT NULL THEN PERFORM 1 FROM workspace_publication_states WHERE project_id=c.workspace_project_id FOR SHARE; END IF;
 SELECT * INTO c FROM courses WHERE id=NEW.course_id FOR SHARE;
 IF c.workspace_project_id IS NOT NULL OR NEW.purchase_evidence IS NOT NULL THEN
  e:=NEW.purchase_evidence;
  IF NOT coalesce(jsonb_typeof(e)='object' AND jsonb_typeof(e->'version')='number' AND jsonb_typeof(e->'totalPaise')='number' AND jsonb_typeof(e->'listPaise')='number' AND jsonb_typeof(e->'discountPaise')='number' AND jsonb_typeof(e->'taxablePaise')='number' AND jsonb_typeof(e->'taxPaise')='number',false) THEN RAISE EXCEPTION 'invalid_purchase_evidence'; END IF;
  IF c.id IS NULL OR e IS NULL OR NOT (e ?& ARRAY['version','currency','totalPaise','listPaise','discountPaise','taxablePaise','taxPaise','taxRate','taxInclusive','courseTitle','accessDays','creatorId','projectId','priceId']) OR e->>'taxRate' IS DISTINCT FROM '18' OR e->>'taxInclusive' IS DISTINCT FROM 'true' OR (e->>'taxablePaise')::int<>round((e->>'totalPaise')::numeric/1.18) OR (e->>'totalPaise')::int<=0 OR NOT c.is_published OR c.workspace_state='suspended' OR (e->>'version')::int<>1 OR e->>'currency'<>'INR' OR (e->>'totalPaise')::int<>round(NEW.amount*100) OR (e->>'listPaise')::int<>round(c.price*100) OR (e->>'discountPaise')::int<0 OR (e->>'discountPaise')::int+(e->>'totalPaise')::int<>(e->>'listPaise')::int OR (e->>'taxablePaise')::int+(e->>'taxPaise')::int<>(e->>'totalPaise')::int THEN RAISE EXCEPTION 'invalid_purchase_evidence'; END IF;
  IF c.workspace_project_id IS NOT NULL THEN
   SELECT * INTO st FROM workspace_publication_states WHERE project_id=c.workspace_project_id;
   SELECT * INTO p FROM workspace_publication_prices WHERE id=NEW.workspace_price_id;
   IF p.id IS NULL OR p.status NOT IN ('creator','approved') OR st.project_id IS NULL OR st.status<>'live' OR st.course_id IS DISTINCT FROM c.id OR st.current_price_id IS DISTINCT FROM p.id OR p.project_id<>c.workspace_project_id OR p.user_id<>c.instructor_id OR p.amount_paise<>round(c.price*100) OR NEW.creator_id IS DISTINCT FROM c.instructor_id OR e->>'creatorId' IS DISTINCT FROM c.instructor_id::text OR e->>'priceId' IS DISTINCT FROM p.id::text OR e->>'projectId' IS DISTINCT FROM c.workspace_project_id::text THEN RAISE EXCEPTION 'current_creator_price_required'; END IF;
  ELSIF NEW.creator_id IS NOT NULL OR NEW.workspace_price_id IS NOT NULL THEN RAISE EXCEPTION 'invalid_creator_attribution'; END IF;
 END IF;
 RETURN NEW;
END $$;

--> statement-breakpoint
CREATE FUNCTION workspace_creator_release_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s workspace_publication_states;
BEGIN
 SELECT * INTO s FROM workspace_publication_states WHERE project_id=NEW.project_id;
 IF s.project_id IS NULL OR s.status<>'live' OR s.moderation->>'restriction' IN ('unpublished','suspended') OR s.guidelines IS NULL OR s.guidelines->>'version' IS DISTINCT FROM 'creator_publishing_2026_01' OR s.guidelines->>'contentHash' IS DISTINCT FROM '46bcd08d35feccc1b1e0e241ac57e429d252af5a060057c637d6893d13affc6c' OR s.guidelines->>'actorId' IS DISTINCT FROM NEW.actor_id::text OR (s.guidelines->>'acceptedAt')::timestamptz>NEW.created_at OR NOT EXISTS(SELECT 1 FROM workspace_course_projects cp JOIN workspace_creator_profiles pr ON pr.id=cp.creator_profile_id WHERE cp.id=NEW.project_id AND cp.user_id=NEW.actor_id AND pr.status='enabled') THEN RAISE EXCEPTION 'current Creator guidelines and unrestricted identity required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM workspace_publication_events e WHERE e.project_id=NEW.project_id AND e.actor_id=NEW.actor_id AND e.action='publish' AND e.created_at=NEW.created_at AND e.result->>'revisionId'=NEW.revision_id::text AND e.result->>'priceId'=NEW.price_id::text AND e.result->'guidelines'=s.guidelines) THEN RAISE EXCEPTION 'Creator publication audit required'; END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER creator_release_proof AFTER INSERT ON workspace_publication_releases DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_creator_release_proof();
