import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const safe = { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'development', DATABASE_ENV: 'development', DATABASE_URL: 'postgresql://synthetic:synthetic@neon.invalid:5433/airbharath_lms' };
for (const [name, extra] of [
  ['production Node', { NODE_ENV: 'production' }],
  ['production database classification', { DATABASE_ENV: 'production' }],
  ['staging', { DATABASE_ENV: 'staging' }],
  ['deployment', { VERCEL: '1' }],
  ['remote database', {}],
  ['wrong local database', { DATABASE_URL: 'postgresql://synthetic:synthetic@localhost:5433/other' }],
  ['wrong local port', { DATABASE_URL: 'postgresql://synthetic:synthetic@localhost:5432/airbharath_lms' }],
]) {
  test(`UAT launcher refuses ${name} before app/worker startup`, () => {
    for (const mode of ['--providers', '--payments-only']) {
    const result = spawnSync(process.execPath, ['scripts/workspace-local-uat.mjs', mode], { env: { ...safe, ...extra }, encoding: 'utf8', timeout: 10_000 });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /preflight refused startup/);
    assert.doesNotMatch(result.stdout, /Test payments\/email enabled|worker ready/);
    assert.doesNotMatch(result.stderr, /synthetic|postgresql:\/\//);
    }
  });
}
test('standalone UAT worker is disabled without its explicit flag', () => {
  const result = spawnSync(process.execPath, ['scripts/workspace-local-uat-worker.cjs'], { env: safe, encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.status, 1); assert.match(result.stderr, /worker refused startup/);
});
test('standalone UAT worker refuses production even with misplaced flags', () => {
  const result = spawnSync(process.execPath, ['scripts/workspace-local-uat-worker.cjs'], { env: { ...safe, NODE_ENV: 'production', WORKSPACE_LOCAL_UAT_OTP_ENABLED: 'true', WORKSPACE_LOCAL_UAT_FINANCIAL_WORKER_ENABLED: 'true' }, encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.status, 1); assert.match(result.stderr, /worker refused startup/); assert.doesNotMatch(result.stdout, /worker ready/);
});

test('UAT launcher rejects mixed broad and payment-only modes before startup', () => {
  const result=spawnSync(process.execPath,['scripts/workspace-local-uat.mjs','--providers','--payments-only'],{env:safe,encoding:'utf8',timeout:10000});
  assert.equal(result.status,1);assert.match(result.stderr,/uat_invalid_arguments/);assert.doesNotMatch(result.stdout,/worker ready|Local UAT:/);
});
