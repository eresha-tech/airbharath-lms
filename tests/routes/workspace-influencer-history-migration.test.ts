import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('retains the exact applied 0023 bytes and adds statement-level protection for bulk history deletion', () => {
  const applied = readFileSync('drizzle/0023_chubby_jimmy_woo.sql');
  expect(createHash('sha256').update(applied).digest('hex')).toBe('eb52bf03f803cf181d155483794f853e9d08c00240e29dd0ba3ace5cd1e7f910');
  const correction = readFileSync('drizzle/0024_workspace_influencer_history_truncate_guard.sql', 'utf8');
  expect(correction).toContain("ERRCODE='23514'");
  for (const table of ['workspace_influencers', 'workspace_influencer_history']) {
    expect(correction).toContain(`BEFORE TRUNCATE ON ${table}`);
  }
  expect(correction.match(/FOR EACH STATEMENT EXECUTE FUNCTION workspace_influencer_reject_truncate\(\)/g)).toHaveLength(2);
  expect(correction).not.toMatch(/DISABLE TRIGGER|DROP |UPDATE |DELETE FROM|ALTER TABLE.*DROP/);
});
