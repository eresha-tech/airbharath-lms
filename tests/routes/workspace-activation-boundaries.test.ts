import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
const read = (file: string) => readFileSync(`${process.cwd()}/${file}`, 'utf8');
const migration = read('drizzle/0013_peaceful_spiral.sql');
it('extends the verified 0012 head additively without changing legacy tables or applied financial migration', () => {
  expect(createHash('sha256').update(read('drizzle/0012_useful_warhawk.sql')).digest('hex')).toBe('4e59a99a11347779b12c793df406727148ba7b6ef3f42764952f57f733274d97');
  const before = JSON.parse(read('drizzle/meta/0012_snapshot.json')), after = JSON.parse(read('drizzle/meta/0013_snapshot.json'));
  expect(after.prevId).toBe(before.id); expect(Object.keys(after.tables).filter(name => !before.tables[name]).sort()).toEqual(['public.workspace_creator_profiles', 'public.workspace_memberships']);
  for (const [name, table] of Object.entries(before.tables)) if (name !== 'public.workspace_membership_orders') expect(after.tables[name]).toEqual(table);
  expect(after.enums).toEqual(before.enums);
  expect(JSON.parse(read('drizzle/meta/_journal.json')).entries[13].tag).toBe('0013_peaceful_spiral');
  expect(migration).not.toMatch(/DROP TABLE|TRUNCATE|DISABLE TRIGGER|btree_gist|ALTER TABLE "?(?:users|orders|coupons|enrollments)"?\s/i);
  expect(migration.indexOf('CREATE UNIQUE INDEX "workspace_creator_profiles_owner_idx"')).toBeLessThan(migration.indexOf('FOREIGN KEY ("creator_profile_id","user_id")'));
  expect(migration.indexOf('CREATE UNIQUE INDEX "workspace_orders_owner_idx"')).toBeLessThan(migration.indexOf('FOREIGN KEY ("membership_order_id","user_id")'));
});
it('adds immutable term/identity history, payment/context checks, overlap serialization and bidirectional completion', () => {
  for (const text of ['workspace_memberships_order_idx', 'workspace_creator_profiles_user_idx', 'Membership terms and fulfillment history are immutable', 'Creator identity history cannot be deleted', 'Order and immutable membership fulfillment must commit together', 'Creator identity must commit with paid membership fulfillment', 'capture_time_source IS DISTINCT FROM', 'make_interval(months=>o.duration_months)', "AT TIME ZONE 'Asia/Kolkata'", 'ends_at>NEW.fulfilled_at', 'OLD.fulfilled_at IS NOT NULL', "OLD.status='suspended'", 'FOR UPDATE']) expect(migration).toContain(text);
  expect(migration.match(/DEFERRABLE INITIALLY DEFERRED/g)).toHaveLength(3);
  expect(migration).toContain("o.activation_state<>'pending_activation'");
  expect(migration).toContain("status='redeemed'");
});
it('preserves public disabled checkout, private activation worker, role separation, privacy and legacy isolation', () => {
  expect(read('components/workspace/ActivationPreview.tsx')).toContain('Payment activation coming next');
  const runtime = read('lib/workspace/activation/runtime.ts'); expect(runtime).toContain("import 'server-only'"); expect(runtime).toContain("process.env.NODE_ENV === 'production'");
  const service = read('lib/workspace/activation/service.ts'), repository = read('lib/workspace/activation/repository.ts');
  expect(service + repository).not.toMatch(/fetch\(|new Razorpay|createRazorpay|posthog|update\(users\)|enrollments|courseAuthors|paid_entitlement/i);
  const member = read('app/(user)/workspace/member/page.tsx'), admin = read('app/(admin)/admin/workspace/creators/page.tsx');
  expect(member).toContain('getWorkspaceUser'); expect(admin).toContain('getAuthorizedAdminSession');
  for (const page of [member, admin]) { expect(page).toContain('ph-no-capture'); expect(page).not.toMatch(/posthog|capture\(|use server|<form/); }
  expect(member).not.toMatch(/winningPaymentId|providerPaymentId|couponCode|refundedPaise/);
  expect(admin).not.toMatch(/Mark Paid|Grant Access|Activate creator|runWorkspaceActivationRecovery/);
});
