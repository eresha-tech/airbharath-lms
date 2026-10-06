-- Phase 1.4V correction: match each lifecycle command to fresh, exact timestamp evidence.
-- Keep applied definitions/history and existing triggers; replace only their functions.
CREATE OR REPLACE FUNCTION workspace_phase14_coupon_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Archive Workspace coupons instead of deleting' USING ERRCODE = '23514'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','version','updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','version','updated_at'])
    OR OLD.status = 'archived' OR NEW.status = OLD.status OR NEW.version <> OLD.version + 1 OR NEW.updated_at <= OLD.updated_at THEN
    RAISE EXCEPTION 'Coupon definitions are immutable; only versioned status transitions are allowed' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION workspace_phase14_coupon_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_action text; expected_before text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    expected_action := 'coupon_created'; expected_before := NULL;
    IF NEW.status <> 'active' OR NEW.version <> 1 OR NOT EXISTS (SELECT 1 FROM workspace_coupon_plans WHERE coupon_id = NEW.id) OR EXISTS (
      SELECT 1 FROM workspace_coupon_plans cp LEFT JOIN workspace_membership_plans p ON p.code = cp.plan_code AND p.is_current
      WHERE cp.coupon_id = NEW.id AND (p.id IS NULL OR
        CASE WHEN NEW.discount_type = 'fixed' THEN NEW.discount_value ELSE round(p.base_price_paise::numeric * NEW.discount_value / 10000) END >= p.base_price_paise)
    ) THEN RAISE EXCEPTION 'Coupon must have applicable current plans and a positive paid base' USING ERRCODE = '23514'; END IF;
  ELSE
    expected_action := 'coupon_status_changed'; expected_before := OLD.status;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM workspace_audit_events WHERE coupon_id = NEW.id
    AND action = expected_action AND after_status = NEW.status
    AND before_status IS NOT DISTINCT FROM expected_before AND created_at = NEW.updated_at) THEN
    RAISE EXCEPTION 'Coupon creation/status change requires audit evidence in the same transaction' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
