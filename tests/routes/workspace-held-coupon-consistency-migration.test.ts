import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
it('additive correction allows reserved held captures without weakening other deferred financial invariants', () => {
  const original = readFileSync('drizzle/0012_useful_warhawk.sql', 'utf8');
  const start = original.indexOf('CREATE FUNCTION workspace_phase15_financial_complete()');
  const body = original.slice(start, original.indexOf('--> statement-breakpoint', start)).replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION');
  const correction = readFileSync('drizzle/0025_workspace_held_capture_coupon_consistency.sql', 'utf8');
  const actual = correction.slice(correction.indexOf('CREATE OR REPLACE FUNCTION'));
  expect(actual.replace("\n        AND NOT (r.status='reserved' AND o.activation_state='held_for_review')", '')).toBe(body);
  expect(correction).toContain("o.review_reason IS DISTINCT FROM 'reservation_inconsistent'");
  expect(correction).toContain('Captured order requires exact winning payment evidence');
  expect(correction).toContain("o.financial_state='unpaid' AND o.provider_setup_state<>'closed' AND r.status<>'reserved'");
  expect(correction).toContain("o.financial_state='unpaid' AND o.provider_setup_state='closed' AND r.status<>'released'");
  expect(correction).not.toMatch(/DISABLE TRIGGER|DROP TRIGGER|UPDATE workspace_|DELETE FROM/);
  expect(createHash('sha256').update(readFileSync('drizzle/0023_chubby_jimmy_woo.sql')).digest('hex')).toBe('eb52bf03f803cf181d155483794f853e9d08c00240e29dd0ba3ace5cd1e7f910');
  expect(createHash('sha256').update(readFileSync('drizzle/0024_workspace_influencer_history_truncate_guard.sql')).digest('hex')).toBe('a43c81bc2dbe9cae06883946221e6487c51fd85d05ad2a49db38690250627f8e');
});
