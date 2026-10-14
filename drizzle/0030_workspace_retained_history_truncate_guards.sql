-- Additive retained-history protection. Ordinary row operations retain their existing guards.
-- Privileged object owners can disable/drop triggers; runtime-role separation remains required.
CREATE FUNCTION public.workspace_retained_history_reject_truncate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'Workspace retained history cannot be truncated' USING ERRCODE = '23514';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER workspace_applications_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_applications
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_audit_events_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_audit_events
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_coupon_plans_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_coupon_plans
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_coupon_redemptions_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_coupon_redemptions
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_coupons_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_coupons
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_course_drafts_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_course_drafts
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_course_lessons_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_course_lessons
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_course_modules_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_course_modules
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_course_projects_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_course_projects
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_course_review_events_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_course_review_events
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_course_submissions_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_course_submissions
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_creator_profile_details_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_creator_profile_details
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_creator_profiles_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_creator_profiles
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_eligibility_attempts_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_eligibility_attempts
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_eligibility_settings_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_eligibility_settings
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_membership_orders_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_membership_orders
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_membership_plans_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_membership_plans
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_memberships_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_memberships
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_payment_attempts_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_payment_attempts
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_payment_events_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_payment_events
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_policy_versions_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_policy_versions
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
