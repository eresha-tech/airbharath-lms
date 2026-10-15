CREATE TABLE "workspace_refund_notice_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notice_id" uuid NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"current_attempt_id" uuid,
	"lease_until" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"reason_code" text,
	"payload_hash" text,
	"recipient_hash" text,
	"provider_config_hash" text,
	"template_version" text,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "workspace_refund_delivery_notice_unique" UNIQUE("notice_id"),
	CONSTRAINT "workspace_refund_delivery_state_check" CHECK ("workspace_refund_notice_deliveries"."state" IN ('pending','claimed','submitted','accepted','retryable_failure','uncertain','blocked') AND "workspace_refund_notice_deliveries"."attempt_count" BETWEEN 0 AND 5 AND "workspace_refund_notice_deliveries"."version">0 AND (("workspace_refund_notice_deliveries"."state" IN ('claimed','submitted') AND "workspace_refund_notice_deliveries"."current_attempt_id" IS NOT NULL AND "workspace_refund_notice_deliveries"."lease_until" IS NOT NULL) OR ("workspace_refund_notice_deliveries"."state" NOT IN ('claimed','submitted') AND "workspace_refund_notice_deliveries"."lease_until" IS NULL)) AND (("workspace_refund_notice_deliveries"."state"='accepted' AND "workspace_refund_notice_deliveries"."accepted_at" IS NOT NULL) OR ("workspace_refund_notice_deliveries"."state"<>'accepted' AND "workspace_refund_notice_deliveries"."accepted_at" IS NULL)) AND ("workspace_refund_notice_deliveries"."reason_code" IS NULL OR "workspace_refund_notice_deliveries"."reason_code" ~ '^[a-z_]{1,80}$') AND (("workspace_refund_notice_deliveries"."payload_hash" IS NULL AND "workspace_refund_notice_deliveries"."recipient_hash" IS NULL AND "workspace_refund_notice_deliveries"."provider_config_hash" IS NULL AND "workspace_refund_notice_deliveries"."template_version" IS NULL) OR ("workspace_refund_notice_deliveries"."payload_hash" ~ '^[a-f0-9]{64}$' AND "workspace_refund_notice_deliveries"."recipient_hash" ~ '^[a-f0-9]{64}$' AND "workspace_refund_notice_deliveries"."provider_config_hash" ~ '^[a-f0-9]{64}$' AND "workspace_refund_notice_deliveries"."template_version"='workspace-refund-notice-v1')))
);
--> statement-breakpoint
CREATE TABLE "workspace_refund_notice_delivery_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"delivery_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"state" text DEFAULT 'claimed' NOT NULL,
	"channel" text DEFAULT 'mailercloud-email-api-v1' NOT NULL,
	"dispatch_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"reason_code" text,
	"provider_code" integer,
	"provider_reference" text,
	"payload_hash" text,
	"recipient_hash" text,
	"provider_config_hash" text,
	"template_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_refund_delivery_attempt_number_unique" UNIQUE("delivery_id","attempt_number"),
	CONSTRAINT "workspace_refund_delivery_attempt_check" CHECK ("workspace_refund_notice_delivery_attempts"."attempt_number" BETWEEN 1 AND 5 AND "workspace_refund_notice_delivery_attempts"."channel"='mailercloud-email-api-v1' AND "workspace_refund_notice_delivery_attempts"."state" IN ('claimed','submitted','accepted','retryable_failure','uncertain','blocked') AND (("workspace_refund_notice_delivery_attempts"."state" IN ('claimed','submitted') AND "workspace_refund_notice_delivery_attempts"."finished_at" IS NULL AND "workspace_refund_notice_delivery_attempts"."reason_code" IS NULL) OR ("workspace_refund_notice_delivery_attempts"."state" NOT IN ('claimed','submitted') AND "workspace_refund_notice_delivery_attempts"."finished_at">="workspace_refund_notice_delivery_attempts"."created_at" AND "workspace_refund_notice_delivery_attempts"."reason_code" IS NOT NULL)) AND ("workspace_refund_notice_delivery_attempts"."state"<>'claimed' OR "workspace_refund_notice_delivery_attempts"."dispatch_at" IS NULL) AND ("workspace_refund_notice_delivery_attempts"."dispatch_at" IS NULL OR "workspace_refund_notice_delivery_attempts"."dispatch_at">="workspace_refund_notice_delivery_attempts"."created_at") AND ("workspace_refund_notice_delivery_attempts"."state" NOT IN ('submitted','accepted','uncertain') OR "workspace_refund_notice_delivery_attempts"."dispatch_at" IS NOT NULL) AND ("workspace_refund_notice_delivery_attempts"."provider_code" IS NULL OR "workspace_refund_notice_delivery_attempts"."provider_code" BETWEEN 1 AND 9999) AND ("workspace_refund_notice_delivery_attempts"."provider_reference" IS NULL OR "workspace_refund_notice_delivery_attempts"."provider_reference" ~ '^[A-Za-z0-9_-]{1,100}$') AND ("workspace_refund_notice_delivery_attempts"."reason_code" IS NULL OR "workspace_refund_notice_delivery_attempts"."reason_code" ~ '^[a-z_]{1,80}$') AND (("workspace_refund_notice_delivery_attempts"."payload_hash" IS NULL AND "workspace_refund_notice_delivery_attempts"."recipient_hash" IS NULL AND "workspace_refund_notice_delivery_attempts"."provider_config_hash" IS NULL AND "workspace_refund_notice_delivery_attempts"."template_version" IS NULL) OR ("workspace_refund_notice_delivery_attempts"."payload_hash" ~ '^[a-f0-9]{64}$' AND "workspace_refund_notice_delivery_attempts"."recipient_hash" ~ '^[a-f0-9]{64}$' AND "workspace_refund_notice_delivery_attempts"."provider_config_hash" ~ '^[a-f0-9]{64}$' AND "workspace_refund_notice_delivery_attempts"."template_version"='workspace-refund-notice-v1')))
);
--> statement-breakpoint
ALTER TABLE "workspace_refund_notice_deliveries" ADD CONSTRAINT "workspace_refund_notice_deliveries_notice_id_workspace_refund_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."workspace_refund_notices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_refund_notice_delivery_attempts" ADD CONSTRAINT "workspace_refund_notice_delivery_attempts_delivery_id_workspace_refund_notice_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."workspace_refund_notice_deliveries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_refund_delivery_queue_idx" ON "workspace_refund_notice_deliveries" USING btree ("state","next_attempt_at","lease_until");--> statement-breakpoint
-- Preserve immutable refund facts; fence current delivery state against its guarded attempt ledger.
CREATE FUNCTION workspace_refund_delivery_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a workspace_refund_notice_delivery_attempts;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Refund delivery history cannot be deleted' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.state<>'pending' OR NEW.version<>1 OR NEW.attempt_count<>0 OR NEW.current_attempt_id IS NOT NULL OR NEW.lease_until IS NOT NULL OR NEW.next_attempt_at IS NOT NULL OR NEW.reason_code IS NOT NULL OR NEW.payload_hash IS NOT NULL OR NEW.recipient_hash IS NOT NULL OR NEW.provider_config_hash IS NOT NULL OR NEW.template_version IS NOT NULL OR NEW.accepted_at IS NOT NULL OR NEW.created_at IS DISTINCT FROM NEW.updated_at THEN
   RAISE EXCEPTION 'Notice delivery must begin pending' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
 END IF;
 IF OLD.state IN ('accepted','uncertain','blocked') OR NEW.version<>OLD.version+1 OR NEW.updated_at<OLD.updated_at OR NEW.updated_at>clock_timestamp()
  OR (to_jsonb(NEW)-ARRAY['state','current_attempt_id','lease_until','attempt_count','next_attempt_at','reason_code','payload_hash','recipient_hash','provider_config_hash','template_version','accepted_at','updated_at','version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','current_attempt_id','lease_until','attempt_count','next_attempt_at','reason_code','payload_hash','recipient_hash','provider_config_hash','template_version','accepted_at','updated_at','version'])
  OR (OLD.payload_hash IS NOT NULL AND (NEW.payload_hash IS DISTINCT FROM OLD.payload_hash OR NEW.recipient_hash IS DISTINCT FROM OLD.recipient_hash OR NEW.provider_config_hash IS DISTINCT FROM OLD.provider_config_hash OR NEW.template_version IS DISTINCT FROM OLD.template_version)) THEN
   RAISE EXCEPTION 'Notice identity, pinned payload and terminal history are immutable' USING ERRCODE='23514';
 END IF;
 IF NOT ((OLD.state IN ('pending','retryable_failure') AND NEW.state='claimed') OR (OLD.state='claimed' AND NEW.state IN ('submitted','retryable_failure','blocked')) OR (OLD.state='submitted' AND NEW.state IN ('accepted','retryable_failure','uncertain','blocked'))) THEN
  RAISE EXCEPTION 'Invalid notice delivery transition' USING ERRCODE='23514';
 END IF;
 SELECT * INTO a FROM workspace_refund_notice_delivery_attempts WHERE id=NEW.current_attempt_id AND delivery_id=NEW.id;
 IF a.id IS NULL OR a.state IS DISTINCT FROM NEW.state OR a.attempt_number<>NEW.attempt_count THEN RAISE EXCEPTION 'Delivery requires matching current attempt' USING ERRCODE='23514'; END IF;
 IF NEW.state='claimed' THEN
  IF NEW.attempt_count<>OLD.attempt_count+1 OR OLD.attempt_count>=5 OR NEW.current_attempt_id IS NOT DISTINCT FROM OLD.current_attempt_id OR NEW.lease_until<=clock_timestamp() OR NEW.lease_until>clock_timestamp()+interval '60 seconds' OR NEW.next_attempt_at IS NOT NULL THEN
   RAISE EXCEPTION 'Invalid bounded notice claim' USING ERRCODE='23514';
  END IF;
 ELSE
  IF NEW.current_attempt_id IS DISTINCT FROM OLD.current_attempt_id OR NEW.attempt_count<>OLD.attempt_count THEN RAISE EXCEPTION 'Stale notice claim' USING ERRCODE='23514'; END IF;
 END IF;
 IF NEW.state='submitted' AND (OLD.lease_until<=clock_timestamp() OR NEW.lease_until IS DISTINCT FROM OLD.lease_until OR NEW.payload_hash IS NULL OR NEW.recipient_hash IS NULL OR NEW.provider_config_hash IS NULL OR NEW.template_version IS NULL OR a.payload_hash IS DISTINCT FROM NEW.payload_hash OR a.recipient_hash IS DISTINCT FROM NEW.recipient_hash OR a.provider_config_hash IS DISTINCT FROM NEW.provider_config_hash OR a.template_version IS DISTINCT FROM NEW.template_version) THEN
  RAISE EXCEPTION 'Dispatch requires an unexpired pinned claim' USING ERRCODE='23514';
 END IF;
 IF NEW.state='accepted' AND (a.provider_code IS DISTINCT FROM 1000 OR a.reason_code IS DISTINCT FROM 'provider_accepted' OR a.dispatch_at IS NULL OR NEW.accepted_at IS DISTINCT FROM a.finished_at) THEN RAISE EXCEPTION 'Acceptance requires matching provider receipt' USING ERRCODE='23514'; END IF;
 IF NEW.state='retryable_failure' AND (NEW.next_attempt_at IS NULL OR NEW.next_attempt_at<=NEW.updated_at OR NEW.attempt_count>=5) THEN RAISE EXCEPTION 'Retry requires bounded scheduling' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION workspace_refund_delivery_attempt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d workspace_refund_notice_deliveries;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Notice attempts cannot be deleted' USING ERRCODE='23514'; END IF;
 SELECT * INTO d FROM workspace_refund_notice_deliveries WHERE id=NEW.delivery_id FOR UPDATE;
 IF d.id IS NULL THEN RAISE EXCEPTION 'Notice attempt requires delivery' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
  IF d.state NOT IN ('pending','retryable_failure') OR d.attempt_count>=5 OR NEW.attempt_number<>d.attempt_count+1 OR NEW.state<>'claimed' OR NEW.dispatch_at IS NOT NULL OR NEW.finished_at IS NOT NULL OR NEW.reason_code IS NOT NULL OR NEW.provider_code IS NOT NULL OR NEW.provider_reference IS NOT NULL OR NEW.payload_hash IS NOT NULL OR NEW.recipient_hash IS NOT NULL OR NEW.provider_config_hash IS NOT NULL OR NEW.template_version IS NOT NULL THEN
   RAISE EXCEPTION 'Notice attempt must begin claimed' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
 END IF;
 IF NEW.state IN ('accepted','retryable_failure','uncertain','blocked') AND (NEW.finished_at IS NULL OR NEW.finished_at<coalesce(OLD.dispatch_at,OLD.created_at) OR NEW.reason_code IS NULL) THEN RAISE EXCEPTION 'Terminal attempt requires dated evidence' USING ERRCODE='23514'; END IF;
 IF OLD.state IN ('accepted','retryable_failure','uncertain','blocked') OR d.current_attempt_id IS DISTINCT FROM OLD.id OR d.state IS DISTINCT FROM OLD.state
  OR (to_jsonb(NEW)-ARRAY['state','dispatch_at','finished_at','reason_code','provider_code','provider_reference','payload_hash','recipient_hash','provider_config_hash','template_version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','dispatch_at','finished_at','reason_code','provider_code','provider_reference','payload_hash','recipient_hash','provider_config_hash','template_version'])
  OR NOT ((OLD.state='claimed' AND NEW.state IN ('submitted','retryable_failure','blocked')) OR (OLD.state='submitted' AND NEW.state IN ('accepted','retryable_failure','uncertain','blocked'))) THEN
   RAISE EXCEPTION 'Notice attempt history or stale result cannot be rewritten' USING ERRCODE='23514';
 END IF;
 IF OLD.state='submitted' AND (NEW.dispatch_at IS DISTINCT FROM OLD.dispatch_at OR NEW.payload_hash IS DISTINCT FROM OLD.payload_hash OR NEW.recipient_hash IS DISTINCT FROM OLD.recipient_hash OR NEW.provider_config_hash IS DISTINCT FROM OLD.provider_config_hash OR NEW.template_version IS DISTINCT FROM OLD.template_version) THEN RAISE EXCEPTION 'Submitted notice payload is immutable' USING ERRCODE='23514'; END IF;
 IF NEW.state='submitted' AND (d.lease_until<=clock_timestamp() OR NEW.dispatch_at IS NULL OR NEW.payload_hash IS NULL OR NEW.recipient_hash IS NULL OR NEW.provider_config_hash IS NULL OR NEW.template_version IS NULL) THEN RAISE EXCEPTION 'Submission requires current lease and pinned payload' USING ERRCODE='23514'; END IF;
 IF NEW.state='accepted' AND (NEW.provider_code IS DISTINCT FROM 1000 OR NEW.reason_code IS DISTINCT FROM 'provider_accepted') THEN RAISE EXCEPTION 'Provider acceptance receipt required' USING ERRCODE='23514'; END IF;
 IF NEW.state='retryable_failure' AND NEW.reason_code NOT IN ('not_dispatched','lease_expired_before_dispatch','provider_throttled') THEN RAISE EXCEPTION 'Ambiguous sends cannot be blindly retried' USING ERRCODE='23514'; END IF;
 IF OLD.state='submitted' AND NEW.state='retryable_failure' AND NEW.reason_code='lease_expired_before_dispatch' THEN RAISE EXCEPTION 'Dispatched lease expiry is uncertain' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_refund_delivery_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_refund_notice_deliveries FOR EACH ROW EXECUTE FUNCTION workspace_refund_delivery_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_refund_delivery_attempt_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_refund_notice_delivery_attempts FOR EACH ROW EXECUTE FUNCTION workspace_refund_delivery_attempt_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_refund_delivery_truncate_guard BEFORE TRUNCATE ON workspace_refund_notice_deliveries FOR EACH STATEMENT EXECUTE FUNCTION workspace_refund_history_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_refund_delivery_attempt_truncate_guard BEFORE TRUNCATE ON workspace_refund_notice_delivery_attempts FOR EACH STATEMENT EXECUTE FUNCTION workspace_refund_history_guard();
