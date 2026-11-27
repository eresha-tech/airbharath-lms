CREATE TABLE "workspace_course_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"creator_profile_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"asset_kind" text NOT NULL,
	"status" text DEFAULT 'pending_upload' NOT NULL,
	"filename" text NOT NULL,
	"display_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" bigint NOT NULL,
	"storage_provider" text NOT NULL,
	"storage_container" text NOT NULL,
	"storage_account_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"object_version_id" text,
	"checksum" text,
	"verification_policy" text,
	"processing_job_id" text,
	"processing_source_version" text,
	"processing_policy" text,
	"output_key" text,
	"output_version_id" text,
	"replaces_asset_id" uuid,
	"replacement_version" integer,
	"caption_video_id" uuid,
	"caption_source_version" text,
	"language" text,
	"is_attached" boolean DEFAULT false NOT NULL,
	"resource_position" integer,
	"request_key" uuid NOT NULL,
	"context_hash" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"uploaded_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"detached_at" timestamp with time zone,
	CONSTRAINT "workspace_assets_resource_position_unique" UNIQUE("lesson_id","resource_position") DEFERRABLE INITIALLY DEFERRED,
	CONSTRAINT "workspace_assets_file_check" CHECK (length(btrim("workspace_course_assets"."filename")) BETWEEN 1 AND 180 AND length(btrim("workspace_course_assets"."display_name")) BETWEEN 1 AND 180 AND (("workspace_course_assets"."asset_kind"='video' AND "workspace_course_assets"."mime_type"='video/mp4' AND "workspace_course_assets"."byte_size" BETWEEN 1 AND 2147483648) OR ("workspace_course_assets"."asset_kind"='resource' AND "workspace_course_assets"."mime_type" IN ('application/pdf','image/png','image/jpeg') AND "workspace_course_assets"."byte_size" BETWEEN 1 AND 20971520) OR ("workspace_course_assets"."asset_kind"='caption' AND "workspace_course_assets"."mime_type"='text/vtt' AND "workspace_course_assets"."byte_size" BETWEEN 1 AND 1048576))),
	CONSTRAINT "workspace_assets_storage_check" CHECK ("workspace_course_assets"."storage_provider"='s3' AND length(btrim("workspace_course_assets"."storage_container"))>0 AND "workspace_course_assets"."storage_account_id" ~ '^[0-9]{12}$' AND "workspace_course_assets"."storage_key"='workspace/'||"workspace_course_assets"."creator_profile_id"::text||'/'||"workspace_course_assets"."project_id"::text||'/'||"workspace_course_assets"."id"::text||'/source' AND "workspace_course_assets"."context_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "workspace_assets_kind_check" CHECK ((("workspace_course_assets"."asset_kind"='video' AND "workspace_course_assets"."replacement_version" IS NOT NULL AND "workspace_course_assets"."replacement_version">0) OR ("workspace_course_assets"."asset_kind"<>'video' AND "workspace_course_assets"."replacement_version" IS NULL AND "workspace_course_assets"."replaces_asset_id" IS NULL)) AND (("workspace_course_assets"."asset_kind"='caption' AND "workspace_course_assets"."caption_video_id" IS NOT NULL AND "workspace_course_assets"."caption_source_version" IS NOT NULL AND length("workspace_course_assets"."caption_source_version")>0 AND "workspace_course_assets"."language" IS NOT NULL AND "workspace_course_assets"."language" ~ '^[a-z]{2,3}(-[A-Z]{2})?$') OR ("workspace_course_assets"."asset_kind"<>'caption' AND "workspace_course_assets"."caption_video_id" IS NULL AND "workspace_course_assets"."caption_source_version" IS NULL AND "workspace_course_assets"."language" IS NULL))),
	CONSTRAINT "workspace_assets_state_check" CHECK ("workspace_course_assets"."status" IN ('pending_upload','uploaded','verified','processing','ready','failed','detached') AND (NOT "workspace_course_assets"."is_attached" OR "workspace_course_assets"."status"='ready') AND (("workspace_course_assets"."asset_kind"='resource' AND "workspace_course_assets"."is_attached" AND "workspace_course_assets"."resource_position" IS NOT NULL AND "workspace_course_assets"."resource_position">=0) OR (NOT ("workspace_course_assets"."asset_kind"='resource' AND "workspace_course_assets"."is_attached") AND "workspace_course_assets"."resource_position" IS NULL)) AND ("workspace_course_assets"."status"<>'processing' OR "workspace_course_assets"."asset_kind"='video')),
	CONSTRAINT "workspace_assets_evidence_check" CHECK (("workspace_course_assets"."status" NOT IN ('uploaded','verified','processing','ready') OR ("workspace_course_assets"."object_version_id" IS NOT NULL AND length("workspace_course_assets"."object_version_id")>0 AND "workspace_course_assets"."object_version_id"<>'null' AND "workspace_course_assets"."uploaded_at" IS NOT NULL)) AND ("workspace_course_assets"."status" NOT IN ('verified','processing','ready') OR ("workspace_course_assets"."verified_at" IS NOT NULL AND "workspace_course_assets"."checksum" IS NOT NULL AND "workspace_course_assets"."checksum" ~ '^[a-f0-9]{64}$' AND "workspace_course_assets"."verification_policy" IS NOT NULL AND length("workspace_course_assets"."verification_policy")>0)) AND ("workspace_course_assets"."status"<>'ready' OR "workspace_course_assets"."ready_at" IS NOT NULL) AND ("workspace_course_assets"."status"<>'detached' OR ("workspace_course_assets"."detached_at" IS NOT NULL AND NOT "workspace_course_assets"."is_attached")) AND ("workspace_course_assets"."status"<>'processing' AND NOT ("workspace_course_assets"."asset_kind"='video' AND "workspace_course_assets"."status"='ready') OR ("workspace_course_assets"."processing_job_id" IS NOT NULL AND length("workspace_course_assets"."processing_job_id")>0 AND "workspace_course_assets"."processing_source_version" IS NOT NULL AND "workspace_course_assets"."processing_source_version"="workspace_course_assets"."object_version_id" AND "workspace_course_assets"."processing_policy" IS NOT NULL AND length("workspace_course_assets"."processing_policy")>0)) AND ("workspace_course_assets"."asset_kind"<>'video' OR "workspace_course_assets"."status"<>'ready' OR ("workspace_course_assets"."output_key" IS NOT NULL AND "workspace_course_assets"."output_version_id" IS NOT NULL AND length("workspace_course_assets"."output_version_id")>0))),
	CONSTRAINT "workspace_assets_time_check" CHECK ("workspace_course_assets"."version" BETWEEN 1 AND 2147483646 AND "workspace_course_assets"."updated_at">="workspace_course_assets"."created_at" AND "workspace_course_assets"."expires_at">"workspace_course_assets"."created_at" AND ("workspace_course_assets"."uploaded_at" IS NULL OR "workspace_course_assets"."uploaded_at">="workspace_course_assets"."created_at") AND ("workspace_course_assets"."verified_at" IS NULL OR ("workspace_course_assets"."uploaded_at" IS NOT NULL AND "workspace_course_assets"."verified_at">="workspace_course_assets"."uploaded_at")) AND ("workspace_course_assets"."ready_at" IS NULL OR ("workspace_course_assets"."verified_at" IS NOT NULL AND "workspace_course_assets"."ready_at">="workspace_course_assets"."verified_at")) AND ("workspace_course_assets"."detached_at" IS NULL OR "workspace_course_assets"."detached_at">="workspace_course_assets"."created_at"))
);
--> statement-breakpoint
ALTER TABLE "workspace_course_lessons" ADD COLUMN "content_format" text DEFAULT 'plain_text' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_course_lessons" ADD COLUMN "media_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_assets_owner_idx" ON "workspace_course_assets" USING btree ("id","lesson_id","project_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_assets_request_idx" ON "workspace_course_assets" USING btree ("user_id","request_key");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_assets_object_idx" ON "workspace_course_assets" USING btree ("storage_provider","storage_container","storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_assets_video_current_idx" ON "workspace_course_assets" USING btree ("lesson_id") WHERE "workspace_course_assets"."asset_kind"='video' AND "workspace_course_assets"."is_attached";--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_assets_video_pending_idx" ON "workspace_course_assets" USING btree ("lesson_id") WHERE "workspace_course_assets"."asset_kind"='video' AND "workspace_course_assets"."status" IN ('pending_upload','uploaded','verified','processing','ready') AND NOT "workspace_course_assets"."is_attached";--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_assets_replacement_version_idx" ON "workspace_course_assets" USING btree ("lesson_id","replacement_version");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_assets_caption_current_idx" ON "workspace_course_assets" USING btree ("caption_video_id","language") WHERE "workspace_course_assets"."asset_kind"='caption' AND "workspace_course_assets"."is_attached";--> statement-breakpoint
CREATE INDEX "workspace_assets_lesson_idx" ON "workspace_course_assets" USING btree ("lesson_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_lessons_media_owner_idx" ON "workspace_course_lessons" USING btree ("id","project_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_projects_media_owner_idx" ON "workspace_course_projects" USING btree ("id","user_id","creator_profile_id");--> statement-breakpoint
ALTER TABLE "workspace_course_lessons" ADD CONSTRAINT "workspace_lessons_format_media_check" CHECK ("workspace_course_lessons"."content_format" IN ('plain_text','markdown') AND "workspace_course_lessons"."media_revision" BETWEEN 0 AND 2147483646);
--> statement-breakpoint
ALTER TABLE "workspace_course_assets" ADD CONSTRAINT "workspace_assets_lesson_owner_fk" FOREIGN KEY ("lesson_id","project_id","user_id") REFERENCES "public"."workspace_course_lessons"("id","project_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_course_assets" ADD CONSTRAINT "workspace_assets_project_owner_fk" FOREIGN KEY ("project_id","user_id","creator_profile_id") REFERENCES "public"."workspace_course_projects"("id","user_id","creator_profile_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_course_assets" ADD CONSTRAINT "workspace_assets_replaces_owner_fk" FOREIGN KEY ("replaces_asset_id","lesson_id","project_id","user_id") REFERENCES "public"."workspace_course_assets"("id","lesson_id","project_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_course_assets" ADD CONSTRAINT "workspace_assets_caption_owner_fk" FOREIGN KEY ("caption_video_id","lesson_id","project_id","user_id") REFERENCES "public"."workspace_course_assets"("id","lesson_id","project_id","user_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
-- Custom guards complement generated checks; Drizzle snapshots cannot represent
-- deferred ordering, lifecycle transitions, retained history or derived revisions.
CREATE FUNCTION workspace_media_asset_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent workspace_course_assets%ROWTYPE; n integer;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'media provenance is retained; detach instead'; END IF;
  -- Serialize all media changes against Builder edits/deletes, even direct SQL.
  PERFORM 1 FROM workspace_course_lessons WHERE id=NEW.lesson_id AND project_id=NEW.project_id AND user_id=NEW.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'owned lesson required'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status<>'pending_upload' OR NEW.version<>1 OR NEW.is_attached OR NEW.created_at<>NEW.updated_at
      OR NEW.object_version_id IS NOT NULL OR NEW.uploaded_at IS NOT NULL OR NEW.verified_at IS NOT NULL
      OR NEW.checksum IS NOT NULL OR NEW.verification_policy IS NOT NULL OR NEW.processing_job_id IS NOT NULL
      OR NEW.processing_source_version IS NOT NULL OR NEW.processing_policy IS NOT NULL
      OR NEW.output_key IS NOT NULL OR NEW.output_version_id IS NOT NULL OR NEW.ready_at IS NOT NULL OR NEW.detached_at IS NOT NULL
    THEN RAISE EXCEPTION 'invalid initial media evidence'; END IF;
    SELECT count(*) INTO n FROM workspace_course_assets WHERE lesson_id=NEW.lesson_id;
    IF n>=200 THEN RAISE EXCEPTION 'lesson media history limit'; END IF;
    IF NEW.asset_kind='video' THEN
      SELECT coalesce(max(replacement_version),0)+1 INTO n FROM workspace_course_assets WHERE lesson_id=NEW.lesson_id;
      IF NEW.replacement_version<>n THEN RAISE EXCEPTION 'invalid replacement version'; END IF;
      SELECT * INTO parent FROM workspace_course_assets WHERE lesson_id=NEW.lesson_id AND asset_kind='video' AND is_attached;
      IF NEW.replaces_asset_id IS DISTINCT FROM parent.id THEN RAISE EXCEPTION 'stale video replacement'; END IF;
    END IF;
  ELSE
    IF (to_jsonb(NEW) - ARRAY['status','display_name','is_attached','resource_position','object_version_id','checksum','verification_policy','processing_job_id','processing_source_version','processing_policy','output_key','output_version_id','uploaded_at','verified_at','ready_at','detached_at','version','updated_at'])
       IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','display_name','is_attached','resource_position','object_version_id','checksum','verification_policy','processing_job_id','processing_source_version','processing_policy','output_key','output_version_id','uploaded_at','verified_at','ready_at','detached_at','version','updated_at'])
      OR NEW.version<>OLD.version+1 OR NEW.updated_at<OLD.updated_at
    THEN RAISE EXCEPTION 'immutable media identity or stale version'; END IF;
    IF NOT (NEW.status=OLD.status OR NEW.status='detached' OR
      OLD.status='pending_upload' AND NEW.status IN ('uploaded','failed') OR
      OLD.status='uploaded' AND NEW.status IN ('verified','failed') OR
      OLD.status='verified' AND (NEW.status='failed' OR NEW.asset_kind='video' AND NEW.status='processing' OR NEW.asset_kind<>'video' AND NEW.status='ready') OR
      OLD.status='processing' AND NEW.status IN ('ready','failed')) OR OLD.status='detached'
    THEN RAISE EXCEPTION 'invalid media transition'; END IF;
    -- Evidence is append-only once established. Retrying a failed job uses a new asset intent.
    IF OLD.object_version_id IS NOT NULL AND NEW.object_version_id IS DISTINCT FROM OLD.object_version_id
      OR OLD.checksum IS NOT NULL AND NEW.checksum IS DISTINCT FROM OLD.checksum
      OR OLD.verification_policy IS NOT NULL AND NEW.verification_policy IS DISTINCT FROM OLD.verification_policy
      OR OLD.processing_job_id IS NOT NULL AND NEW.processing_job_id IS DISTINCT FROM OLD.processing_job_id
      OR OLD.processing_source_version IS NOT NULL AND NEW.processing_source_version IS DISTINCT FROM OLD.processing_source_version
      OR OLD.processing_policy IS NOT NULL AND NEW.processing_policy IS DISTINCT FROM OLD.processing_policy
      OR OLD.output_key IS NOT NULL AND NEW.output_key IS DISTINCT FROM OLD.output_key
      OR OLD.output_version_id IS NOT NULL AND NEW.output_version_id IS DISTINCT FROM OLD.output_version_id
      OR OLD.uploaded_at IS NOT NULL AND NEW.uploaded_at IS DISTINCT FROM OLD.uploaded_at
      OR OLD.verified_at IS NOT NULL AND NEW.verified_at IS DISTINCT FROM OLD.verified_at
      OR OLD.ready_at IS NOT NULL AND NEW.ready_at IS DISTINCT FROM OLD.ready_at
    THEN RAISE EXCEPTION 'media evidence is immutable'; END IF;
    IF OLD.is_attached AND NOT NEW.is_attached AND NEW.status<>'detached' THEN RAISE EXCEPTION 'detach must retain history'; END IF;
  END IF;
  IF NEW.asset_kind='caption' AND NEW.status NOT IN ('failed','detached') THEN
    SELECT * INTO parent FROM workspace_course_assets WHERE id=NEW.caption_video_id AND lesson_id=NEW.lesson_id AND project_id=NEW.project_id AND user_id=NEW.user_id;
    IF parent.id IS NULL OR parent.asset_kind<>'video' OR NOT parent.is_attached OR parent.object_version_id IS DISTINCT FROM NEW.caption_source_version
    THEN RAISE EXCEPTION 'caption source must match selected video'; END IF;
  END IF;
  IF NEW.output_version_id='null' THEN RAISE EXCEPTION 'versioned processing output required'; END IF;
  IF NEW.output_key IS NOT NULL AND NEW.output_key <> 'workspace/'||NEW.creator_profile_id::text||'/'||NEW.project_id::text||'/'||NEW.id::text||'/processed/master.m3u8'
  THEN RAISE EXCEPTION 'invalid processed output identity'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_media_asset_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_course_assets
FOR EACH ROW EXECUTE FUNCTION workspace_media_asset_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_media_revision_advance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE workspace_course_lessons SET media_revision=media_revision+1, version=version+1,
    updated_at=greatest(updated_at,NEW.updated_at) WHERE id=NEW.lesson_id AND project_id=NEW.project_id AND user_id=NEW.user_id;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_media_revision_advance AFTER INSERT OR UPDATE ON workspace_course_assets
FOR EACH ROW EXECUTE FUNCTION workspace_media_revision_advance();
--> statement-breakpoint
CREATE FUNCTION workspace_media_lesson_revision_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.media_revision<>0 THEN RAISE EXCEPTION 'invalid initial media revision'; END IF;
  ELSIF NEW.media_revision<>OLD.media_revision AND
    (NEW.media_revision<>OLD.media_revision+1 OR pg_trigger_depth()<2)
  THEN RAISE EXCEPTION 'media revision is derived and monotonic'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_media_lesson_revision_guard BEFORE INSERT OR UPDATE ON workspace_course_lessons
FOR EACH ROW EXECUTE FUNCTION workspace_media_lesson_revision_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_media_positions_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n integer; lo integer; hi integer;
BEGIN
  SELECT count(*),min(resource_position),max(resource_position) INTO n,lo,hi
    FROM workspace_course_assets WHERE lesson_id=NEW.lesson_id AND asset_kind='resource' AND is_attached;
  IF n>0 AND (lo<>0 OR hi<>n-1) THEN RAISE EXCEPTION 'resource positions must be contiguous'; END IF;
  IF (SELECT count(*) FROM workspace_course_assets WHERE lesson_id=NEW.lesson_id AND asset_kind='resource' AND status NOT IN ('failed','detached'))>10
    OR (SELECT count(*) FROM workspace_course_assets WHERE lesson_id=NEW.lesson_id AND asset_kind='caption' AND status NOT IN ('failed','detached'))>16
  THEN RAISE EXCEPTION 'lesson attachment limit'; END IF;
  IF EXISTS (SELECT 1 FROM workspace_course_assets c LEFT JOIN workspace_course_assets v ON v.id=c.caption_video_id
    WHERE c.lesson_id=NEW.lesson_id AND c.asset_kind='caption' AND c.status NOT IN ('failed','detached')
    AND (v.id IS NULL OR NOT v.is_attached OR v.asset_kind<>'video' OR v.object_version_id IS DISTINCT FROM c.caption_source_version))
  THEN RAISE EXCEPTION 'caption must follow selected video'; END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workspace_media_positions_guard AFTER INSERT OR UPDATE ON workspace_course_assets
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_media_positions_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_media_retained_truncate_guard BEFORE TRUNCATE ON workspace_course_assets
FOR EACH STATEMENT EXECUTE FUNCTION workspace_retained_history_reject_truncate();
