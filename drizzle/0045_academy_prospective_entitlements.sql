CREATE TABLE "academy_entitlement_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"provider_id" text NOT NULL,
	"status" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"evidence_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_event_identity" UNIQUE("source_id","kind","provider_id","status"),
	CONSTRAINT "academy_event_values" CHECK ("academy_entitlement_events"."amount_paise">0 AND "academy_entitlement_events"."evidence_hash" ~ '^[a-f0-9]{64}$' AND (("academy_entitlement_events"."kind"='refund_processed' AND "academy_entitlement_events"."status"='processed') OR ("academy_entitlement_events"."kind"='full_refund' AND "academy_entitlement_events"."status"='processed') OR ("academy_entitlement_events"."kind"='dispute' AND "academy_entitlement_events"."status" IN ('open','under_review','action_required','won','lost','closed'))))
);
--> statement-breakpoint
CREATE TABLE "academy_entitlement_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"order_id" uuid,
	"scope" text,
	"provider_payment_id" text,
	"amount_paise" integer DEFAULT 0 NOT NULL,
	"policy" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"owns_enrollment" boolean DEFAULT false NOT NULL,
	"actor_id" uuid,
	"request_key" uuid,
	"command_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_entitlement_sources_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "academy_entitlement_sources_request_key_unique" UNIQUE("request_key"),
	CONSTRAINT "academy_source_values" CHECK ("academy_entitlement_sources"."kind" IN ('purchase','admin_grant') AND "academy_entitlement_sources"."policy" IN ('academy-prospective-refund-v1','legacy-capture-exempt-v1') AND ("academy_entitlement_sources"."ends_at" IS NULL OR "academy_entitlement_sources"."ends_at">"academy_entitlement_sources"."starts_at") AND (("academy_entitlement_sources"."kind"='purchase' AND "academy_entitlement_sources"."order_id" IS NOT NULL AND "academy_entitlement_sources"."scope" IS NOT NULL AND "academy_entitlement_sources"."provider_payment_id" IS NOT NULL AND "academy_entitlement_sources"."amount_paise">0 AND "academy_entitlement_sources"."actor_id" IS NULL AND "academy_entitlement_sources"."request_key" IS NULL AND "academy_entitlement_sources"."command_hash" IS NULL) OR ("academy_entitlement_sources"."kind"='admin_grant' AND "academy_entitlement_sources"."policy"='academy-prospective-refund-v1' AND "academy_entitlement_sources"."order_id" IS NULL AND "academy_entitlement_sources"."scope" IS NULL AND "academy_entitlement_sources"."provider_payment_id" IS NULL AND "academy_entitlement_sources"."amount_paise"=0 AND "academy_entitlement_sources"."actor_id" IS NOT NULL AND "academy_entitlement_sources"."request_key" IS NOT NULL AND "academy_entitlement_sources"."command_hash" ~ '^[a-f0-9]{64}$')))
);
--> statement-breakpoint
ALTER TABLE "course_payment_checks" ADD COLUMN "refund_scan_skip" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "academy_entitlement_events" ADD CONSTRAINT "academy_entitlement_events_source_id_academy_entitlement_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."academy_entitlement_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_entitlement_sources" ADD CONSTRAINT "academy_entitlement_sources_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_entitlement_sources" ADD CONSTRAINT "academy_entitlement_sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_entitlement_sources" ADD CONSTRAINT "academy_entitlement_sources_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_entitlement_sources" ADD CONSTRAINT "academy_entitlement_sources_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_entitlement_sources" ADD CONSTRAINT "academy_entitlement_sources_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "academy_event_source_observed" ON "academy_entitlement_events" USING btree ("source_id","observed_at");--> statement-breakpoint
CREATE INDEX "academy_source_owner_course" ON "academy_entitlement_sources" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE INDEX "academy_source_enrollment" ON "academy_entitlement_sources" USING btree ("enrollment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "academy_source_one_aggregate_owner" ON "academy_entitlement_sources" USING btree ("enrollment_id") WHERE "academy_entitlement_sources"."owns_enrollment";
--> statement-breakpoint
ALTER TABLE course_payment_checks ADD CONSTRAINT academy_refund_cursor_bounds CHECK(refund_scan_skip BETWEEN 0 AND 1000000);
--> statement-breakpoint
CREATE FUNCTION academy_source_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e record; o orders; c courses; p course_payment_checks;
BEGIN
 SELECT x.*,x.xmin::text::bigint AS creation_xid INTO e FROM enrollments x WHERE x.id=NEW.enrollment_id FOR UPDATE;
 SELECT * INTO c FROM courses WHERE id=NEW.course_id;
 IF e.id IS NULL OR e.user_id<>NEW.user_id OR e.course_id<>NEW.course_id OR c.workspace_project_id IS NOT NULL THEN RAISE EXCEPTION 'academy_source_owner_required'; END IF;
 IF NEW.owns_enrollment AND e.creation_xid<>txid_current() THEN RAISE EXCEPTION 'historical_enrollment_cannot_be_claimed'; END IF;
 IF NEW.kind='purchase' THEN
  SELECT * INTO o FROM orders WHERE id=NEW.order_id;
  SELECT * INTO p FROM course_payment_checks WHERE order_id=NEW.order_id;
  IF NOT coalesce(o.id IS NOT NULL AND o.user_id=NEW.user_id AND o.course_id=NEW.course_id AND o.creator_id IS NULL AND o.purchase_evidence->>'projectId' IS NULL AND ((NEW.policy='academy-prospective-refund-v1' AND o.purchase_evidence->'academyEntitlementPolicy'->>'version'='academy-prospective-refund-v1' AND o.created_at >= (o.purchase_evidence->'academyEntitlementPolicy'->>'effectiveAt')::timestamptz) OR (NEW.policy='legacy-capture-exempt-v1' AND o.purchase_evidence->'academyEntitlementPolicy' IS NULL AND NOT NEW.owns_enrollment AND EXISTS(SELECT 1 FROM academy_entitlement_sources WHERE enrollment_id=NEW.enrollment_id AND owns_enrollment))) AND o.status IN ('paid','refunded','chargeback') AND o.razorpay_payment_id=NEW.provider_payment_id AND round(o.amount*100)=NEW.amount_paise AND p.scope=NEW.scope AND p.payment_id=NEW.provider_payment_id,false) THEN RAISE EXCEPTION 'verified_prospective_purchase_required'; END IF;
  IF NEW.starts_at<o.created_at THEN RAISE EXCEPTION 'purchase_start_precedes_order'; END IF;
  IF coalesce(CASE WHEN o.purchase_evidence IS NULL THEN c.access_days ELSE (o.purchase_evidence->>'accessDays')::int END,0)=0 THEN
   IF NEW.ends_at IS NOT NULL THEN RAISE EXCEPTION 'purchase_term_mismatch'; END IF;
  ELSIF NEW.ends_at IS DISTINCT FROM NEW.starts_at + (CASE WHEN o.purchase_evidence IS NULL THEN c.access_days ELSE (o.purchase_evidence->>'accessDays')::int END) * interval '1 day' THEN RAISE EXCEPTION 'purchase_term_mismatch'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.actor_id AND role='admin' FOR SHARE) THEN RAISE EXCEPTION 'persisted_grant_admin_required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER academy_source_insert BEFORE INSERT ON academy_entitlement_sources FOR EACH ROW EXECUTE FUNCTION academy_source_guard();
CREATE TRIGGER academy_source_immutable BEFORE UPDATE OR DELETE ON academy_entitlement_sources FOR EACH ROW EXECUTE FUNCTION creator_money_immutable();
CREATE TRIGGER academy_source_no_truncate BEFORE TRUNCATE ON academy_entitlement_sources FOR EACH STATEMENT EXECUTE FUNCTION creator_money_immutable();
--> statement-breakpoint
CREATE FUNCTION academy_event_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s academy_entitlement_sources; refunded bigint;
BEGIN
 SELECT * INTO s FROM academy_entitlement_sources WHERE id=NEW.source_id FOR UPDATE;
 IF s.id IS NULL OR s.kind<>'purchase' OR s.policy<>'academy-prospective-refund-v1' OR NEW.amount_paise>s.amount_paise THEN RAISE EXCEPTION 'purchase_event_identity_required'; END IF;
 IF NEW.kind='refund_processed' THEN
  IF NEW.provider_id !~ '^rfnd_[A-Za-z0-9_]{6,100}$' THEN RAISE EXCEPTION 'refund_identity_required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM academy_entitlement_events WHERE source_id=s.id AND kind=NEW.kind AND provider_id=NEW.provider_id AND status=NEW.status) THEN
   SELECT coalesce(sum(amount_paise),0) INTO refunded FROM academy_entitlement_events WHERE source_id=s.id AND kind='refund_processed';
   IF refunded+NEW.amount_paise>s.amount_paise THEN RAISE EXCEPTION 'refund_total_exceeds_purchase'; END IF;
  END IF;
 ELSIF NEW.kind='full_refund' THEN
  SELECT coalesce(sum(amount_paise),0) INTO refunded FROM academy_entitlement_events WHERE source_id=s.id AND kind='refund_processed';
  IF NEW.provider_id<>s.provider_payment_id OR NEW.amount_paise<>s.amount_paise OR refunded<>s.amount_paise THEN RAISE EXCEPTION 'successful_cumulative_full_refund_required'; END IF;
 ELSIF NEW.provider_id !~ '^disp_[A-Za-z0-9_]{6,100}$' THEN RAISE EXCEPTION 'dispute_identity_required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER academy_event_insert BEFORE INSERT ON academy_entitlement_events FOR EACH ROW EXECUTE FUNCTION academy_event_guard();
CREATE TRIGGER academy_event_immutable BEFORE UPDATE OR DELETE ON academy_entitlement_events FOR EACH ROW EXECUTE FUNCTION creator_money_immutable();
CREATE TRIGGER academy_event_no_truncate BEFORE TRUNCATE ON academy_entitlement_events FOR EACH STATEMENT EXECUTE FUNCTION creator_money_immutable();
--> statement-breakpoint
CREATE FUNCTION academy_purchase_source_proof() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.purchase_evidence->'academyEntitlementPolicy'->>'version'='academy-prospective-refund-v1' AND NEW.status IN ('paid','refunded','chargeback') AND NEW.razorpay_payment_id IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM academy_entitlement_sources WHERE order_id=NEW.id AND provider_payment_id=NEW.razorpay_payment_id) THEN RAISE EXCEPTION 'atomic_purchase_access_source_required'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER academy_purchase_source_proof AFTER INSERT OR UPDATE ON orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION academy_purchase_source_proof();
