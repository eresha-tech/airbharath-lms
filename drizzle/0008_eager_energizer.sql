CREATE TYPE "public"."workspace_approval_email_status" AS ENUM('not_sent', 'sending', 'sent', 'failed');--> statement-breakpoint
ALTER TABLE "workspace_applications" ADD COLUMN "approval_email_status" "workspace_approval_email_status" DEFAULT 'not_sent' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_applications" ADD COLUMN "approval_email_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workspace_applications" ADD COLUMN "approval_email_sent_by" uuid;--> statement-breakpoint
ALTER TABLE "workspace_applications" ADD COLUMN "approval_email_attempted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workspace_applications" ADD COLUMN "approval_email_attempted_by" uuid;--> statement-breakpoint
ALTER TABLE "workspace_applications" ADD COLUMN "approval_email_attempt_id" uuid;--> statement-breakpoint
ALTER TABLE "workspace_applications" ADD COLUMN "approval_email_error_category" text;--> statement-breakpoint
ALTER TABLE "workspace_applications" ADD COLUMN "approval_email_personal_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_applications" ADD CONSTRAINT "workspace_applications_approval_email_sent_by_users_id_fk" FOREIGN KEY ("approval_email_sent_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_applications" ADD CONSTRAINT "workspace_applications_approval_email_attempted_by_users_id_fk" FOREIGN KEY ("approval_email_attempted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;