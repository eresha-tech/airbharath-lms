import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const read = (file: string) => readFileSync(file, 'utf8');
const migration = read('drizzle/0030_workspace_retained_history_truncate_guards.sql');
const executable = migration.replace(/^--.*$/gm, '');
const review = JSON.parse(read('output/audits/workspace-f6r/coverage-review.json')) as {
  proposedSqlSha256: string;
  priorMigrationHashes: { tag: string; sha256: string }[];
  rows: { table: string; decision: string; hasTruncateTrigger: boolean; rationale: string }[];
};
const digest = (text: string) => createHash('sha256').update(text).digest('hex');

it('retains every previously applied migration byte and the logical schema snapshot', () => {
  expect(review.priorMigrationHashes).toHaveLength(30);
  for (const prior of review.priorMigrationHashes) expect(digest(read(`drizzle/${prior.tag}.sql`))).toBe(prior.sha256);
  const before = JSON.parse(read('drizzle/meta/0029_snapshot.json'));
  const next = JSON.parse(read('drizzle/meta/0030_snapshot.json'));
  expect(next.prevId).toBe(before.id);
  const logical = ({ id: _id, prevId: _prevId, ...schema }: Record<string, unknown>) => schema;
  expect(logical(next)).toEqual(logical(before));
  const journal = JSON.parse(read('drizzle/meta/_journal.json'));
  expect(journal.entries).toHaveLength(32);
  expect(journal.entries[31]).toMatchObject({ idx: 31, tag: '0031_workspace_phone_only_onboarding' });
  expect(journal.entries[30]).toMatchObject({ idx: 30, tag: '0030_workspace_retained_history_truncate_guards' });
  expect(digest(migration)).toBe(review.proposedSqlSha256);
});

it('unconditionally refuses truncation without reading row records, environment flags or elevated privileges', () => {
  const body = executable.match(/AS \$\$([\s\S]*?)\$\$/)?.[1];
  expect(body?.replace(/\s+/g, ' ').trim()).toBe("BEGIN RAISE EXCEPTION 'Workspace retained history cannot be truncated' USING ERRCODE = '23514'; END;");
  expect(executable).toContain('SECURITY INVOKER');
  expect(executable).toContain('SET search_path = pg_catalog');
  expect(executable).not.toMatch(/\b(OLD|NEW|IF|WHEN|SECURITY DEFINER|current_setting|ALTER|DROP|UPDATE|DELETE|INSERT|GRANT|REVOKE)\b/i);
});

it('covers all seven original leaves and reviewed retained state without duplicate existing guards', () => {
  const attachments = [...executable.matchAll(/CREATE TRIGGER (\w+)\s+BEFORE TRUNCATE ON public\.(\w+)\s+FOR EACH STATEMENT EXECUTE FUNCTION public\.workspace_retained_history_reject_truncate\(\);/g)];
  const targets = attachments.map(m => m[2]);
  expect(attachments).toHaveLength(21);
  expect(new Set(targets).size).toBe(21);
  expect(review.rows).toHaveLength(40);
  expect(new Set(review.rows.map(r => r.table)).size).toBe(40);
  expect(targets).toEqual(review.rows.filter(r => r.decision === 'add_guard').map(r => r.table));
  for (const leaf of ['audit_events', 'coupon_plans', 'coupon_redemptions', 'course_review_events', 'memberships', 'payment_attempts', 'payment_events']) expect(targets).toContain(`workspace_${leaf}`);
  expect(targets).toContain('workspace_applications');
  expect(targets).toContain('workspace_course_lessons');
  expect(targets).toContain('workspace_creator_profile_details');
  expect(review.rows.filter(r => r.decision === 'existing_guard')).toHaveLength(18);
  expect(review.rows.filter(r => r.decision === 'exclude_operational').map(r => r.table)).toEqual(['workspace_email_rate_limits']);
  for (const row of review.rows) {
    expect(row.rationale.length).toBeGreaterThan(30);
    expect(targets.includes(row.table)).toBe(!row.hasTruncateTrigger && row.decision !== 'exclude_operational');
  }
  for (const match of attachments) expect(Buffer.byteLength(match[1])).toBeLessThanOrEqual(63);
  const remainder = executable.replace(/CREATE FUNCTION[\s\S]*?\$\$;/, '').replace(/CREATE TRIGGER[\s\S]*?\(\);/g, '').trim();
  expect(remainder).toBe('');
});

it('keeps destructive verification isolated with exact identity assertions and injected database services', () => {
  const proof = read('tests/postgres/workspace-truncate-guards-verification.cjs');
  expect(proof).toContain("bootstrap.pathname,'/airbharath_lms'");
  expect(proof).toContain("maintenanceUrl.pathname='/postgres'");
  expect(proof).toContain('workspace_f6r_disposable_');
  expect(proof).toContain("assert.notEqual(actual.oid,'16384')");
  expect(proof).toContain("assert.equal(actual.database,database)");
  expect(proof).toContain("'@/lib/db':{db}");
  expect(proof).toContain("global.fetch=async()=>");
  expect(proof).toContain("found.oid===createdOid");
  expect(proof).toContain("NOLOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION");
  expect(proof).toContain("assert(!privileges.truncate&&privileges.insert&&!privileges.schema_create)");
  expect(proof).not.toMatch(/TRUNCATE.*airbharath_lms|DROP DATABASE airbharath_lms|FORCE\s*\)/);
});
