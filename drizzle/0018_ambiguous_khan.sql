CREATE TABLE "workspace_creator_terms_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"terms_version" text NOT NULL,
	"terms_content_hash" text NOT NULL,
	"accepted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_terms_user_version_unique" UNIQUE("user_id","terms_version"),
	CONSTRAINT "workspace_terms_acceptance_snapshot_unique" UNIQUE("id","user_id","terms_version","terms_content_hash","accepted_at"),
	CONSTRAINT "workspace_terms_acceptance_time_check" CHECK ("workspace_creator_terms_acceptances"."accepted_at" = "workspace_creator_terms_acceptances"."created_at")
);
--> statement-breakpoint
CREATE TABLE "workspace_creator_terms_versions" (
	"terms_version" text PRIMARY KEY NOT NULL,
	"content_hash" text NOT NULL,
	"canonical_content" text NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_terms_version_hash_unique" UNIQUE("terms_version","content_hash"),
	CONSTRAINT "workspace_terms_content_check" CHECK ("workspace_creator_terms_versions"."terms_version" ~ '^workspace_creator_terms_[a-zA-Z0-9_]+$' AND "workspace_creator_terms_versions"."content_hash" = encode(sha256(convert_to("workspace_creator_terms_versions"."canonical_content", 'UTF8')), 'hex'))
);
--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD COLUMN "creator_terms_acceptance_id" uuid;--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD COLUMN "creator_terms_version" text;--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD COLUMN "creator_terms_content_hash" text;--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD COLUMN "creator_terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workspace_creator_terms_acceptances" ADD CONSTRAINT "workspace_creator_terms_acceptances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_creator_terms_acceptances" ADD CONSTRAINT "workspace_terms_acceptance_document_fk" FOREIGN KEY ("terms_version","terms_content_hash") REFERENCES "public"."workspace_creator_terms_versions"("terms_version","content_hash") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_terms_current_idx" ON "workspace_creator_terms_versions" USING btree ("is_current") WHERE "workspace_creator_terms_versions"."is_current";--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD CONSTRAINT "workspace_orders_terms_snapshot_fk" FOREIGN KEY ("creator_terms_acceptance_id","user_id","creator_terms_version","creator_terms_content_hash","creator_terms_accepted_at") REFERENCES "public"."workspace_creator_terms_acceptances"("id","user_id","terms_version","terms_content_hash","accepted_at") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_membership_orders" ADD CONSTRAINT "workspace_orders_terms_snapshot_check" CHECK (("workspace_membership_orders"."creator_terms_acceptance_id" IS NULL AND "workspace_membership_orders"."creator_terms_version" IS NULL AND "workspace_membership_orders"."creator_terms_content_hash" IS NULL AND "workspace_membership_orders"."creator_terms_accepted_at" IS NULL) OR ("workspace_membership_orders"."creator_terms_acceptance_id" IS NOT NULL AND "workspace_membership_orders"."creator_terms_version" IS NOT NULL AND "workspace_membership_orders"."creator_terms_content_hash" IS NOT NULL AND "workspace_membership_orders"."creator_terms_accepted_at" IS NOT NULL AND "workspace_membership_orders"."creator_terms_accepted_at" <= "workspace_membership_orders"."created_at"));
--> statement-breakpoint
-- Source-controlled draft: not evidence of owner/legal approval or payment enablement.
INSERT INTO workspace_creator_terms_versions (terms_version, content_hash, canonical_content, effective_at, is_current) VALUES ('workspace_creator_terms_2026_01', '7263f236cc1b27df8f95ef69a2dcc706981ec2060d58758f788bfe40f6808bac', $workspace_terms${"version":"workspace_creator_terms_2026_01","effectiveAt":"2026-10-12T00:00:00.000Z","title":"AirBharath Workspace Creator Terms","sections":[{"title":"Parties and scope","paragraphs":["AirBharath is the product/brand of Eresha Technology Innovators Pvt. Ltd., identified in the existing AirBharath site footer. These Creator Terms concern AirBharath Workspace, a creator platform for aviation professionals. They are separate from learner course-purchase terms.","Membership provides access to available Workspace creator tools according to the selected prepaid plan and current product capabilities. It does not promise every planned feature."]},{"title":"Age, capacity and eligibility","paragraphs":["I confirm that I am 18 years of age or older and legally able to enter into the AirBharath Workspace Creator agreement. No date of birth is collected for this declaration.","Workspace Eligibility is based on information supplied by the applicant. It is separate from course approval and regulatory approval, and may be revisited if information is materially inaccurate. Eligibility is not professional identity or qualification verification.","You must provide truthful and materially accurate professional background, experience, professional profile, course and account information."]},{"title":"Your audience and commercial expectations","paragraphs":["Creators are expected to promote their courses to their own audience and professional network when public course offerings become available. AirBharath does not guarantee learners, traffic, enrollments, income, sales or marketplace distribution, and does not undertake to supply customers.","Membership does not guarantee creator revenue, employment, airline placement or any business outcome."]},{"title":"Current tools and course review","paragraphs":["The current Workspace supports the Creator Dashboard, creator profile, private course drafts, AirBharath review and an approved-proposal Course Builder with modules, lessons and plain-text lesson content. Video uploads, downloadable resources, assessments, public course sales and publication are future functionality and are not currently available features.","Every course requires AirBharath review before publication. AirBharath Course Review Approved means the approved proposal/course version may proceed into the private Course Builder. It is not final publication authorization. Review approval and builder access do not automatically publish a course; final content/publication approval will be a separate process.","AirBharath course review does not mean DGCA, airline, government, defence or regulator approval, or certification unless separately documented. You must not make false approval or affiliation claims."]},{"title":"Content ownership and limited service permission","paragraphs":["You retain ownership of content you legitimately own. You grant AirBharath only the limited permission necessary to store, process, display privately, review and operate your content within the current private Workspace service. This permission does not transfer ownership or authorize commercial public publication or sale.","Future public publication or selling may require an additional agreement or updated Creator Terms. The learner Terms of Service description of content belonging to AirBharath or its licensors does not transfer your ownership under these Creator Terms.","You are responsible for having the rights and permissions required for content you submit. Do not submit infringing or illegal content, confidential information without authority, or deceptive professional claims."]},{"title":"Professional responsibility","paragraphs":["Creator content is educational. You remain responsible for professional accuracy within your claimed expertise. Do not represent Workspace or your content as replacing legally required aviation training, regulatory certification, employer training, operational manuals or approved procedures unless explicitly documented for a particular course later."]},{"title":"Prepaid membership and Early Access","paragraphs":["Quarterly membership lasts 3 calendar months, Half-Yearly 6 calendar months and Yearly 12 calendar months. Membership is prepaid with manual renewal; it is not recurring billing or autopay.","Official paid-term launch is 9 November 2026, 00:00 Asia/Kolkata. After a successful payment before launch, eligible creators may receive Basic Workspace Early Access immediately. The purchased paid term begins at that launch time; Early Access does not extend the purchased paid term.","For successful payments on or after launch, the paid term begins according to the existing successful-payment membership rules. Activation may complete later without extending the purchased calendar-month term. Access depends on normal payment reconciliation and membership fulfillment.","Applicable GST and taxes are charged as displayed during checkout. Refund eligibility and processing are governed by the AirBharath Workspace Refund Policy presented at checkout. That separate policy must be completed before public payments are enabled; these terms do not define detailed refund rules."]},{"title":"Account security and restrictions","paragraphs":["You are responsible for reasonable security of your account and access credentials. Do not share access or misuse Workspace.","AirBharath may proportionately restrict, suspend or terminate Workspace access for material false information, misuse, infringement, unlawful activity or serious policy violations. It will act in a commercially reasonable manner and provide notice and an opportunity to address the issue where appropriate, except where immediate restriction is necessary for safety, security or legal compliance. Refund effects remain subject to the separate Refund Policy and applicable law; restriction is not automatic refund forfeiture."]},{"title":"Changes, acceptance and privacy","paragraphs":["AirBharath may improve or change Workspace functionality over time without promising unchanged features forever. These changes do not retroactively change the duration or price of an already purchased term.","Contractual text changes require a new version. New purchases and future renewals require acceptance of the then-current terms. A later terms version does not by itself revoke an already active paid membership.","AirBharath retains your account identifier, terms version, content hash and acceptance timestamp as agreement evidence. This is not marketing consent. The AirBharath Privacy Policy applies to personal information."]},{"title":"Law, contact and legal confirmation","paragraphs":["These Creator Terms are governed by the laws of India, consistent with the existing Terms of Service. Contact: academy@airbharath.in. The existing site contact address is Eresha Technology Innovators Pvt. Ltd., West Patel Nagar, New Delhi 110008; it is not identified here as a registered office.","IMPLEMENTATION PLACEHOLDER — owner/legal confirmation is required for the complete registered/business address and any applicable court/forum jurisdiction before commercial launch. No court, grievance officer or company registration detail is inferred. This version is a draft awaiting owner/legal approval."]}]}$workspace_terms$, '2026-10-12T00:00:00.000Z', true);
--> statement-breakpoint
CREATE FUNCTION workspace_terms_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Workspace Creator Terms acceptance history is immutable' USING ERRCODE='23514';
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_terms_acceptance_history_guard BEFORE UPDATE OR DELETE ON workspace_creator_terms_acceptances FOR EACH ROW EXECUTE FUNCTION workspace_terms_history_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_terms_acceptance_truncate_guard BEFORE TRUNCATE ON workspace_creator_terms_acceptances FOR EACH STATEMENT EXECUTE FUNCTION workspace_terms_history_guard();
--> statement-breakpoint
CREATE TRIGGER workspace_terms_versions_truncate_guard BEFORE TRUNCATE ON workspace_creator_terms_versions FOR EACH STATEMENT EXECUTE FUNCTION workspace_terms_history_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_terms_document_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'Workspace Creator Terms documents cannot be deleted' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'is_current') IS DISTINCT FROM (to_jsonb(OLD)-'is_current') THEN
    RAISE EXCEPTION 'Contractual text requires a new Creator Terms version' USING ERRCODE='23514';
  END IF;
  IF NEW.canonical_content::jsonb->>'version' IS DISTINCT FROM NEW.terms_version
     OR (NEW.canonical_content::jsonb->>'effectiveAt')::timestamptz IS DISTINCT FROM NEW.effective_at THEN
    RAISE EXCEPTION 'Creator Terms document metadata mismatch' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_terms_document_guard BEFORE INSERT OR UPDATE OR DELETE ON workspace_creator_terms_versions FOR EACH ROW EXECUTE FUNCTION workspace_terms_document_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_terms_acceptance_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d workspace_creator_terms_versions;
BEGIN
  SELECT * INTO d FROM workspace_creator_terms_versions WHERE terms_version=NEW.terms_version AND content_hash=NEW.terms_content_hash AND is_current FOR SHARE;
  IF NOT FOUND OR NEW.accepted_at < d.effective_at OR NEW.accepted_at > clock_timestamp() THEN
    RAISE EXCEPTION 'Acceptance requires current effective Creator Terms and server time' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_terms_acceptance_insert_guard BEFORE INSERT ON workspace_creator_terms_acceptances FOR EACH ROW EXECUTE FUNCTION workspace_terms_acceptance_insert_guard();
--> statement-breakpoint
CREATE FUNCTION workspace_new_order_terms_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d workspace_creator_terms_versions;
BEGIN
  -- Prospective only: existing nullable snapshots are preserved; no historical UPDATE/backfill.
  SELECT * INTO d FROM workspace_creator_terms_versions WHERE is_current FOR SHARE;
  IF NOT FOUND OR NEW.creator_terms_acceptance_id IS NULL
     OR NEW.creator_terms_version IS DISTINCT FROM d.terms_version
     OR NEW.creator_terms_content_hash IS DISTINCT FROM d.content_hash
     OR NEW.creator_terms_accepted_at IS NULL OR NEW.creator_terms_accepted_at < d.effective_at
     OR NEW.creator_terms_accepted_at > NEW.created_at OR NEW.created_at > clock_timestamp() THEN
    RAISE EXCEPTION 'New Workspace orders require current Creator Terms acceptance' USING ERRCODE='23514';
  END IF;
  -- Composite FK verifies acceptance ID, owner, version, hash and timestamp together.
  -- Existing workspace_financial_orders_guard protects all new snapshot columns on UPDATE.
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER workspace_new_order_terms_guard BEFORE INSERT ON workspace_membership_orders FOR EACH ROW EXECUTE FUNCTION workspace_new_order_terms_guard();
