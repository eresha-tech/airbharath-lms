ALTER TABLE "workspace_course_assets" ALTER COLUMN "lesson_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_course_assets" ADD CONSTRAINT "workspace_asset_cover_scope" CHECK ("workspace_course_assets"."lesson_id" IS NOT NULL OR ("workspace_course_assets"."asset_kind"='resource' AND "workspace_course_assets"."mime_type" IN ('image/png','image/jpeg') AND NOT "workspace_course_assets"."is_attached"));
--> statement-breakpoint
-- Extend the existing verification/lifecycle guard only for project-owned PNG/JPEG covers.
CREATE OR REPLACE FUNCTION workspace_media_asset_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent workspace_course_assets%ROWTYPE; n integer;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'media provenance is retained; detach instead'; END IF;
  -- Serialize all media changes against Builder edits/deletes, even direct SQL.
  IF NEW.lesson_id IS NULL THEN
    PERFORM 1 FROM workspace_course_projects WHERE id=NEW.project_id AND user_id=NEW.user_id AND creator_profile_id=NEW.creator_profile_id FOR UPDATE;
    IF NOT FOUND OR NEW.asset_kind<>'resource' OR NEW.mime_type NOT IN ('image/png','image/jpeg') OR NEW.is_attached THEN RAISE EXCEPTION 'owned project image required'; END IF;
  ELSE
    PERFORM 1 FROM workspace_course_lessons WHERE id=NEW.lesson_id AND project_id=NEW.project_id AND user_id=NEW.user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'owned lesson required'; END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status<>'pending_upload' OR NEW.version<>1 OR NEW.is_attached OR NEW.created_at<>NEW.updated_at
      OR NEW.object_version_id IS NOT NULL OR NEW.uploaded_at IS NOT NULL OR NEW.verified_at IS NOT NULL
      OR NEW.checksum IS NOT NULL OR NEW.verification_policy IS NOT NULL OR NEW.processing_job_id IS NOT NULL
      OR NEW.processing_source_version IS NOT NULL OR NEW.processing_policy IS NOT NULL
      OR NEW.output_key IS NOT NULL OR NEW.output_version_id IS NOT NULL OR NEW.ready_at IS NOT NULL OR NEW.detached_at IS NOT NULL
    THEN RAISE EXCEPTION 'invalid initial media evidence'; END IF;
    SELECT count(*) INTO n FROM workspace_course_assets WHERE (NEW.lesson_id IS NOT NULL AND lesson_id=NEW.lesson_id) OR (NEW.lesson_id IS NULL AND lesson_id IS NULL AND project_id=NEW.project_id);
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
