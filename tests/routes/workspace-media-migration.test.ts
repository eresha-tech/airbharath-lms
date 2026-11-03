import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
const read = (path: string) => readFileSync(path, 'utf8');
const sql = read('drizzle/0032_workspace_course_media.sql');
it('adds only private media and defaulted Creator lesson fields, after journal 0031', () => {
  const journal = JSON.parse(read('drizzle/meta/_journal.json'));
  expect(journal.entries[31].tag).toBe('0031_workspace_phone_only_onboarding');
  expect(journal.entries[32]).toMatchObject({ idx: 32, tag: '0032_workspace_course_media' });
  const previous = JSON.parse(read('drizzle/meta/0031_snapshot.json')), next = JSON.parse(read('drizzle/meta/0032_snapshot.json'));
  expect(next.prevId).toBe(previous.id);
  expect(sql).toContain('"content_format" text DEFAULT \'plain_text\' NOT NULL');
  expect(sql).toContain('"media_revision" integer DEFAULT 0 NOT NULL');
  expect([...sql.matchAll(/CREATE TABLE "([^"]+)"/g)].map(m => m[1])).toEqual(['workspace_course_assets']);
  expect(sql).not.toMatch(/ALTER TABLE "(courses|lessons|videos|enrollments|orders|workspace_membership_orders)"|DROP TABLE|TRUNCATE TABLE|UPDATE "?(courses|lessons|enrollments)\b/);
});
it('creates referenced composite indexes before FKs and permits atomic resource swaps', () => {
  for (const [index, fk] of [['workspace_assets_owner_idx', 'workspace_assets_replaces_owner_fk'], ['workspace_lessons_media_owner_idx', 'workspace_assets_lesson_owner_fk'], ['workspace_projects_media_owner_idx', 'workspace_assets_project_owner_fk']]) expect(sql.indexOf(`CREATE UNIQUE INDEX "${index}"`)).toBeLessThan(sql.indexOf(`ADD CONSTRAINT "${fk}"`));
  expect(sql).toContain('UNIQUE("lesson_id","resource_position") DEFERRABLE INITIALLY DEFERRED');
  expect(sql).toContain('CREATE CONSTRAINT TRIGGER workspace_media_positions_guard');
  expect(sql).toContain('resource positions must be contiguous');
});
it('guards lifecycle, retained provenance, pinned captions and derived revisions', () => {
  for (const guard of ['invalid initial media evidence', 'immutable media identity or stale version', 'invalid media transition', 'media evidence is immutable', 'caption source must match selected video', 'caption must follow selected video', 'invalid processed output identity', 'versioned processing output required', 'media revision is derived and monotonic', 'media_revision=media_revision+1, version=version+1', 'workspace_media_retained_truncate_guard']) expect(sql).toContain(guard);
  expect(sql).toContain('ON DELETE restrict');
  const runtime = read('lib/workspace/media/runtime.ts');
  expect(runtime).not.toMatch(/@aws-sdk|fetch\(|getSignedUrl|DATABASE_URL/);
});
