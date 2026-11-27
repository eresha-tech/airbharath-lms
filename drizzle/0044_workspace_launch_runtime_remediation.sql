CREATE TABLE "workspace_media_verifications" (
	"job_id" uuid PRIMARY KEY NOT NULL,
	"provider_job_id" text NOT NULL,
	"source_version" text NOT NULL,
	"phase" text NOT NULL,
	"inventory" jsonb NOT NULL,
	"continuation" text,
	"verified" jsonb NOT NULL,
	"version" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_media_verification_values" CHECK ("workspace_media_verifications"."phase" IN ('listing','verifying','complete') AND "workspace_media_verifications"."version">0 AND jsonb_typeof("workspace_media_verifications"."inventory")='array' AND jsonb_array_length("workspace_media_verifications"."inventory")<=2000 AND jsonb_typeof("workspace_media_verifications"."verified")='object' AND ("workspace_media_verifications"."phase"='listing' OR "workspace_media_verifications"."continuation" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "workspace_worker_health" DROP CONSTRAINT "workspace_worker_health_values";--> statement-breakpoint
ALTER TABLE "course_finance_runs" ADD COLUMN "lease_token" uuid;--> statement-breakpoint
ALTER TABLE "course_finance_runs" ADD COLUMN "lease_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "course_finance_runs" ADD COLUMN "dispute_next_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "course_finance_runs" ADD COLUMN "phase" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "course_finance_runs" ADD COLUMN "last_error" text;--> statement-breakpoint
ALTER TABLE "workspace_media_verifications" ADD CONSTRAINT "workspace_media_verifications_job_id_workspace_media_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."workspace_media_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_finance_runs" ADD CONSTRAINT "course_finance_run_lease" CHECK ((("course_finance_runs"."lease_token" IS NULL)=("course_finance_runs"."lease_until" IS NULL)) AND "course_finance_runs"."phase" IN (0,1,2));--> statement-breakpoint
ALTER TABLE "workspace_worker_health" ADD CONSTRAINT "workspace_worker_health_values" CHECK ("workspace_worker_health"."key" IN ('membership','course_payments','payouts','bank_validations','media','refund_notices') AND "workspace_worker_health"."outcome" IN ('running','success','attention','failed') AND (("workspace_worker_health"."outcome"='running')=("workspace_worker_health"."lease_until" IS NOT NULL)));
--> statement-breakpoint
-- Checkpoints are separate from the final immutable manifest. CAS/version and
-- monotonic evidence preserve progress across retries without making an asset Ready.
CREATE FUNCTION workspace_media_verification_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE j workspace_media_jobs%ROWTYPE; item record; old_prefix jsonb; entries integer; total_bytes bigint;
BEGIN
 IF TG_OP IN ('DELETE','TRUNCATE') THEN RAISE EXCEPTION 'verification evidence is retained'; END IF;
 SELECT * INTO j FROM workspace_media_jobs WHERE id=NEW.job_id FOR UPDATE;
 IF j.id IS NULL OR j.state NOT IN ('dispatching','submitted','uncertain') OR NEW.source_version<>j.source_version
    OR (j.provider_job_id IS NOT NULL AND NEW.provider_job_id<>j.provider_job_id)
    OR length(NEW.provider_job_id) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'verification job binding'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.version<>1 OR NEW.verified<>'{}'::jsonb OR NEW.phase='complete' THEN RAISE EXCEPTION 'verification intent'; END IF;
 ELSE
  IF NEW.job_id<>OLD.job_id OR NEW.provider_job_id<>OLD.provider_job_id OR NEW.source_version<>OLD.source_version
     OR NEW.version<>OLD.version+1 OR NEW.updated_at<OLD.updated_at OR NOT (NEW.verified @> OLD.verified)
     OR OLD.phase<>'listing' AND NEW.inventory<>OLD.inventory
     OR NOT (NEW.phase=OLD.phase OR OLD.phase='listing' AND NEW.phase='verifying' OR OLD.phase='verifying' AND NEW.phase='complete')
     OR OLD.phase='complete' AND NEW.verified<>OLD.verified THEN RAISE EXCEPTION 'immutable verification evidence'; END IF;
  IF NEW.inventory IS DISTINCT FROM OLD.inventory THEN
  SELECT coalesce(jsonb_agg(value ORDER BY ordinality),'[]'::jsonb) INTO old_prefix
    FROM jsonb_array_elements(NEW.inventory) WITH ORDINALITY WHERE ordinality<=jsonb_array_length(OLD.inventory);
  IF old_prefix<>OLD.inventory THEN RAISE EXCEPTION 'verification inventory changed'; END IF;
  END IF;
 END IF;
 SELECT count(DISTINCT value->>'name'),coalesce(sum((value->>'size')::bigint),0) INTO entries,total_bytes FROM jsonb_array_elements(NEW.inventory);
 IF entries<>jsonb_array_length(NEW.inventory) OR entries>2000 OR total_bytes>4294967296 THEN RAISE EXCEPTION 'verification inventory bounds'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(NEW.inventory) LOOP
  IF coalesce(item.value->>'name','') !~ '^(master(_[a-zA-Z0-9-]+)?\.m3u8|master_[a-zA-Z0-9-]+(_[0-9]+)?\.ts)$'
     OR length(item.value->>'name')>180 OR coalesce((item.value->>'size')::bigint,0) NOT BETWEEN 1 AND 33554432
     OR coalesce(length(item.value->>'etag'),0) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'invalid output inventory'; END IF;
 END LOOP;
 FOR item IN SELECT key,value FROM jsonb_each(NEW.verified) WHERE NOT (coalesce(OLD.verified,'{}'::jsonb) ? key) LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.inventory) e WHERE e->>'name'=item.key AND (e->>'size')::bigint=(item.value->>'size')::bigint)
     OR coalesce(item.value->>'version','') IN ('','null') OR coalesce(item.value->>'checksum','') !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid verified output'; END IF;
 END LOOP;
 IF NEW.phase='complete' AND (entries<3 OR NOT (NEW.verified ? 'master.m3u8') OR (SELECT count(*) FROM jsonb_each(NEW.verified))<>entries) THEN RAISE EXCEPTION 'partial verification cannot complete'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_media_verification_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_media_verifications FOR EACH ROW EXECUTE FUNCTION workspace_media_verification_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_media_verification_no_truncate BEFORE TRUNCATE ON workspace_media_verifications FOR EACH STATEMENT EXECUTE FUNCTION workspace_media_verification_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_media_verified_completion_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c workspace_media_verifications%ROWTYPE;
BEGIN
 IF NEW.state='complete' AND OLD.state<>'complete' THEN
  SELECT * INTO c FROM workspace_media_verifications WHERE job_id=NEW.id;
  IF c.job_id IS NOT NULL AND (c.phase<>'complete' OR c.verified IS DISTINCT FROM NEW.manifest OR c.source_version<>NEW.source_version OR c.provider_job_id<>NEW.provider_job_id) THEN RAISE EXCEPTION 'full verification required before Ready'; END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_media_verified_completion_guard BEFORE UPDATE ON workspace_media_jobs FOR EACH ROW EXECUTE FUNCTION workspace_media_verified_completion_guard();
