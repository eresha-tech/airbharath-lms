-- F.1 PROPOSAL ONLY. Requires separate authorization before db:migrate.
-- Publish successor catalog rows; never rewrite accepted order/payment/refund economics.
-- The guarded Drizzle runner executes the migration transactionally.
LOCK TABLE workspace_membership_plans IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
DO $$
BEGIN
  -- Fail closed if the reviewed current v1 catalog has changed.
  -- Retain historical Quarterly synthetic versions 2-4; publish version 5.
  -- Reject unexpected successors/ID collisions rather than guessing a new version.
  IF (SELECT count(*) FROM workspace_membership_plans WHERE is_current) <> 3
    OR EXISTS (SELECT 1 FROM workspace_membership_plans
      WHERE (code = 'quarterly' AND version > 4)
        OR (code IN ('half_yearly', 'yearly') AND version > 1)
        OR id IN ('14000000-0000-4000-8000-000000000004',
                  '14000000-0000-4000-8000-000000000005',
                  '14000000-0000-4000-8000-000000000006'))
    OR EXISTS (
      SELECT 1 FROM (VALUES
        ('14000000-0000-4000-8000-000000000001'::uuid, 'quarterly', 'Quarterly', 3, 499900),
        ('14000000-0000-4000-8000-000000000002'::uuid, 'half_yearly', 'Half-Yearly', 6, 899900),
        ('14000000-0000-4000-8000-000000000003'::uuid, 'yearly', 'Yearly', 12, 1699900)
      ) AS expected(id, code, display_name, duration_months, base_price_paise)
      LEFT JOIN workspace_membership_plans p ON p.id = expected.id
      WHERE p.id IS NULL OR p.code <> expected.code OR p.version <> 1
        OR p.display_name <> expected.display_name OR p.duration_months <> expected.duration_months
        OR p.base_price_paise <> expected.base_price_paise OR p.tax_rate_bps <> 1800
        OR p.currency <> 'INR' OR NOT p.is_current OR NOT p.available
    ) THEN
    RAISE EXCEPTION 'F.1 requires the reviewed three-plan v1 catalog' USING ERRCODE = '23514';
  END IF;
END;
$$;
--> statement-breakpoint
UPDATE workspace_membership_plans SET is_current = false WHERE is_current;
--> statement-breakpoint
INSERT INTO workspace_membership_plans
  (id, code, version, display_name, duration_months, base_price_paise, tax_rate_bps, currency, is_current, available)
VALUES
  ('14000000-0000-4000-8000-000000000004', 'quarterly', 5, 'Quarterly', 3, 499915, 1800, 'INR', true, true),
  ('14000000-0000-4000-8000-000000000005', 'half_yearly', 2, 'Half-Yearly', 6, 847373, 1800, 'INR', true, true),
  ('14000000-0000-4000-8000-000000000006', 'yearly', 2, 'Yearly', 12, 1499915, 1800, 'INR', true, true);
