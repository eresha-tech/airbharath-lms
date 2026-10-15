import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('creates composite financial ownership keys before their foreign keys', () => {
  const sql = readFileSync('drizzle/0012_useful_warhawk.sql', 'utf8');
  for (const [index, table] of [['workspace_orders_owner_coupon_idx', 'workspace_coupon_redemptions'], ['workspace_orders_owner_provider_idx', 'workspace_payment_attempts']]) {
    expect(sql.indexOf(`CREATE UNIQUE INDEX "${index}"`)).toBeLessThan(sql.indexOf(`ALTER TABLE "${table}" ADD CONSTRAINT "${table}_membership_order_id`));
  }
});
