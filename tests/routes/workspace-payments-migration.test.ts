import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
const read = (file: string) => readFileSync(`${process.cwd()}/${file}`, 'utf8');
const sql = read('drizzle/0012_useful_warhawk.sql');
it('extends the verified 0011 head with only four isolated financial tables', () => {
  const before = JSON.parse(read('drizzle/meta/0011_snapshot.json')), after = JSON.parse(read('drizzle/meta/0012_snapshot.json'));
  expect(after.prevId).toBe(before.id);
  expect(Object.keys(after.tables).filter(name => !before.tables[name]).sort()).toEqual(['public.workspace_coupon_redemptions', 'public.workspace_membership_orders', 'public.workspace_payment_attempts', 'public.workspace_payment_events']);
  for (const [name, table] of Object.entries(before.tables)) expect(after.tables[name]).toEqual(table);
  expect(after.enums).toEqual(before.enums);
  const journal = JSON.parse(read('drizzle/meta/_journal.json'));
  expect(journal.entries.slice(11, 13).map((entry: { tag: string }) => entry.tag)).toEqual(['0011_workspace_coupon_audit_freshness', '0012_useful_warhawk']);
  expect(sql.match(/CREATE TABLE/g)).toHaveLength(4);
  expect(sql).not.toMatch(/DROP TABLE|TRUNCATE|DISABLE TRIGGER|CREATE OR REPLACE FUNCTION|CREATE TABLE.*(?:creator|course_drafts)|UPDATE (?:users|orders|coupons)|INSERT INTO (?:users|orders|coupons)/i);
});
it('enforces identity, ownership, capacity, safe release and deferred financial completeness', () => {
  for (const name of ['workspace_orders_user_request_idx', 'workspace_orders_unresolved_user_idx', 'workspace_orders_receipt_idx', 'workspace_orders_provider_order_idx', 'workspace_redemptions_order_idx', 'workspace_redemptions_user_coupon_idx', 'workspace_payments_provider_id_idx', 'workspace_payments_winner_idx', 'workspace_events_provider_event_idx']) expect(sql).toContain(name);
  expect(sql).toContain('occupied+1>c.usage_limit'); expect(sql).toContain('FOR UPDATE');
  expect(sql.match(/DEFERRABLE INITIALLY DEFERRED/g)).toHaveLength(3);
  expect(sql).toContain('provider_create_failure_hash IS DISTINCT FROM NEW.release_evidence_hash');
  expect(sql).toContain('Accepted settings/policy/start context mismatch');
  expect(sql).toContain('Captured order requires exact winning payment evidence');
  expect(sql).toContain('IF TG_TABLE_NAME=');
  expect(sql).toContain('"refund_eligible_until" IS NOT NULL'); expect(sql).toContain("interval '72 hours'");
  expect(sql).toContain('"release_reason" IS NOT NULL'); expect(sql).toContain('"capture_time_source" IS NOT NULL');
});
it('preserves public disabled CTA and keeps financial administration read-only', () => {
  expect(read('components/workspace/ActivationPreview.tsx')).toContain('Payments not yet enabled');
  const page = read('app/(admin)/admin/workspace/orders/page.tsx');
  expect(page).toContain('getAuthorizedAdminSession'); expect(page).toContain('ph-no-capture');
  expect(page).not.toContain('Mark Paid'); expect(page).not.toContain('Active membership');
  expect(read('components/workspace/WorkspaceCoupons.tsx')).toContain('releasedReservations');
});
