import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
const read = (file: string) => readFileSync(`${process.cwd()}/drizzle/${file}`, 'utf8');
it('adds only plan/coupon/applicability definitions; legacy tables are unchanged', () => {
  const before = JSON.parse(read('meta/0009_snapshot.json')), after = JSON.parse(read('meta/0010_snapshot.json'));
  expect(Object.keys(after.tables).filter(name => !before.tables[name]).sort()).toEqual(['public.workspace_coupon_plans', 'public.workspace_coupons', 'public.workspace_membership_plans']);
  for (const [name, table] of Object.entries(before.tables)) if (name !== 'public.workspace_audit_events') expect(after.tables[name]).toEqual(table);
  expect(after.enums).toEqual(before.enums);
  const journal = JSON.parse(read('meta/_journal.json')); expect(journal.entries[10].tag).toBe('0010_illegal_toxin'); expect(journal.entries[9].tag).toBe('0009_normal_baron_zemo');
});
it('seeds exactly approved prices/terms, freezes definitions and never creates financial capabilities', () => {
  const sql = read('0010_illegal_toxin.sql');
  expect(sql.match(/CREATE TABLE/g)).toHaveLength(3); expect(sql).not.toMatch(/DROP TABLE|TRUNCATE|INSERT INTO workspace_coupons|CREATE TABLE.*(?:orders|redemptions|memberships|profiles)|UPDATE (?:users|coupons|orders)/i);
  for (const value of ["'quarterly',1,'Quarterly',3,499900", "'half_yearly',1,'Half-Yearly',6,899900", "'yearly',1,'Yearly',12,1699900"]) expect(sql).toContain(value);
  for (const trigger of ['workspace_membership_plans_immutable', 'workspace_coupons_immutable', 'workspace_coupon_plans_immutable', 'workspace_coupons_complete']) expect(sql).toContain(`TRIGGER ${trigger}`);
  expect(sql).toContain('DEFERRABLE INITIALLY DEFERRED'); expect(sql).toContain("OLD.status = 'archived'"); expect(sql).toContain('only versioned status transitions');
  expect(sql).toContain('requires audit evidence in the same transaction'); expect(sql).toContain('workspace_plans_current_idx'); expect(sql).toContain('workspace_coupons_scope_code_idx');
  expect(sql).not.toMatch(/DISABLE TRIGGER|DROP TRIGGER|CREATE OR REPLACE FUNCTION workspace_phase13/);
});
it('keeps original settings publication audit shape mandatory while adding typed coupon evidence', () => {
  const sql = read('0010_illegal_toxin.sql');
  expect(sql).toContain('"settings_id" IS NOT NULL'); expect(sql).toContain('"previous_settings_id" IS NOT NULL'); expect(sql).toContain('"after_status" IS NOT NULL'); expect(sql).toContain('"before_status" IS NOT NULL');
});

it('tightens coupon audit freshness without changing definitions or historical migrations', () => {
  const correction = read('0011_workspace_coupon_audit_freshness.sql');
  expect(correction).toContain('NEW.updated_at <= OLD.updated_at');
  expect(correction).toContain('created_at = NEW.updated_at');
  expect(correction.match(/CREATE OR REPLACE FUNCTION/g)).toHaveLength(2);
  expect(correction).not.toMatch(/ALTER TABLE|DROP|DISABLE|TRUNCATE|INSERT INTO|UPDATE workspace_/);
  const before = JSON.parse(read('meta/0010_snapshot.json')), after = JSON.parse(read('meta/0011_snapshot.json'));
  expect(after.tables).toEqual(before.tables); expect(after.enums).toEqual(before.enums);
  expect(after.prevId).toBe(before.id);
});
