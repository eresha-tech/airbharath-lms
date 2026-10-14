import { createRequire } from 'node:module';
import { expect, it } from 'vitest';

const { compareSnapshots } = createRequire(import.meta.url)('../../scripts/audits/workspace-f6-guard-application-verification.cjs');
const approved = 'f34c190f4e7877d5b0f3fab03c89874b825ef0f2cfebca520c1dc40adfbd5bd2';
const targets = Array.from({ length: 21 }, (_, i) => `workspace_synthetic_${i}`);
const before = () => ({
  identity: { database: 'synthetic' },
  ledger: Array.from({ length: 30 }, (_, i) => ({ id: i + 1, hash: `old-${i}`, time: `${i}` })),
  functions: [{ schema: 'public', name: 'existing_guard', definition: 'original' }],
  triggers: [{ schema: 'public', name: 'existing_trigger', definition: 'original' }],
  schemas: [], objects: [], columns: [], constraints: [], indexes: [], enums: [],
  extensions: [], views: [], policies: [], collation: {}, runtimePrivileges: [],
  counts: [{ key: 'public.workspace_memberships', count: '2' }, { key: 'drizzle.__drizzle_migrations', count: '30' }],
  fingerprints: {
    'public.workspace_memberships': [{ hash: 'membership-original', n: 2 }],
    'drizzle.__drizzle_migrations': [{ hash: 'ledger-original', n: 30 }],
  },
});
const after = () => {
  const value = before();
  return {
    ...value,
    ledger: [...value.ledger, { id: 31, hash: approved, time: '31' }],
    functions: [...value.functions, { schema: 'public', name: 'workspace_retained_history_reject_truncate', definition: 'approved' }],
    triggers: [...value.triggers, ...targets.map(table => ({ schema: 'public', name: `${table}_retained_truncate_guard`, definition: 'approved' }))],
    counts: [{ key: 'public.workspace_memberships', count: '2' }, { key: 'drizzle.__drizzle_migrations', count: '31' }],
    fingerprints: { ...value.fingerprints, 'drizzle.__drizzle_migrations': [{ hash: 'ledger-original', n: 30 }, { hash: 'ledger-new', n: 1 }] },
    lastLedgerRowFingerprint: 'ledger-new',
  };
};

it('accepts exactly the approved additive guard delta and one ledger row', () => {
  expect(compareSnapshots(before(), after(), targets)).toMatchObject({ originalRowsUnchanged: true, previousLedgerRowsUnchanged: true, newFunctions: 1, newTriggers: 21 });
});

it('rejects an original membership or ledger mutation even when total counts still match', () => {
  const rows = after();
  rows.fingerprints['public.workspace_memberships'][0].hash = 'rewritten';
  expect(() => compareSnapshots(before(), rows, targets)).toThrow('Original row fingerprint changed');
  const ledger = after();
  ledger.ledger[0].hash = 'rewritten';
  expect(() => compareSnapshots(before(), ledger, targets)).toThrow('Existing ledger rows changed');
});

it('rejects unexpected schema changes and alterations to existing protection', () => {
  const trigger = after();
  trigger.triggers[0].definition = 'weakened';
  expect(() => compareSnapshots(before(), trigger, targets)).toThrow('Existing trigger definitions changed');
  const extra = after();
  extra.functions.push({ schema: 'public', name: 'unapproved_function', definition: 'unexpected' });
  expect(() => compareSnapshots(before(), extra, targets)).toThrow('Existing function definitions/privileges changed');
});
