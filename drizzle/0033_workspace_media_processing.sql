CREATE TABLE "workspace_media_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"state" text NOT NULL,
	"source_version" text NOT NULL,
	"policy" text NOT NULL,
	"provider_job_id" text,
	"dispatched_at" timestamp with time zone,
	"manifest" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_media_jobs_asset_id_unique" UNIQUE("asset_id"),
	CONSTRAINT "workspace_media_jobs_state_check" CHECK ("workspace_media_jobs"."state" IN ('queued','dispatching','submitted','complete','failed','uncertain') AND length("workspace_media_jobs"."source_version")>0 AND "workspace_media_jobs"."source_version"<>'null' AND length("workspace_media_jobs"."policy")>0 AND "workspace_media_jobs"."updated_at">="workspace_media_jobs"."created_at" AND ("workspace_media_jobs"."state"<>'complete' OR ("workspace_media_jobs"."manifest" IS NOT NULL AND "workspace_media_jobs"."provider_job_id" IS NOT NULL)))
);
--> statement-breakpoint
ALTER TABLE "workspace_media_jobs" ADD CONSTRAINT "workspace_media_jobs_asset_id_workspace_course_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."workspace_course_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_media_jobs_pending_idx" ON "workspace_media_jobs" USING btree ("state","updated_at");
--> statement-breakpoint
CREATE FUNCTION workspace_media_job_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a workspace_course_assets%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'processing provenance is retained'; END IF;
 SELECT * INTO a FROM workspace_course_assets WHERE id=NEW.asset_id FOR UPDATE;
 IF a.asset_kind<>'video' OR a.object_version_id IS DISTINCT FROM NEW.source_version THEN RAISE EXCEPTION 'processing source mismatch'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.state<>'queued' OR a.status<>'verified' OR NEW.provider_job_id IS NOT NULL OR NEW.manifest IS NOT NULL OR NEW.dispatched_at IS NOT NULL OR NEW.updated_at<>NEW.created_at THEN RAISE EXCEPTION 'invalid processing intent'; END IF;
 ELSE
  IF NEW.id<>OLD.id OR NEW.asset_id<>OLD.asset_id OR NEW.source_version<>OLD.source_version OR NEW.policy<>OLD.policy OR NEW.created_at<>OLD.created_at OR NEW.updated_at<OLD.updated_at
    OR OLD.provider_job_id IS NOT NULL AND NEW.provider_job_id IS DISTINCT FROM OLD.provider_job_id
    OR OLD.dispatched_at IS NOT NULL AND NEW.dispatched_at IS DISTINCT FROM OLD.dispatched_at
    OR OLD.manifest IS NOT NULL AND NEW.manifest IS DISTINCT FROM OLD.manifest
    OR OLD.state IN ('complete','failed')
    OR NOT (NEW.state=OLD.state OR OLD.state='queued' AND NEW.state='dispatching' OR OLD.state='dispatching' AND NEW.state IN ('submitted','uncertain','complete','failed') OR OLD.state='uncertain' AND NEW.state IN ('submitted','complete','failed') OR OLD.state='submitted' AND NEW.state IN ('complete','failed'))
  THEN RAISE EXCEPTION 'immutable or stale processing job'; END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_media_job_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_media_jobs FOR EACH ROW EXECUTE FUNCTION workspace_media_job_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_media_jobs_retained_truncate_guard BEFORE TRUNCATE ON workspace_media_jobs FOR EACH STATEMENT EXECUTE FUNCTION workspace_retained_history_reject_truncate();
