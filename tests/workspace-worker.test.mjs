import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workerConfiguration, workerSchedule, createWorker, loadWorkerSchedule, DEFAULT_WORKER_CRONS} from '../scripts/workspace-worker.mjs';
const env = {WORKSPACE_WORKER_ENABLED: 'true', CRON_SECRET: 'synthetic-worker-authorization-32-characters'};
// Exercise the unchanged standalone worker with a synthetic schedule. Vercel
// Preview deliberately has no scheduler declarations and never starts a worker.
const schedule = workerSchedule([
  {path: '/api/internal/workspace/reconcile', schedule: '*/5 * * * *'},
  {path: '/api/internal/course-payments/reconcile', schedule: '*/5 * * * *'},
  {path: '/api/internal/creator-payouts/reconcile', schedule: '* * * * *'},
  {path: '/api/internal/creator-bank-validations/reconcile', schedule: '* * * * *'},
  {path: '/api/internal/workspace/media', schedule: '* * * * *'},
  {path: '/api/internal/workspace/refund-notices', schedule: '*/5 * * * *'},
]);
const flush = () => new Promise(resolve => setImmediate(resolve));
test('worker refuses missing authorization, external destinations and malformed schedules', () => {
  assert.throws(() => workerConfiguration({}));
  assert.throws(() => workerConfiguration({...env, CRON_SECRET: 'short'}));
  for (const base of ['https://127.0.0.1', 'http://example.invalid', 'http://localhost', 'http://user@127.0.0.1', 'http://127.0.0.1/path', 'http://127.0.0.1/?query=1']) assert.throws(() => workerConfiguration({...env, WORKER_APP_URL: base}));
  assert.throws(() => workerSchedule([]));
  assert.throws(() => workerSchedule(schedule));
  assert.equal(workerConfiguration({...env, NODE_ENV: 'production'}).base.hostname, '127.0.0.1');
});
test('worker loads dedicated schedule independently of vercel.json with exact 1m and 5m intervals', () => {
  const loaded = loadWorkerSchedule({});
  assert.equal(loaded.length, 6);
  assert.deepEqual(loaded.map(j => j.path).sort(), [
    '/api/internal/course-payments/reconcile',
    '/api/internal/creator-bank-validations/reconcile',
    '/api/internal/creator-payouts/reconcile',
    '/api/internal/workspace/media',
    '/api/internal/workspace/reconcile',
    '/api/internal/workspace/refund-notices',
  ]);
  const oneMinuteJobs = loaded.filter(j => j.intervalMs === 60000).map(j => j.path);
  assert.deepEqual(oneMinuteJobs.sort(), [
    '/api/internal/creator-bank-validations/reconcile',
    '/api/internal/creator-payouts/reconcile',
    '/api/internal/workspace/media',
  ]);
  const fiveMinuteJobs = loaded.filter(j => j.intervalMs === 300000).map(j => j.path);
  assert.deepEqual(fiveMinuteJobs.sort(), [
    '/api/internal/course-payments/reconcile',
    '/api/internal/workspace/reconcile',
    '/api/internal/workspace/refund-notices',
  ]);
  assert.deepEqual(workerSchedule(), loaded);
  assert.deepEqual(workerSchedule(DEFAULT_WORKER_CRONS), loaded);
});
test('loadWorkerSchedule validates custom schedule and fails safely on invalid input', () => {
  const custom = loadWorkerSchedule({
    WORKER_SCHEDULE_JSON: JSON.stringify(DEFAULT_WORKER_CRONS),
  });
  assert.equal(custom.length, 6);
  assert.throws(() => loadWorkerSchedule({ WORKER_SCHEDULE_JSON: 'not-json' }), /Unsupported worker schedule/);
  assert.throws(() => loadWorkerSchedule({ WORKER_SCHEDULE_JSON: '' }), /Unsupported worker schedule/);
  assert.throws(() => loadWorkerSchedule({ WORKER_SCHEDULE_JSON: '   ' }), /Unsupported worker schedule/);
  assert.throws(() => loadWorkerSchedule({ WORKER_SCHEDULE_JSON: '[]' }), /Unsupported worker schedule/);
  assert.throws(() => loadWorkerSchedule({ WORKER_SCHEDULE_JSON: '{}' }), /Unsupported worker schedule/);
  assert.throws(() => loadWorkerSchedule({ WORKER_SCHEDULE_JSON: 'null' }), /Unsupported worker schedule/);
  assert.throws(() => loadWorkerSchedule({
    WORKER_SCHEDULE_JSON: JSON.stringify([{ path: '/api/internal/workspace/media', schedule: '* * * * *' }]),
  }), /Unsupported worker schedule/);
  assert.throws(() => loadWorkerSchedule({
    WORKER_SCHEDULE_JSON: JSON.stringify(DEFAULT_WORKER_CRONS.map(c => ({ ...c, schedule: '*/10 * * * *' }))),
  }), /Unsupported worker schedule/);
  assert.throws(() => workerSchedule(null), /Unsupported worker schedule/);
  assert.throws(() => workerSchedule(123), /Unsupported worker schedule/);
});
test('worker reproduces one/five minute intervals, contains failures and never logs authorization', async () => {
  const calls = [], logs = [];
  const worker = createWorker(workerConfiguration(env), schedule, async (url, init) => {
    assert.equal(url.hostname, '127.0.0.1'); assert.equal(init.redirect, 'error');
    assert.equal(init.headers.authorization, 'Bearer '+env.CRON_SECRET);
    calls.push(url.pathname); return new Response(null, {status: 503});
  }, line => logs.push(line));
  worker.poll(0); await flush(); assert.equal(calls.length, 6);
  worker.poll(59999); await flush(); assert.equal(calls.length, 6);
  worker.poll(60000); await flush(); assert.equal(calls.length, 9);
  worker.poll(300000); await flush(); assert.equal(calls.length, 15);
  assert(!logs.join('').includes(env.CRON_SECRET));
  await worker.stop(); worker.poll(600000); assert.equal(calls.length, 15);
});
test('worker never overlaps its pending invocation and aborts on process shutdown', async () => {
  let calls = 0, aborted = 0;
  const worker = createWorker(workerConfiguration(env), schedule, async (_url, init) => {
    calls++;
    await new Promise((resolve, reject) => init.signal.addEventListener('abort', () => {aborted++; reject(new Error('synthetic abort'));}, {once:true}));
    return new Response();
  }, () => {});
  worker.poll(0); await flush(); worker.poll(600000); await flush();
  assert.equal(calls, 6); await worker.stop(); assert.equal(aborted, 6);
});
test('synchronous transport failure cannot permanently suppress future retries', async () => {
  let calls = 0;
  const worker = createWorker(workerConfiguration(env), schedule, () => {calls++; throw new Error('synthetic transport unavailable');}, () => {});
  worker.poll(0); await flush(); worker.poll(300000); await flush(); assert.equal(calls, 12); await worker.stop();
});
