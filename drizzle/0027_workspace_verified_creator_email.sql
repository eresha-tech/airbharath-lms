CREATE TABLE "workspace_email_challenges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"state" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "workspace_email_challenge_check" CHECK ("workspace_email_challenges"."email"=lower(btrim("workspace_email_challenges"."email")) AND length("workspace_email_challenges"."email") BETWEEN 3 AND 254 AND "workspace_email_challenges"."email" !~ '[[:space:]]' AND "workspace_email_challenges"."code_hash" ~ '^[a-f0-9]{64}$' AND "workspace_email_challenges"."attempts" BETWEEN 0 AND 5 AND "workspace_email_challenges"."expires_at"="workspace_email_challenges"."created_at"+interval '10 minutes' AND "workspace_email_challenges"."state" IN ('sending','accepted','uncertain','failed','superseded','expired','exhausted','consumed') AND ("workspace_email_challenges"."state"<>'consumed' OR ("workspace_email_challenges"."consumed_at" IS NOT NULL AND "workspace_email_challenges"."consumed_at" BETWEEN "workspace_email_challenges"."created_at" AND "workspace_email_challenges"."expires_at" AND "workspace_email_challenges"."accepted_at" IS NOT NULL AND "workspace_email_challenges"."attempts"<5)) AND ("workspace_email_challenges"."state"='consumed' OR "workspace_email_challenges"."consumed_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "workspace_email_notice_bindings" (
	"notice_id" uuid PRIMARY KEY NOT NULL,
	"verification_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_email_rate_limits" (
	"key" text NOT NULL,
	"window_at" timestamp with time zone NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "workspace_email_rate_limits_key_window_at_pk" PRIMARY KEY("key","window_at"),
	CONSTRAINT "workspace_email_rate_check" CHECK ("workspace_email_rate_limits"."key" ~ '^[a-f0-9]{64}$' AND "workspace_email_rate_limits"."count">0)
);
--> statement-breakpoint
CREATE TABLE "workspace_verified_emails" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"challenge_id" uuid NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "workspace_verified_email_challenge_unique" UNIQUE("challenge_id"),
	CONSTRAINT "workspace_verified_email_check" CHECK ("workspace_verified_emails"."email"=lower(btrim("workspace_verified_emails"."email")) AND length("workspace_verified_emails"."email") BETWEEN 3 AND 254 AND (("workspace_verified_emails"."active" AND "workspace_verified_emails"."revoked_at" IS NULL) OR (NOT "workspace_verified_emails"."active" AND "workspace_verified_emails"."revoked_at" IS NOT NULL AND "workspace_verified_emails"."revoked_at">="workspace_verified_emails"."verified_at")))
);
--> statement-breakpoint
ALTER TABLE "workspace_email_challenges" ADD CONSTRAINT "workspace_email_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_email_notice_bindings" ADD CONSTRAINT "workspace_email_notice_bindings_notice_id_workspace_refund_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."workspace_refund_notices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_email_notice_bindings" ADD CONSTRAINT "workspace_email_notice_bindings_verification_id_workspace_verified_emails_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."workspace_verified_emails"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_verified_emails" ADD CONSTRAINT "workspace_verified_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_verified_emails" ADD CONSTRAINT "workspace_verified_emails_challenge_id_workspace_email_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."workspace_email_challenges"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_email_challenge_user_created_idx" ON "workspace_email_challenges" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_email_one_open_idx" ON "workspace_email_challenges" USING btree ("user_id") WHERE "workspace_email_challenges"."state" IN ('sending','accepted','uncertain');--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_verified_email_user_idx" ON "workspace_verified_emails" USING btree ("user_id") WHERE "workspace_verified_emails"."active";--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_verified_email_address_idx" ON "workspace_verified_emails" USING btree ("email") WHERE "workspace_verified_emails"."active";--> statement-breakpoint
-- New evidence only. No historical contact verification or notice/order backfill.
CREATE FUNCTION workspace_email_challenge_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Email challenge history is retained' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','attempts','accepted_at','consumed_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','attempts','accepted_at','consumed_at'])
 OR NEW.attempts<OLD.attempts OR NEW.attempts>OLD.attempts+1
 OR (OLD.accepted_at IS NOT NULL AND NEW.accepted_at IS DISTINCT FROM OLD.accepted_at)
 OR (OLD.state<>NEW.state AND NOT ((OLD.state='sending' AND NEW.state IN ('accepted','failed','uncertain','superseded')) OR (OLD.state='accepted' AND NEW.state IN ('superseded','expired','exhausted','consumed')) OR (OLD.state='uncertain' AND NEW.state='superseded')))
 OR (OLD.state IN ('consumed','exhausted','expired','failed','superseded') AND NEW IS DISTINCT FROM OLD) THEN
 RAISE EXCEPTION 'Invalid email challenge transition' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_email_challenge_guard BEFORE UPDATE OR DELETE ON workspace_email_challenges FOR EACH ROW EXECUTE FUNCTION workspace_email_challenge_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_email_proof_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c workspace_email_challenges; contact text;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Email ownership history is retained' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-ARRAY['active','revoked_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['active','revoked_at']) OR NOT OLD.active OR NEW.active OR NEW.revoked_at IS NULL THEN
   RAISE EXCEPTION 'Only email proof revocation is allowed' USING ERRCODE='23514'; END IF;
 ELSE
  SELECT lower(btrim(email)) INTO contact FROM users WHERE id=NEW.user_id FOR UPDATE;
  SELECT * INTO c FROM workspace_email_challenges WHERE id=NEW.challenge_id;
  IF c.id IS NULL OR c.user_id<>NEW.user_id OR c.email<>NEW.email OR contact IS DISTINCT FROM NEW.email OR c.state<>'consumed' OR c.consumed_at IS DISTINCT FROM NEW.verified_at OR NOT NEW.active THEN
   RAISE EXCEPTION 'Email proof requires consumed account-bound challenge' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_email_proof_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_verified_emails FOR EACH ROW EXECUTE FUNCTION workspace_email_proof_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_email_contact_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF lower(btrim(NEW.email)) IS DISTINCT FROM lower(btrim(OLD.email)) THEN
  UPDATE workspace_verified_emails SET active=false,revoked_at=clock_timestamp() WHERE user_id=NEW.id AND active;
  UPDATE workspace_email_challenges SET state='superseded' WHERE user_id=NEW.id AND state IN ('sending','accepted','uncertain');
 END IF;
 RETURN NEW;
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_email_contact_change AFTER UPDATE OF email ON users FOR EACH ROW EXECUTE FUNCTION workspace_email_contact_change();
--> statement-breakpoint
CREATE FUNCTION workspace_email_order_required() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE contact text;
BEGIN
 SELECT lower(btrim(email)) INTO contact FROM users WHERE id=NEW.user_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM workspace_verified_emails WHERE user_id=NEW.user_id AND email=contact AND active AND verified_at<=clock_timestamp()) THEN
  RAISE EXCEPTION 'Current verified Workspace email required for new order' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_email_order_required BEFORE INSERT ON workspace_membership_orders FOR EACH ROW EXECUTE FUNCTION workspace_email_order_required();
--> statement-breakpoint
CREATE FUNCTION workspace_email_notice_bind() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner uuid; proof uuid; contact text;
BEGIN
 SELECT user_id INTO owner FROM workspace_membership_orders WHERE id=NEW.membership_order_id;
 SELECT lower(btrim(email)) INTO contact FROM users WHERE id=owner FOR SHARE;
 SELECT id INTO proof FROM workspace_verified_emails WHERE user_id=owner AND email=contact AND active AND verified_at<=clock_timestamp();
 INSERT INTO workspace_email_notice_bindings(notice_id,verification_id) VALUES(NEW.id,proof);
 RETURN NEW;
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_email_notice_bind AFTER INSERT ON workspace_refund_notices FOR EACH ROW EXECUTE FUNCTION workspace_email_notice_bind();
--> statement-breakpoint
CREATE FUNCTION workspace_email_binding_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Notice recipient binding is immutable' USING ERRCODE='23514'; END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_email_binding_immutable BEFORE UPDATE OR DELETE ON workspace_email_notice_bindings FOR EACH ROW EXECUTE FUNCTION workspace_email_binding_immutable();
--> statement-breakpoint
-- Statement-level guards prevent bypassing retained evidence with TRUNCATE.
CREATE TRIGGER workspace_email_challenge_truncate_guard BEFORE TRUNCATE ON workspace_email_challenges FOR EACH STATEMENT EXECUTE FUNCTION workspace_email_binding_immutable();
--> statement-breakpoint
CREATE TRIGGER workspace_email_proof_truncate_guard BEFORE TRUNCATE ON workspace_verified_emails FOR EACH STATEMENT EXECUTE FUNCTION workspace_email_binding_immutable();
--> statement-breakpoint
CREATE TRIGGER workspace_email_notice_binding_truncate_guard BEFORE TRUNCATE ON workspace_email_notice_bindings FOR EACH STATEMENT EXECUTE FUNCTION workspace_email_binding_immutable();
