import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {workerConfiguration, workerSchedule, createWorker} from '../scripts/workspace-worker.mjs';
const env = {WORKSPACE_WORKER_ENABLED: 'true', CRON_SECRET: 'synthetic-worker-authorization-32-characters'};
const schedule = workerSchedule(JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url))).crons);
const flush = () => new Promise(resolve => setImmediate(resolve));
test('worker refuses missing authorization, external destinations and malformed schedules', () => {
  assert.throws(() => workerConfiguration({}));
  assert.throws(() => workerConfiguration({...env, CRON_SECRET: 'short'}));
  for (const base of ['https://127.0.0.1', 'http://example.invalid', 'http://localhost', 'http://user@127.0.0.1', 'http://127.0.0.1/path', 'http://127.0.0.1/?query=1']) assert.throws(() => workerConfiguration({...env, WORKER_APP_URL: base}));
  assert.throws(() => workerSchedule([]));
  assert.throws(() => workerSchedule(schedule));
  assert.equal(workerConfiguration({...env, NODE_ENV: 'production'}).base.hostname, '127.0.0.1');
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
