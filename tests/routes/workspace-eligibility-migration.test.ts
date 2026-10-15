import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { DEFAULT_SETTINGS, DECLARATIONS } from '@/lib/workspace/eligibility/model';
const read = (name: string) => readFileSync(`${process.cwd()}/drizzle/${name}`, 'utf8');
it('adds exactly the Phase 1.3 tables and enum without changing existing table snapshots', () => {
  const before = JSON.parse(read('meta/0008_snapshot.json')), after = JSON.parse(read('meta/0009_snapshot.json'));
  const added = Object.keys(after.tables).filter(name => !before.tables[name]);
  expect(added.sort()).toEqual(['public.workspace_audit_events', 'public.workspace_eligibility_attempts', 'public.workspace_eligibility_settings', 'public.workspace_policy_versions']);
  for (const [name, table] of Object.entries(before.tables)) expect(after.tables[name]).toEqual(table);
  for (const [name, type] of Object.entries(before.enums)) expect(after.enums[name]).toEqual(type);
  expect(Object.keys(after.enums).filter(name => !before.enums[name])).toEqual(['public.workspace_eligibility_result']);
  const journal = JSON.parse(read('meta/_journal.json')); expect(journal.entries[9].tag).toBe('0009_normal_baron_zemo'); expect(journal.entries[8].tag).toBe('0008_eager_energizer');
});
it('SQL contains immutable-history triggers, unique current pointers and the original approved migration defaults', () => {
  const sql = read('0009_normal_baron_zemo.sql');
  expect(sql).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM|UPDATE "(?:users|workspace_applications)"/i);
  expect(sql.match(/CREATE TABLE/g)).toHaveLength(4);
  expect(sql).toContain('workspace_eligibility_attempts_user_key_idx');
  expect(sql).toContain('workspace_eligibility_settings_current_idx'); expect(sql).toContain('workspace_policy_versions_current_idx');
  for (const name of ['workspace_eligibility_attempts', 'workspace_audit_events', 'workspace_eligibility_settings', 'workspace_policy_versions']) expect(sql).toContain(`BEFORE UPDATE OR DELETE ON ${name}`);
  // Migration 0009 is immutable; current defaults change through audited settings publication.
  const originalSettings = { ...DEFAULT_SETTINGS, minimumExperienceMonths: 24, eligibilityValidityDays: 30 };
  for (const value of [originalSettings, DECLARATIONS]) expect(sql).toContain(createHash('sha256').update(JSON.stringify(value)).digest('hex'));
  expect(sql).toContain('2026-11-08T18:30:00.000Z'); expect(sql).toContain('Asia/Kolkata');
  expect(sql).toContain("to_jsonb(NEW) - 'is_current'"); expect(sql).toContain('IS NOT NULL');
});
