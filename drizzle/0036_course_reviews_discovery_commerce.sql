CREATE TABLE "course_discovery_stats" (
	"course_id" uuid PRIMARY KEY NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"rating_sum" integer DEFAULT 0 NOT NULL,
	"distribution" jsonb DEFAULT '[0,0,0,0,0]'::jsonb NOT NULL,
	"learners" integer DEFAULT 0 NOT NULL,
	"engaged" integer DEFAULT 0 NOT NULL,
	"completed" integer DEFAULT 0 NOT NULL,
	"lessons" integer DEFAULT 0 NOT NULL,
	"modules" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_review_event_version" UNIQUE("review_id","version")
);
--> statement-breakpoint
CREATE TABLE "course_review_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_review_report_unique" UNIQUE("review_id","user_id"),
	CONSTRAINT "course_review_report_reason" CHECK (length("course_review_reports"."reason") BETWEEN 10 AND 1000)
);
--> statement-breakpoint
CREATE TABLE "course_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"content" text NOT NULL,
	"show_name" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_review_learner_unique" UNIQUE("course_id","user_id"),
	CONSTRAINT "course_review_valid" CHECK ("course_reviews"."rating" BETWEEN 1 AND 5 AND length("course_reviews"."content") BETWEEN 20 AND 3000 AND "course_reviews"."version">0 AND "course_reviews"."status" IN ('pending','published','hidden','deleted'))
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "category" text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "difficulty" text DEFAULT 'all_levels' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "purchase_evidence" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "creator_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "workspace_price_id" uuid;--> statement-breakpoint
ALTER TABLE "course_discovery_stats" ADD CONSTRAINT "course_discovery_stats_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_review_events" ADD CONSTRAINT "course_review_events_review_id_course_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."course_reviews"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_review_events" ADD CONSTRAINT "course_review_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_review_reports" ADD CONSTRAINT "course_review_reports_review_id_course_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."course_reviews"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_review_reports" ADD CONSTRAINT "course_review_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_review_actor_time_idx" ON "course_review_events" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "course_review_public_idx" ON "course_reviews" USING btree ("course_id","status","updated_at","id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_workspace_price_id_workspace_publication_prices_id_fk" FOREIGN KEY ("workspace_price_id") REFERENCES "public"."workspace_publication_prices"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
-- Eligibility is shared by HTTP, the database guard and review forms. Bundle
-- learners earn feedback on the actual course; free previews never count.
CREATE FUNCTION course_review_eligible(actor uuid, target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 WITH entitlement AS (
   SELECT e.enrolled_at FROM enrollments e WHERE e.user_id=actor AND e.status='active'
     AND (e.expires_at IS NULL OR e.expires_at>now())
     AND NOT EXISTS(SELECT 1 FROM orders refunded WHERE refunded.user_id=e.user_id AND refunded.course_id=e.course_id AND refunded.status IN ('refunded','chargeback') AND NOT EXISTS(SELECT 1 FROM orders paid WHERE paid.user_id=e.user_id AND paid.course_id=e.course_id AND paid.status='paid' AND paid.created_at>refunded.created_at))
     AND (e.course_id=target OR EXISTS(SELECT 1 FROM course_bundle_items b JOIN courses bc ON bc.id=b.bundle_course_id
         WHERE b.bundle_course_id=e.course_id AND b.course_id=target AND bc.workspace_state IS DISTINCT FROM 'suspended'))
 ), curriculum AS (
   SELECT l.id,((l.delivery_type<>'recorded' OR l.release_at IS NULL OR l.release_at<=now()) AND (l.delivery_type<>'live' OR l.scheduled_at IS NULL OR l.scheduled_at<=now())) available FROM lessons l JOIN modules m ON m.id=l.module_id
   WHERE m.course_id=target AND NOT m.workspace_retired AND NOT l.workspace_retired AND NOT l.is_free_preview
 ), facts AS (
   SELECT count(*) total, count(*) FILTER(WHERE curriculum.available AND EXISTS(SELECT 1 FROM progress p WHERE p.lesson_id=curriculum.id
     AND p.user_id=actor AND p.is_completed AND p.updated_at >= (SELECT min(enrolled_at) FROM entitlement))) completed FROM curriculum
 )
 SELECT EXISTS(SELECT 1 FROM users u JOIN courses c ON c.id=target CROSS JOIN facts f
   WHERE u.id=actor AND u.role='student' AND u.phone IS NOT NULL AND c.is_published
     AND c.workspace_state IS DISTINCT FROM 'suspended' AND (c.workspace_project_id IS NULL OR c.workspace_state='live')
     AND c.instructor_id IS DISTINCT FROM actor
     AND NOT EXISTS(SELECT 1 FROM workspace_course_projects pr WHERE pr.id=c.workspace_project_id AND pr.user_id=actor)
     AND EXISTS(SELECT 1 FROM entitlement WHERE enrolled_at <= now()-interval '24 hours')
     AND f.total>0 AND f.completed>=greatest(least(2,f.total),ceil(f.total*.2)))
$$;
--> statement-breakpoint
CREATE INDEX course_reviews_moderation_idx ON course_reviews(status,updated_at,id);
CREATE INDEX progress_learner_completed_idx ON progress(user_id,lesson_id) WHERE is_completed;
CREATE INDEX modules_discovery_course_idx ON modules(course_id) WHERE NOT workspace_retired;
CREATE INDEX lessons_discovery_module_idx ON lessons(module_id) WHERE NOT workspace_retired;
CREATE INDEX enrollments_discovery_course_idx ON enrollments(course_id,user_id);
CREATE INDEX courses_discovery_filters_idx ON courses(is_published,category,difficulty,created_at,id);
--> statement-breakpoint
CREATE FUNCTION course_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor uuid; actor_role text; owner uuid; review_action text;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'review_history_retained'; END IF;
 actor := nullif(current_setting('app.review_actor',true),'')::uuid;
 SELECT role INTO actor_role FROM users WHERE id=actor FOR UPDATE;
 IF actor IS NULL OR actor_role IS NULL THEN RAISE EXCEPTION 'review_actor_required'; END IF;
 SELECT instructor_id INTO owner FROM courses WHERE id=NEW.course_id;
 IF TG_OP='INSERT' THEN
   IF NEW.user_id<>actor OR NEW.status<>'pending' OR NEW.version<>1 OR NOT course_review_eligible(actor,NEW.course_id) THEN RAISE EXCEPTION 'review_ineligible'; END IF;
   review_action:='submitted';
 ELSE
   IF NEW.id<>OLD.id OR NEW.user_id<>OLD.user_id OR NEW.course_id<>OLD.course_id OR NEW.created_at<>OLD.created_at OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'review_conflict'; END IF;
   IF actor=OLD.user_id THEN
     IF NEW.status='deleted' AND OLD.status<>'deleted' AND NEW.rating=OLD.rating AND NEW.content=OLD.content AND NEW.show_name=OLD.show_name THEN review_action:='deleted';
     ELSIF NEW.status='pending' AND OLD.status IN ('pending','published','deleted') AND course_review_eligible(actor,NEW.course_id) THEN review_action:='edited';
     ELSE RAISE EXCEPTION 'review_transition_forbidden'; END IF;
   ELSIF actor_role='admin' AND owner IS DISTINCT FROM actor AND NEW.status IN ('published','hidden') AND OLD.status<>'deleted'
     AND NEW.rating=OLD.rating AND NEW.content=OLD.content AND NEW.show_name=OLD.show_name AND length(btrim(coalesce(current_setting('app.review_reason',true),''))) BETWEEN 10 AND 1000 THEN review_action:=NEW.status;
   ELSE RAISE EXCEPTION 'review_moderation_forbidden'; END IF;
 END IF;
 IF review_action IN ('submitted','edited') THEN
   IF EXISTS(SELECT 1 FROM course_review_events WHERE actor_id=actor AND action IN ('submitted','edited') AND created_at>now()-interval '60 seconds')
     OR (SELECT count(*) FROM course_review_events WHERE actor_id=actor AND action IN ('submitted','edited') AND created_at>now()-interval '1 day')>=5 THEN RAISE EXCEPTION 'review_rate_limit'; END IF;
 END IF;
 IF NEW.content ~* '(https?://|www\.)' THEN RAISE EXCEPTION 'review_links_disallowed'; END IF;
 NEW.updated_at:=clock_timestamp();
 INSERT INTO course_review_events(review_id,actor_id,action,reason,version,snapshot) VALUES(NEW.id,actor,review_action,coalesce(current_setting('app.review_reason',true),''),NEW.version,jsonb_build_object('rating',NEW.rating,'content',NEW.content,'showName',NEW.show_name,'status',NEW.status));
 RETURN NEW;
END $$;
--> statement-breakpoint
-- The FK must wait until the review row is inserted by its BEFORE guard.
ALTER TABLE course_review_events DROP CONSTRAINT course_review_events_review_id_course_reviews_id_fk;
ALTER TABLE course_review_events ADD CONSTRAINT course_review_events_review_id_course_reviews_id_fk FOREIGN KEY(review_id) REFERENCES course_reviews(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
CREATE TRIGGER course_review_guard BEFORE INSERT OR UPDATE OR DELETE ON course_reviews FOR EACH ROW EXECUTE FUNCTION course_review_guard();
--> statement-breakpoint
CREATE FUNCTION course_review_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'review_history_retained'; END $$;
CREATE TRIGGER course_review_event_retained BEFORE UPDATE OR DELETE OR TRUNCATE ON course_review_events FOR EACH STATEMENT EXECUTE FUNCTION course_review_history_guard();
CREATE TRIGGER course_reviews_no_truncate BEFORE TRUNCATE ON course_reviews FOR EACH STATEMENT EXECUTE FUNCTION course_review_history_guard();
CREATE TRIGGER course_review_reports_retained BEFORE UPDATE OR DELETE OR TRUNCATE ON course_review_reports FOR EACH STATEMENT EXECUTE FUNCTION course_review_history_guard();
--> statement-breakpoint
CREATE FUNCTION refresh_course_discovery(target uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE c courses; lesson_count integer; module_count integer; learner_count integer; engaged_count integer; completed_count integer; review_count integer; rating_sum integer; stars jsonb; pub timestamp with time zone;
BEGIN
 -- Serialize summary writers without coupling to publication's course lock order.
 PERFORM pg_advisory_xact_lock(hashtextextended(target::text,21));
 SELECT * INTO c FROM courses WHERE id=target; IF NOT FOUND THEN RETURN; END IF;
 SELECT count(DISTINCT m.id),count(l.id) INTO module_count,lesson_count FROM modules m LEFT JOIN lessons l ON l.module_id=m.id AND NOT l.workspace_retired WHERE m.course_id=target AND NOT m.workspace_retired;
 WITH entitled AS (
   SELECT DISTINCT e.user_id FROM enrollments e JOIN users u ON u.id=e.user_id
   WHERE (e.course_id=target OR EXISTS(SELECT 1 FROM course_bundle_items b WHERE b.bundle_course_id=e.course_id AND b.course_id=target))
   AND e.status IN ('active','expired') AND u.role='student' AND u.phone IS NOT NULL AND u.id IS DISTINCT FROM c.instructor_id
 ), completion AS (
   SELECT e.user_id,count(DISTINCT p.lesson_id) n FROM entitled e LEFT JOIN progress p ON p.user_id=e.user_id AND p.is_completed
   AND EXISTS(SELECT 1 FROM lessons l JOIN modules m ON m.id=l.module_id WHERE l.id=p.lesson_id AND m.course_id=target AND NOT l.workspace_retired AND NOT m.workspace_retired)
   GROUP BY e.user_id
 ) SELECT count(*),count(*) FILTER(WHERE n>0),count(*) FILTER(WHERE lesson_count>0 AND n>=lesson_count) INTO learner_count,engaged_count,completed_count FROM completion;
 SELECT count(*),coalesce(sum(rating),0),jsonb_build_array(count(*) FILTER(WHERE rating=1),count(*) FILTER(WHERE rating=2),count(*) FILTER(WHERE rating=3),count(*) FILTER(WHERE rating=4),count(*) FILTER(WHERE rating=5)) INTO review_count,rating_sum,stars FROM course_reviews WHERE course_id=target AND status='published';
 SELECT min(created_at) INTO pub FROM workspace_publication_releases WHERE course_id=target;
 INSERT INTO course_discovery_stats(course_id,review_count,rating_sum,distribution,learners,engaged,completed,lessons,modules,published_at,updated_at)
 VALUES(target,review_count,rating_sum,stars,learner_count,engaged_count,completed_count,lesson_count,module_count,coalesce(pub,c.created_at),now())
 ON CONFLICT(course_id) DO UPDATE SET review_count=EXCLUDED.review_count,rating_sum=EXCLUDED.rating_sum,distribution=EXCLUDED.distribution,learners=EXCLUDED.learners,engaged=EXCLUDED.engaged,completed=EXCLUDED.completed,lessons=EXCLUDED.lessons,modules=EXCLUDED.modules,published_at=EXCLUDED.published_at,updated_at=EXCLUDED.updated_at;
END $$;
--> statement-breakpoint
CREATE FUNCTION course_discovery_changed() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; prior uuid; rec record;
BEGIN
 IF TG_TABLE_NAME='courses' THEN target:=NEW.id;
 ELSIF TG_TABLE_NAME IN ('course_reviews','enrollments','modules') THEN
   IF TG_OP<>'DELETE' THEN target:=NEW.course_id; END IF; IF TG_OP<>'INSERT' THEN prior:=OLD.course_id; END IF;
 ELSIF TG_TABLE_NAME='lessons' THEN
   IF TG_OP<>'DELETE' THEN SELECT course_id INTO target FROM modules WHERE id=NEW.module_id; END IF;
   IF TG_OP<>'INSERT' THEN SELECT course_id INTO prior FROM modules WHERE id=OLD.module_id; END IF;
 ELSIF TG_TABLE_NAME='progress' THEN
   IF TG_OP<>'DELETE' THEN SELECT m.course_id INTO target FROM lessons l JOIN modules m ON m.id=l.module_id WHERE l.id=NEW.lesson_id; END IF;
   IF TG_OP<>'INSERT' THEN SELECT m.course_id INTO prior FROM lessons l JOIN modules m ON m.id=l.module_id WHERE l.id=OLD.lesson_id; END IF;
 ELSIF TG_TABLE_NAME='course_bundle_items' THEN
   IF TG_OP<>'DELETE' THEN target:=NEW.course_id; END IF; IF TG_OP<>'INSERT' THEN prior:=OLD.course_id; END IF;
 ELSIF TG_TABLE_NAME='workspace_publication_releases' THEN target:=NEW.course_id;
 ELSIF TG_TABLE_NAME='users' THEN
   FOR rec IN SELECT DISTINCT e.course_id FROM enrollments e WHERE e.user_id=NEW.id LOOP PERFORM refresh_course_discovery(rec.course_id); END LOOP; RETURN NEW;
 END IF;
 IF prior IS NOT NULL THEN PERFORM refresh_course_discovery(prior); END IF;
 IF target IS NOT NULL AND target IS DISTINCT FROM prior THEN PERFORM refresh_course_discovery(target); END IF;
 -- A bundle enrollment affects its child courses too.
 IF TG_TABLE_NAME='enrollments' THEN
   FOR rec IN SELECT DISTINCT course_id FROM course_bundle_items WHERE bundle_course_id IN (target,prior) LOOP PERFORM refresh_course_discovery(rec.course_id); END LOOP;
 END IF;
 RETURN coalesce(NEW,OLD);
END $$;
--> statement-breakpoint
CREATE TRIGGER course_discovery_course AFTER INSERT OR UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION course_discovery_changed();
CREATE TRIGGER course_discovery_review AFTER INSERT OR UPDATE ON course_reviews FOR EACH ROW EXECUTE FUNCTION course_discovery_changed();
CREATE TRIGGER course_discovery_enrollment AFTER INSERT OR UPDATE OR DELETE ON enrollments FOR EACH ROW EXECUTE FUNCTION course_discovery_changed();
CREATE TRIGGER course_discovery_module AFTER INSERT OR UPDATE OR DELETE ON modules FOR EACH ROW EXECUTE FUNCTION course_discovery_changed();
CREATE TRIGGER course_discovery_lesson AFTER INSERT OR UPDATE OR DELETE ON lessons FOR EACH ROW EXECUTE FUNCTION course_discovery_changed();
CREATE TRIGGER course_discovery_progress AFTER INSERT OR UPDATE OR DELETE ON progress FOR EACH ROW EXECUTE FUNCTION course_discovery_changed();
CREATE TRIGGER course_discovery_bundle AFTER INSERT OR UPDATE OR DELETE ON course_bundle_items FOR EACH ROW EXECUTE FUNCTION course_discovery_changed();
CREATE TRIGGER course_discovery_release AFTER INSERT ON workspace_publication_releases FOR EACH ROW EXECUTE FUNCTION course_discovery_changed();
CREATE TRIGGER course_discovery_user AFTER UPDATE OF role,phone ON users FOR EACH ROW EXECUTE FUNCTION course_discovery_changed();
SELECT refresh_course_discovery(id) FROM courses ORDER BY id;
--> statement-breakpoint
CREATE FUNCTION course_purchase_evidence_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.purchase_evidence IS NOT NULL AND (NEW.purchase_evidence IS DISTINCT FROM OLD.purchase_evidence OR NEW.creator_id IS DISTINCT FROM OLD.creator_id OR NEW.workspace_price_id IS DISTINCT FROM OLD.workspace_price_id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.course_id IS DISTINCT FROM OLD.course_id OR NEW.amount IS DISTINCT FROM OLD.amount OR NEW.razorpay_order_id IS DISTINCT FROM OLD.razorpay_order_id) THEN RAISE EXCEPTION 'purchase_evidence_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER course_purchase_evidence_guard BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION course_purchase_evidence_guard();
--> statement-breakpoint
CREATE FUNCTION course_sale_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c courses; p workspace_publication_prices; st workspace_publication_states; e jsonb;
BEGIN
 SELECT * INTO c FROM courses WHERE id=NEW.course_id;
 IF c.workspace_project_id IS NOT NULL OR NEW.purchase_evidence IS NOT NULL THEN
  e:=NEW.purchase_evidence;
  IF NOT coalesce(jsonb_typeof(e)='object' AND jsonb_typeof(e->'version')='number' AND jsonb_typeof(e->'totalPaise')='number' AND jsonb_typeof(e->'listPaise')='number' AND jsonb_typeof(e->'discountPaise')='number' AND jsonb_typeof(e->'taxablePaise')='number' AND jsonb_typeof(e->'taxPaise')='number',false) THEN RAISE EXCEPTION 'invalid_purchase_evidence'; END IF;
  IF c.id IS NULL OR e IS NULL OR NOT (e ?& ARRAY['version','currency','totalPaise','listPaise','discountPaise','taxablePaise','taxPaise','taxRate','taxInclusive','courseTitle','accessDays','creatorId','projectId','priceId']) OR e->>'taxRate' IS DISTINCT FROM '18' OR e->>'taxInclusive' IS DISTINCT FROM 'true' OR (e->>'taxablePaise')::int<>round((e->>'totalPaise')::numeric/1.18) OR (e->>'totalPaise')::int<=0 OR NOT c.is_published OR c.workspace_state='suspended' OR (e->>'version')::int<>1 OR e->>'currency'<>'INR' OR (e->>'totalPaise')::int<>round(NEW.amount*100) OR (e->>'listPaise')::int<>round(c.price*100) OR (e->>'discountPaise')::int<0 OR (e->>'discountPaise')::int+(e->>'totalPaise')::int<>(e->>'listPaise')::int OR (e->>'taxablePaise')::int+(e->>'taxPaise')::int<>(e->>'totalPaise')::int THEN RAISE EXCEPTION 'invalid_purchase_evidence'; END IF;
  IF c.workspace_project_id IS NOT NULL THEN
   SELECT * INTO st FROM workspace_publication_states WHERE project_id=c.workspace_project_id;
   SELECT * INTO p FROM workspace_publication_prices WHERE id=NEW.workspace_price_id;
   IF p.id IS NULL OR p.status<>'approved' OR p.decided_by IS NULL OR p.decided_by=p.user_id OR st.project_id IS NULL OR st.status<>'live' OR st.course_id IS DISTINCT FROM c.id OR st.current_price_id IS DISTINCT FROM p.id OR p.project_id<>c.workspace_project_id OR p.user_id<>c.instructor_id OR p.amount_paise<>round(c.price*100) OR NEW.creator_id IS DISTINCT FROM c.instructor_id OR e->>'creatorId' IS DISTINCT FROM c.instructor_id::text OR e->>'priceId' IS DISTINCT FROM p.id::text OR e->>'projectId' IS DISTINCT FROM c.workspace_project_id::text THEN RAISE EXCEPTION 'approved_creator_price_required'; END IF;
  ELSIF NEW.creator_id IS NOT NULL OR NEW.workspace_price_id IS NOT NULL THEN RAISE EXCEPTION 'invalid_creator_attribution'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER course_sale_insert_guard BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION course_sale_insert_guard();
--> statement-breakpoint
CREATE FUNCTION course_payment_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='paid' AND NEW.razorpay_payment_id IS NOT NULL AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.razorpay_payment_id,22));
  IF EXISTS(SELECT 1 FROM orders WHERE razorpay_payment_id=NEW.razorpay_payment_id AND id<>NEW.id) THEN RAISE EXCEPTION 'payment_already_assigned'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER course_payment_identity_guard BEFORE INSERT OR UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION course_payment_identity_guard();
--> statement-breakpoint
CREATE INDEX courses_discovery_search_idx ON courses USING gin(to_tsvector('simple',coalesce(title,'')||' '||coalesce(short_description,'')||' '||coalesce(description,'')||' '||category));
ALTER TABLE courses ADD CONSTRAINT courses_discovery_labels_check CHECK(category ~ '^[a-z0-9][a-z0-9_ -]{0,79}$' AND difficulty IN ('all_levels','beginner','intermediate','advanced'));

--> statement-breakpoint
CREATE INDEX course_authors_discovery_course_idx ON course_authors(course_id,order_index,id);
