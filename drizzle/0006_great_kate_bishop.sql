CREATE TABLE "course_authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"name" text NOT NULL,
	"photo_url" text,
	"designation" text,
	"bio" text,
	"profile_url" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "short_description" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "about_course" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "what_you_will_learn" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "who_is_this_for" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "prerequisites" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "content_overview" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "practical_task" text;--> statement-breakpoint
ALTER TABLE "course_authors" ADD CONSTRAINT "course_authors_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;