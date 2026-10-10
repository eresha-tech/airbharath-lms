import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
const originalMigrations: Record<string, string> = {
  "0000_regular_silk_fever": "244506bff67e0e4e102593d277f4959d7b6762345ea6d475764700f55bb8fb47",
  "0001_careful_warhawk": "24c2bbabe9a8d16a6f027d09a13004dddea01c21113990a5939a642b0237c232",
  "0002_silky_living_tribunal": "24033fb008c9e085cd515ff9c6321e518a8bb5e8995ef7ce22c19b9a98b7c2ad",
  "0003_lowly_justice": "5e2ada1b77d981fe1e27d321272f7f08fb2c7243067634b57c8213a0e785cc98",
  "0004_dear_shocker": "0bf51a3afa92ba842b517fdf2c85af9fd73bc2827c7c374853cbe3a9199bea82",
  "0005_sharp_grey_gargoyle": "588509617acbb775563f379101f8d5b34534bfbfbe536110682bbb22707f81f8",
  "0006_great_kate_bishop": "0d6b625cca0a51c04d313a53c9a66ccd647927e9efda2959252cc11b2d95a9eb",
  "0007_lucky_wild_pack": "f0312d81ee36aed56aa48ece4bd09cdf218a375e39879d55623ef9ec819f11aa",
  "0008_eager_energizer": "ae6c3b89c04374d642a03f0097e3bc52a3b7c3e1ce6b8f752d7f9625135732ac",
  "0009_normal_baron_zemo": "6dc0436b50fa865ad5410dd2f95d48be569cd176f812abd47c144ad57ea359e5",
  "0010_illegal_toxin": "d806715b9b519bb50eaa3f6f60c9be1b02ea98ebed248a856a91ecd56f30c92e",
  "0011_workspace_coupon_audit_freshness": "92d9e796e3b2136e86f144c4a2ff099d81e6e26c12541999dd95a52e34485ec9",
  "0012_useful_warhawk": "4e59a99a11347779b12c793df406727148ba7b6ef3f42764952f57f733274d97",
  "0013_peaceful_spiral": "42b4fcf2ae41c84e5129f68fee5791283b293a8f576c5d694ac2f25825d39d05"
};
const read = (file: string) => readFileSync(`${process.cwd()}/${file}`, 'utf8');
it('additive 0014 preserves every existing schema object and all 0000–0013 migration hashes', () => {
  const before = JSON.parse(read('drizzle/meta/0013_snapshot.json')), after = JSON.parse(read('drizzle/meta/0014_snapshot.json'));
  expect(after.prevId).toBe(before.id); expect(Object.keys(after.tables).filter(key => !before.tables[key]).sort()).toEqual(['public.workspace_course_drafts', 'public.workspace_creator_profile_details']);
  for (const [name, table] of Object.entries(before.tables)) expect(after.tables[name]).toEqual(table); expect(after.enums).toEqual(before.enums);
  const journal = JSON.parse(read('drizzle/meta/_journal.json')); expect(journal.entries[14].tag).toBe('0014_outgoing_freak');
  for (const entry of journal.entries.slice(0, 14)) {
    const file = `drizzle/${entry.tag}.sql`; expect(createHash('sha256').update(read(file)).digest('hex')).toBe(originalMigrations[entry.tag]);
  }
});
it('migration protects composite ownership, creation idempotency, no deletion and version progression', () => {
  const migration = read('drizzle/0014_outgoing_freak.sql');
  expect(migration.match(/FOREIGN KEY \("creator_profile_id","user_id"\)/g)).toHaveLength(2);
  for (const text of ['workspace_drafts_request_owner_idx', 'workspace_profile_details_owner_idx', 'workspace_drafts_price_check', 'workspace_drafts_json_check', 'Workspace creator content must be retained', 'NEW.version <> OLD.version + 1', 'NEW.user_id IS DISTINCT FROM OLD.user_id', 'NEW.creator_profile_id IS DISTINCT FROM OLD.creator_profile_id', 'NEW.request_key IS DISTINCT FROM OLD.request_key', 'NEW.creation_hash IS DISTINCT FROM OLD.creation_hash']) expect(migration).toContain(text);
  expect(migration).not.toMatch(/DROP TABLE|TRUNCATE|DISABLE TRIGGER|ALTER TABLE "?(?:users|courses|course_authors|orders|enrollments|workspace_creator_profiles|workspace_memberships)"?\s/i);
});
it('only private content tables are mutable; public course and payment surfaces remain isolated', () => {
  const repository = read('lib/workspace/creator/repository.ts'), service = read('lib/workspace/creator/service.ts');
  expect(repository + service).not.toMatch(/fetch\(|Razorpay|posthog|capture\(|insert\(courses\)|update\(users\)|enrollments|courseAuthors|workspacePaidEntitlements/i);
  expect(read('components/workspace/ActivationPreview.tsx')).toContain('Payments not yet enabled');
  expect(read('app/(user)/workspace/(creator)/layout.tsx')).toContain('ph-no-capture');
  for (const file of ['page.tsx', '[id]/page.tsx']) { const page = read(`app/(admin)/admin/workspace/course-drafts/${file}`); expect(page).toContain('getAuthorizedAdminSession'); expect(page).toContain('ph-no-capture'); expect(page).not.toMatch(/<form|Approve|Reject|Publish/); }
});
