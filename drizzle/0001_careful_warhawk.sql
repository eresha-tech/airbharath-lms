ALTER TABLE "certificates" ADD COLUMN "status" text DEFAULT 'issued' NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "issued_by" uuid;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "certificate_status" text DEFAULT 'disabled' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "certificate_activated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "certificate_activated_by" uuid;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "delivery_type" text DEFAULT 'recorded' NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "meeting_url" text;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_certificate_activated_by_users_id_fk" FOREIGN KEY ("certificate_activated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_course_cert_unique_idx" ON "certificates" USING btree ("user_id","course_id");