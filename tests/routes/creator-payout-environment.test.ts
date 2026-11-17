import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { chmodSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { db } from '@/lib/db';
import { payoutConfiguration, requirePayoutExecution } from '@/lib/creator-payments/razorpayx/config';
import { razorpayXPayoutAdapter } from '@/lib/creator-payments/razorpayx/adapter';
import { verifyPayoutTestDatabase } from '@/lib/creator-payments/razorpayx/test-isolation';
import { settlementService } from '@/lib/creator-payments/settlement';
import { preparePayoutJob, payoutControl, type PayoutTx } from '@/lib/creator-payments/razorpayx/service';
import { runPayoutWorker } from '@/lib/creator-payments/razorpayx/worker';
import { receivePayoutWebhook } from '@/lib/creator-payments/razorpayx/webhook';
import { requestBankValidation } from '@/lib/creator-payments/bank-validation/service';
import { runBankValidationWorker } from '@/lib/creator-payments/bank-validation/worker';
import { bankValidationConfiguration } from '@/lib/creator-payments/bank-validation/config';
import { payoutTestFixture, testHash } from '../fixtures/payout-test-scope';
const values = { RAZORPAYX_KEY_ID: 'rzp_test_SYNTHETIC', RAZORPAYX_KEY_SECRET: 'synthetic-only-secret', RAZORPAYX_MERCHANT_ACCOUNT_ID: 'acc_synthetic', RAZORPAYX_FUNDING_ACCOUNT_NUMBER: '000000123456', RAZORPAYX_WEBHOOK_SECRET: 'synthetic-webhook-secret-32-characters', RAZORPAYX_TRANSFER_MODE: 'NEFT', CREATOR_RAZORPAYX_ENABLED: 'true' };
let fixture: ReturnType<typeof payoutTestFixture>;
beforeEach(() => { fixture = payoutTestFixture(values); });
afterEach(() => { fixture.dispose(); });
it.each([
 { NODE_ENV: 'production', DATABASE_ENV: 'production' },
 { NODE_ENV: 'production' }, { DATABASE_ENV: 'production' }, { DATABASE_ENV: 'staging' },
 { NODE_ENV: undefined }, { DATABASE_ENV: 'development' },
 { VERCEL_ENV: 'production' }, { VERCEL_TARGET_ENV: 'production' },
 { VERCEL: '1', VERCEL_ENV: undefined },
 { VERCEL: '1', VERCEL_ENV: 'preview', NODE_ENV: 'production' },
])('rejects Test configuration in incompatible classification %j before transport', flags => {
 const transport = vi.fn<typeof fetch>();
 expect(() => razorpayXPayoutAdapter(payoutConfiguration({ ...fixture.env, ...flags }), transport)).toThrow();
 expect(transport).not.toHaveBeenCalled();
});
it.each([
 { NODE_ENV: 'test' }, { NODE_ENV: 'development' },
 { VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'preview' },
])('allows explicitly isolated nonproduction configuration %j only after actual database evidence', async flags => {
 const config = payoutConfiguration({ ...fixture.env, ...flags }), transport = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ entity: 'collection', items: [] }));
 const adapter = razorpayXPayoutAdapter(config, transport);
 await expect(adapter.inspect()).rejects.toThrow();expect(transport).not.toHaveBeenCalled();
 await verifyPayoutTestDatabase(fixture.database, config);await adapter.inspect();expect(transport).toHaveBeenCalledTimes(3);
});
it.each([
 { RAZORPAYX_TEST_AUTHORIZED: 'false' }, { RAZORPAYX_TEST_SCOPE_FILE: undefined },
 { RAZORPAYX_LIVE_EXECUTION_AUTHORIZED: 'true' }, { RAZORPAYX_LIVE_PERMISSION_REVIEWED: 'true' },
 { RAZORPAY_KEY_ID: 'rzp_live_SYNTHETIC' }, { COURSE_RAZORPAY_ACCOUNT_ID: 'acc_different' },
 { RAZORPAYX_KEY_ID: 'rzp_test_OTHER' }, { RAZORPAYX_KEY_SECRET: 'different-synthetic-secret' },
 { RAZORPAYX_MERCHANT_ACCOUNT_ID: 'acc_otheraccount' }, { RAZORPAYX_FUNDING_ACCOUNT_NUMBER: '000000999999' },
 { DATABASE_URL: 'postgresql://synthetic:synthetic@127.0.0.1:55439/airbharath_test_other' },
 { POSTGRES_URL: 'postgresql://synthetic:synthetic@127.0.0.1:55439/airbharath_test_other' },
])('rejects missing authorization and unapproved or mixed scope %j', flags => {
 expect(() => payoutConfiguration({ ...fixture.env, ...flags })).toThrow();
});
it.each([
 { expiresAt: new Date(0).toISOString() }, { expiresAt: 'invalid' },
 { expiresAt: new Date(Date.now() + 86400000).toISOString() }, { version: 2 }, { runId: 'unapproved' },
 { credentialHash: '0'.repeat(64) }, { merchantId: 'acc_wrong' }, { fundingFingerprint: '0'.repeat(64) },
 { databaseName: 'historical_production' }, { databaseOid: '' }, { systemIdentifier: '' },
])('rejects invalid or expired independent run evidence %j', changes => {
 fixture.write(changes);expect(() => payoutConfiguration(fixture.env)).toThrow();
});
it('refuses public, symlinked, malformed and oversized authorization files', () => {
 chmodSync(fixture.env.RAZORPAYX_TEST_SCOPE_FILE, 0o644);expect(() => payoutConfiguration(fixture.env)).toThrow();
 chmodSync(fixture.env.RAZORPAYX_TEST_SCOPE_FILE, 0o600);const link = join(fixture.directory, 'link.json');symlinkSync(fixture.env.RAZORPAYX_TEST_SCOPE_FILE, link);
 expect(() => payoutConfiguration({ ...fixture.env, RAZORPAYX_TEST_SCOPE_FILE: link })).toThrow();
 writeFileSync(fixture.env.RAZORPAYX_TEST_SCOPE_FILE, 'invalid');expect(() => payoutConfiguration(fixture.env)).toThrow();
 writeFileSync(fixture.env.RAZORPAYX_TEST_SCOPE_FILE, ' '.repeat(8193));expect(() => payoutConfiguration(fixture.env)).toThrow();
 fixture.write();chmodSync(fixture.directory, 0o755);expect(() => payoutConfiguration(fixture.env)).toThrow();
});
it.each(['localhost', 'db.example.com'])('rejects nonliteral/local-only test target %s even if its URL hash was approved', host => {
 const url = fixture.env.DATABASE_URL.replace('127.0.0.1', host);fixture.write({ databaseUrlHash: testHash(url) });
 expect(() => payoutConfiguration({ ...fixture.env, DATABASE_URL: url })).toThrow();
});
it.each([
 { database_name: 'production' }, { database_user: 'other' }, { database_oid: '16385' },
 { system_identifier: '9876543210987654321' }, { address: '192.0.2.1' }, { port: 5432 },
])('rejects a different actual database identity %j before HTTP', async change => {
 const config = payoutConfiguration(fixture.env), transport = vi.fn<typeof fetch>();
 const database = { execute: vi.fn().mockResolvedValue([{ ...fixture.row, ...change }]) } as unknown as Pick<typeof db, 'execute'>;
 await expect(verifyPayoutTestDatabase(database, config)).rejects.toThrow();
 await expect(razorpayXPayoutAdapter(config, transport).inspect()).rejects.toThrow();expect(transport).not.toHaveBeenCalled();
});
it('clears previous proof after identity failure and rejects missing/duplicate rows or probe errors', async () => {
 const config = payoutConfiguration(fixture.env), transport = vi.fn<typeof fetch>();
 await verifyPayoutTestDatabase(fixture.database, config);
 for (const rows of [[], [fixture.row, fixture.row]]) {
  await expect(verifyPayoutTestDatabase({ execute: vi.fn().mockResolvedValue(rows) } as unknown as Pick<typeof db, 'execute'>, config)).rejects.toThrow();
 }
 await expect(verifyPayoutTestDatabase({ execute: vi.fn().mockRejectedValue(Error('private database detail')) } as unknown as Pick<typeof db, 'execute'>, config)).rejects.toThrow('Dedicated isolated');
 await expect(razorpayXPayoutAdapter(config, transport).inspect()).rejects.toThrow();expect(transport).not.toHaveBeenCalled();
});
it('requires current scope evidence for every provider request and refuses mismatched funding before POST', async () => {
 const config = payoutConfiguration(fixture.env), transport = vi.fn<typeof fetch>();
 await verifyPayoutTestDatabase(fixture.database, config);
 const adapter = razorpayXPayoutAdapter(config, transport);
 await expect(adapter.create({ account_number: '000000999999', fund_account_id: 'fa_synthetic', amount: 100, currency: 'INR', mode: 'NEFT', purpose: 'payout', queue_if_low_balance: true, reference_id: 'synthetic', narration: 'AirBharath Creator' }, 'synthetic-key')).rejects.toThrow('funding account mismatch');
 vi.useFakeTimers();try { vi.advanceTimersByTime(3600001);await expect(adapter.inspect()).rejects.toThrow(); } finally { vi.useRealTimers(); }
 expect(transport).not.toHaveBeenCalled();expect(Object.isFrozen(config)).toBe(true);
 await expect(razorpayXPayoutAdapter({ ...config }, transport).inspect()).rejects.toThrow();
});
it.each(['prepare', 'control', 'worker', 'webhook', 'bank-request', 'bank-worker'])('blocks %s before financial mutation when the actual database is unverified', async entry => {
 const config = payoutConfiguration(fixture.env), transport = vi.fn<typeof fetch>();
 const execute = vi.fn().mockResolvedValue([]), transaction = vi.fn(), insert = vi.fn(), select = vi.fn();
 const database = { execute, transaction, insert, select } as unknown as typeof db;
 const bankConfig = bankValidationConfiguration({ ...fixture.env, CREATOR_BANK_VALIDATION_TRANSPORT: 'synthetic', RAZORPAYX_FAV_AMOUNT_PAISE: '100', RAZORPAYX_FAV_METHOD: 'pennydrop' });
 const action = () => {
  if (entry === 'prepare') return preparePayoutJob(database as unknown as PayoutTx, 'synthetic', 'test:acc_synthetic', config);
  if (entry === 'control') return payoutControl('synthetic', { action: 'authorize_razorpayx', requestKey: 'synthetic', creatorId: 'synthetic' }, database, config);
  if (entry === 'worker') return runPayoutWorker(database, config, razorpayXPayoutAdapter(config, transport));
  if (entry === 'webhook') return receivePayoutWebhook(new Request('https://example.test', { method: 'POST', body: '{}' }), database, config);
  if (entry === 'bank-request') return requestBankValidation(database as unknown as PayoutTx, 'synthetic', 'synthetic', 'synthetic', bankConfig);
  return runBankValidationWorker(database, bankConfig);
 };
 await expect(action()).rejects.toThrow('Dedicated isolated');expect(execute).toHaveBeenCalledOnce();
 expect(transaction).not.toHaveBeenCalled();expect(insert).not.toHaveBeenCalled();expect(select).not.toHaveBeenCalled();expect(transport).not.toHaveBeenCalled();
});
it('preserves legitimate Live configuration and refuses Test flags in it without any database probe', async () => {
 const env = { ...values, NODE_ENV: 'production', DATABASE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'production', RAZORPAYX_KEY_ID: 'rzp_live_SYNTHETIC', RAZORPAYX_LIVE_EXECUTION_AUTHORIZED: 'true', RAZORPAYX_LIVE_PERMISSION_REVIEWED: 'true' };
 const config = payoutConfiguration(env), execute = vi.fn();expect(requirePayoutExecution(config)).toBe(config);
 await verifyPayoutTestDatabase({ execute } as unknown as Pick<typeof db, 'execute'>, config);expect(execute).not.toHaveBeenCalled();
 for (const flags of [{ RAZORPAYX_TEST_AUTHORIZED: 'true' }, { RAZORPAYX_TEST_SCOPE_FILE: fixture.env.RAZORPAYX_TEST_SCOPE_FILE }, { VERCEL_ENV: 'preview' }, { VERCEL_TARGET_ENV: 'preview' }, { DATABASE_ENV: 'test' }]) expect(() => payoutConfiguration({ ...env, ...flags })).toThrow();
});

it('rejects settlement approval before inserting a reservation into an unverified database', async () => {
 for (const [key, value] of Object.entries(fixture.env)) vi.stubEnv(key, value);
 vi.stubEnv('CREATOR_BANK_SETTLEMENT_ENABLED', 'true');
 const actor = '11111111-1111-4111-8111-111111111111', creator = '22222222-2222-4222-8222-222222222222';
 const insert = vi.fn(), execute = vi.fn().mockResolvedValue([]), payee = vi.fn();
 const tx = { execute, insert, select: () => ({ from: () => ({ where: () => ({ for: async () => [{ id: actor, role: 'admin' }] }) }) }),
  query: { workspaceCreatorProfiles: { findFirst: async () => ({ userId: creator }) }, creatorFinanceEvents: { findFirst: async () => undefined }, creatorPayees: { findFirst: payee } } };
 const database = { transaction: async (operation: (transaction: typeof tx) => unknown) => operation(tx) } as unknown as typeof db;
 await expect(settlementService(database, 'test:acc_synthetic').execute(actor, { action: 'approve_payout', requestKey: actor, creatorId: creator, entityId: actor, amountPaise: 100, evidence: 'Synthetic independent settlement approval' })).rejects.toThrow('Dedicated isolated');
 expect(execute).toHaveBeenCalledOnce();expect(insert).not.toHaveBeenCalled();expect(payee).not.toHaveBeenCalled();
});

it('rejects a mismatched key classification even on a directly injected adapter configuration', async () => {
 const config = payoutConfiguration(fixture.env), transport = vi.fn<typeof fetch>();
 await expect(razorpayXPayoutAdapter({ ...config, mode: 'live' }, transport).inspect()).rejects.toThrow();
 expect(transport).not.toHaveBeenCalled();
});

it.each(['NODE_ENV', 'DATABASE_ENV', 'VERCEL_ENV', 'VERCEL_TARGET_ENV'])('does not let an explicit environment object conceal actual production %s', async key => {
 const config = payoutConfiguration(fixture.env), transport = vi.fn<typeof fetch>();
 await verifyPayoutTestDatabase(fixture.database, config);
 vi.stubEnv(key, 'production');
 expect(() => payoutConfiguration(fixture.env)).toThrow();
 await expect(razorpayXPayoutAdapter(config, transport).inspect()).rejects.toThrow();
 expect(transport).not.toHaveBeenCalled();
});
