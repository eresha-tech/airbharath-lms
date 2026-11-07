CREATE TABLE "workspace_notification_receipts" (
	"user_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_notification_receipts_user_id_source_key_pk" PRIMARY KEY("user_id","source_key"),
	CONSTRAINT "workspace_notification_key" CHECK ("workspace_notification_receipts"."source_key" ~ '^[a-z_]+:[a-f0-9-]{36}(:[a-z_]+)?$')
);
--> statement-breakpoint
CREATE TABLE "workspace_operation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"request_key" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"command_hash" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_operation_command_unique" UNIQUE("actor_id","request_key"),
	CONSTRAINT "workspace_operation_values" CHECK ("workspace_operation_events"."action" IN ('create','report','reply','note','update','media_recheck') AND "workspace_operation_events"."command_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "workspace_support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"internal" boolean DEFAULT false NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_support_message_length" CHECK (length("workspace_support_messages"."body") BETWEEN 10 AND 4000)
);
--> statement-breakpoint
CREATE TABLE "workspace_support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"kind" text DEFAULT 'support' NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"reference_kind" text DEFAULT 'none' NOT NULL,
	"reference_id" uuid,
	"assignee_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "workspace_support_values" CHECK ("workspace_support_requests"."kind" IN ('support','course_report') AND "workspace_support_requests"."category" IN ('account','publishing','media','access','finance','moderation','technical') AND "workspace_support_requests"."status" IN ('open','waiting','action_needed','resolved','closed') AND "workspace_support_requests"."priority" IN ('normal','urgent') AND length("workspace_support_requests"."title") BETWEEN 5 AND 160 AND "workspace_support_requests"."version">0 AND "workspace_support_requests"."updated_at">="workspace_support_requests"."created_at" AND (("workspace_support_requests"."reference_kind"='none' AND "workspace_support_requests"."reference_id" IS NULL) OR ("workspace_support_requests"."reference_kind" IN ('course','order','payout','reported_course') AND "workspace_support_requests"."reference_id" IS NOT NULL)) AND (("workspace_support_requests"."status" IN ('resolved','closed'))=("workspace_support_requests"."resolved_at" IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "workspace_worker_health" (
	"key" text PRIMARY KEY NOT NULL,
	"token" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"succeeded_at" timestamp with time zone,
	"lease_until" timestamp with time zone,
	"outcome" text NOT NULL,
	"counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "workspace_worker_health_values" CHECK ("workspace_worker_health"."key" IN ('membership','course_payments','payouts','media','refund_notices') AND "workspace_worker_health"."outcome" IN ('running','success','attention','failed') AND (("workspace_worker_health"."outcome"='running')=("workspace_worker_health"."lease_until" IS NOT NULL)))
);
--> statement-breakpoint
ALTER TABLE "workspace_notification_receipts" ADD CONSTRAINT "workspace_notification_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_operation_events" ADD CONSTRAINT "workspace_operation_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_support_messages" ADD CONSTRAINT "workspace_support_messages_request_id_workspace_support_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."workspace_support_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_support_messages" ADD CONSTRAINT "workspace_support_messages_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_support_requests" ADD CONSTRAINT "workspace_support_requests_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_support_requests" ADD CONSTRAINT "workspace_support_requests_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_operation_history_idx" ON "workspace_operation_events" USING btree ("entity_id","created_at","id");--> statement-breakpoint
CREATE INDEX "workspace_support_message_idx" ON "workspace_support_messages" USING btree ("request_id","created_at","id");--> statement-breakpoint
CREATE INDEX "workspace_support_message_actor_idx" ON "workspace_support_messages" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "workspace_support_owner_idx" ON "workspace_support_requests" USING btree ("owner_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "workspace_support_queue_idx" ON "workspace_support_requests" USING btree ("status","priority","updated_at","id");--> statement-breakpoint
CREATE INDEX "workspace_support_created_idx" ON "workspace_support_requests" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "course_checks_operations_idx" ON "course_payment_checks" USING btree ("scope","issue","last_checked_at");--> statement-breakpoint
CREATE INDEX "course_inbox_operations_idx" ON "course_payment_inbox" USING btree ("scope","created_at") WHERE "course_payment_inbox"."state"<>'done' OR "course_payment_inbox"."error" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "creator_finance_owner_time_idx" ON "creator_finance_events" USING btree ("creator_id","created_at","id");--> statement-breakpoint
CREATE INDEX "creator_payout_status_time_idx" ON "creator_payout_observations" USING btree ("job_id","source","status","created_at","id");--> statement-breakpoint
CREATE INDEX "creator_payout_owner_time_idx" ON "creator_payouts" USING btree ("creator_id","scope","created_at","id");--> statement-breakpoint
CREATE INDEX "creator_payout_operations_idx" ON "creator_payouts" USING btree ("scope","state","updated_at");--> statement-breakpoint
CREATE INDEX "workspace_assets_operations_idx" ON "workspace_course_assets" USING btree ("status","updated_at","expires_at") WHERE "workspace_course_assets"."status" IN ('pending_upload','processing','failed');--> statement-breakpoint
CREATE INDEX "workspace_publication_moderation_idx" ON "workspace_publication_states" USING btree ("updated_at","project_id") WHERE "workspace_publication_states"."moderation"->>'restriction'<>'none';--> statement-breakpoint
-- Ownership, immutable conversations and replay evidence are guarded independently
-- of the HTTP handlers. Existing finance/publication histories are not rewritten.
CREATE FUNCTION workspace_operations_actor() RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE actor uuid;
BEGIN
 actor:=nullif(current_setting('airbharath.workspace_operations',true),'')::uuid;
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM users WHERE id=actor) THEN RAISE EXCEPTION 'persisted operations actor required'; END IF;
 RETURN actor;
END $$;
--> statement-breakpoint
CREATE FUNCTION workspace_support_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor uuid; admin boolean;
BEGIN
 IF TG_OP NOT IN ('INSERT','UPDATE') THEN RAISE EXCEPTION 'support history cannot be removed'; END IF;
 actor:=workspace_operations_actor(); SELECT role='admin' INTO admin FROM users WHERE id=actor;
 IF TG_OP='INSERT' THEN
  IF NEW.owner_id<>actor OR NEW.version<>1 OR NEW.status<>'open' OR NEW.priority<>'normal' OR NEW.assignee_id IS NOT NULL THEN RAISE EXCEPTION 'owned initial support request required'; END IF;
  IF NEW.kind='course_report' THEN
   IF NEW.category<>'moderation' OR NEW.reference_kind<>'reported_course' OR NOT EXISTS(SELECT 1 FROM courses WHERE id=NEW.reference_id AND workspace_project_id IS NOT NULL AND workspace_state='live' AND is_published) THEN RAISE EXCEPTION 'published Creator course required'; END IF;
  ELSIF NEW.reference_kind='reported_course' THEN RAISE EXCEPTION 'course report kind required';
  ELSIF NEW.reference_kind='course' AND NOT EXISTS(SELECT 1 FROM workspace_course_projects WHERE id=NEW.reference_id AND user_id=actor) THEN RAISE EXCEPTION 'owned course reference required';
  ELSIF NEW.reference_kind='order' AND NOT EXISTS(SELECT 1 FROM orders WHERE id=NEW.reference_id AND (creator_id=actor OR user_id=actor)) THEN RAISE EXCEPTION 'owned order reference required';
  ELSIF NEW.reference_kind='payout' AND NOT EXISTS(SELECT 1 FROM creator_payouts WHERE id=NEW.reference_id AND creator_id=actor) THEN RAISE EXCEPTION 'owned payout reference required'; END IF;
 ELSE
  IF (NEW.id,NEW.owner_id,NEW.kind,NEW.category,NEW.title,NEW.reference_kind,NEW.reference_id,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.owner_id,OLD.kind,OLD.category,OLD.title,OLD.reference_kind,OLD.reference_id,OLD.created_at) OR NEW.version<>OLD.version+1 OR NEW.updated_at<OLD.updated_at THEN RAISE EXCEPTION 'immutable identity and monotonic support version required'; END IF;
  IF NOT admin AND (actor<>NEW.owner_id OR NEW.status<>'waiting' OR OLD.status='closed' OR (NEW.priority,NEW.assignee_id) IS DISTINCT FROM (OLD.priority,OLD.assignee_id)) THEN RAISE EXCEPTION 'support staff decision required'; END IF;
  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id AND NEW.assignee_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.assignee_id AND role='admin') THEN RAISE EXCEPTION 'persisted Admin assignee required'; END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_support_identity BEFORE INSERT OR UPDATE OR DELETE ON workspace_support_requests FOR EACH ROW EXECUTE FUNCTION workspace_support_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_support_no_truncate BEFORE TRUNCATE ON workspace_support_requests FOR EACH STATEMENT EXECUTE FUNCTION workspace_support_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_operations_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor uuid; owner uuid; admin boolean;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'operations history is append only'; END IF;
 actor:=workspace_operations_actor(); SELECT role='admin' INTO admin FROM users WHERE id=actor;
 IF NEW.actor_id<>actor THEN RAISE EXCEPTION 'operations actor mismatch'; END IF;
 IF TG_TABLE_NAME='workspace_support_messages' THEN
  SELECT owner_id INTO owner FROM workspace_support_requests WHERE id=NEW.request_id;
  IF owner IS NULL OR (NOT admin AND (owner<>actor OR NEW.internal)) THEN RAISE EXCEPTION 'private conversation authority required'; END IF;
 ELSE
  IF NEW.action='media_recheck' THEN
   IF NOT admin THEN RAISE EXCEPTION 'persisted Admin required for recovery'; END IF;
  ELSE
   SELECT owner_id INTO owner FROM workspace_support_requests WHERE id=NEW.entity_id;
   IF owner IS NULL OR (NOT admin AND (owner<>actor OR NEW.action IN ('note','update'))) THEN RAISE EXCEPTION 'support audit authority required'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_support_message_history BEFORE INSERT OR UPDATE OR DELETE ON workspace_support_messages FOR EACH ROW EXECUTE FUNCTION workspace_operations_history_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_support_message_no_truncate BEFORE TRUNCATE ON workspace_support_messages FOR EACH STATEMENT EXECUTE FUNCTION workspace_operations_history_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_operations_history BEFORE INSERT OR UPDATE OR DELETE ON workspace_operation_events FOR EACH ROW EXECUTE FUNCTION workspace_operations_history_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_operations_no_truncate BEFORE TRUNCATE ON workspace_operation_events FOR EACH STATEMENT EXECUTE FUNCTION workspace_operations_history_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_support_audit_proof() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM workspace_operation_events WHERE entity_id=NEW.id AND result->>'id'=NEW.id::text AND (result->>'version')::int=NEW.version AND action<>'media_recheck') THEN RAISE EXCEPTION 'support action audit required'; END IF;
 IF TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM workspace_support_messages WHERE request_id=NEW.id AND actor_id=NEW.owner_id AND NOT internal) THEN RAISE EXCEPTION 'initial public description required'; END IF;
 IF NEW.status IN ('resolved','closed') AND (TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status) AND NOT EXISTS(SELECT 1 FROM workspace_support_messages m JOIN users u ON u.id=m.actor_id WHERE m.request_id=NEW.id AND NOT m.internal AND u.role='admin' AND m.created_at=NEW.updated_at) THEN RAISE EXCEPTION 'visible resolution record required'; END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workspace_support_audit AFTER INSERT OR UPDATE ON workspace_support_requests DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_support_audit_proof();
--> statement-breakpoint
CREATE FUNCTION workspace_notification_receipt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'read receipts are immutable'; END IF;
 IF NEW.user_id<>workspace_operations_actor() THEN RAISE EXCEPTION 'owned read receipt required'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_notification_receipt_owner BEFORE INSERT OR UPDATE OR DELETE ON workspace_notification_receipts FOR EACH ROW EXECUTE FUNCTION workspace_notification_receipt_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_notification_receipt_no_truncate BEFORE TRUNCATE ON workspace_notification_receipts FOR EACH STATEMENT EXECUTE FUNCTION workspace_notification_receipt_guard();

--> statement-breakpoint
-- Restore only the unchanged frozen course immediately after a recorded resolution.
CREATE OR REPLACE FUNCTION workspace_publication_state_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s workspace_publication_states; c courses; r workspace_publication_releases; p workspace_publication_prices; e workspace_publication_events;
BEGIN
 SELECT * INTO s FROM workspace_publication_states WHERE project_id=NEW.project_id;
 IF (TG_OP='INSERT' AND NEW.version<>1) OR (TG_OP='UPDATE' AND (NEW.version<>OLD.version+1 OR NEW.user_id<>OLD.user_id OR NEW.project_id<>OLD.project_id)) THEN RAISE EXCEPTION 'monotonic publication version required'; END IF;
 SELECT * INTO e FROM workspace_publication_events WHERE project_id=NEW.project_id AND (result->>'version')::integer=NEW.version;
 IF e.id IS NULL THEN RAISE EXCEPTION 'publication audit required'; END IF;
 IF e.action='restore' AND (TG_OP<>'UPDATE' OR OLD.status<>'unpublished' OR OLD.moderation->>'restriction' IS DISTINCT FROM 'none' OR NEW.moderation IS DISTINCT FROM OLD.moderation OR (NEW.current_revision_id,NEW.current_price_id,NEW.metadata,NEW.guidelines) IS DISTINCT FROM (OLD.current_revision_id,OLD.current_price_id,OLD.metadata,OLD.guidelines) OR NOT EXISTS(SELECT 1 FROM workspace_publication_events previous WHERE previous.project_id=NEW.project_id AND previous.action='resolve' AND (previous.result->>'version')::int=OLD.version)) THEN RAISE EXCEPTION 'restoration requires the unchanged resolved published version'; END IF;
 IF e.action IN ('flag','request_corrections','moderate_unpublish','suspend','resolve','restore') THEN
  IF e.actor_id=NEW.user_id OR length(btrim(e.note))<5 OR NOT EXISTS(SELECT 1 FROM users WHERE id=e.actor_id AND role='admin') OR e.result->'moderation' IS DISTINCT FROM NEW.moderation THEN RAISE EXCEPTION 'independent reasoned Admin moderation required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM workspace_publication_notices n WHERE n.event_id=e.id AND n.user_id=NEW.user_id AND n.project_id=NEW.project_id AND n.message=e.note) THEN RAISE EXCEPTION 'Creator moderation notice required'; END IF;
 ELSE
  IF e.actor_id<>NEW.user_id THEN RAISE EXCEPTION 'Creator control required'; END IF;
  IF TG_OP='UPDATE' AND NEW.moderation IS DISTINCT FROM OLD.moderation AND (e.action NOT IN ('appeal','submit_correction') OR (NEW.moderation-ARRAY['appeal','correction']) IS DISTINCT FROM (OLD.moderation-ARRAY['appeal','correction'])) THEN RAISE EXCEPTION 'Creator cannot lift moderation'; END IF;
  IF TG_OP='INSERT' AND NEW.moderation IS NOT NULL THEN RAISE EXCEPTION 'Admin moderation required'; END IF;
 END IF;
 IF (s.status='live' AND s.moderation->>'restriction' IN ('unpublished','suspended')) OR (e.action IN ('publish','restore') AND s.status<>'live') THEN RAISE EXCEPTION 'unresolved moderation restriction'; END IF;
 IF TG_OP='UPDATE' AND ((NEW.status='live' AND OLD.status<>'live' OR NEW.current_revision_id IS DISTINCT FROM OLD.current_revision_id) AND e.action NOT IN ('publish','restore') OR NEW.current_price_id IS DISTINCT FROM OLD.current_price_id AND e.action NOT IN ('publish','set_price')) THEN RAISE EXCEPTION 'explicit publication or price operation required'; END IF;
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
