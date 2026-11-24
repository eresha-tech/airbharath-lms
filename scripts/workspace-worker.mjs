// Background loop used by the separate Node entry point. Existing authenticated
// handlers own durable work, leases, retries and financial effects.

const paths = new Set([
  '/api/internal/workspace/reconcile', '/api/internal/course-payments/reconcile',
  '/api/internal/creator-payouts/reconcile', '/api/internal/creator-bank-validations/reconcile',
  '/api/internal/workspace/media', '/api/internal/workspace/refund-notices',
]);
export function workerConfiguration(env = process.env) {
  const base = new URL(env.WORKER_APP_URL || 'http://127.0.0.1:3000');
  if (env.WORKSPACE_WORKER_ENABLED !== 'true' || !env.CRON_SECRET || env.CRON_SECRET.length < 32 ||
    base.protocol !== 'http:' || base.hostname !== '127.0.0.1' || base.username || base.password ||
    base.pathname !== '/' || base.search || base.hash) throw new Error('Worker requires explicit enablement, loopback target and existing cron authorization.');
  return {base, secret: env.CRON_SECRET};
}
export function workerSchedule(crons) {
  if (!Array.isArray(crons) || crons.length !== paths.size || new Set(crons.map(c => c.path)).size !== paths.size) throw new Error('Unsupported worker schedule.');
  return crons.map(c => {
    if (!paths.has(c.path) || !['* * * * *', '*/5 * * * *'].includes(c.schedule)) throw new Error('Unsupported worker schedule.');
    return {path: c.path, intervalMs: c.schedule === '* * * * *' ? 60000 : 300000};
  });
}
export function createWorker(config, schedule, transport = fetch, report = console.log) {
  const jobs = schedule.map(job => ({...job, next: 0, running: null, controller: null}));
  let stopped = false;
  function poll(now = Date.now()) {
    if (stopped) return;
    for (const job of jobs) {
      if (job.running || now < job.next) continue;
      job.next = now + job.intervalMs;
      job.controller = new AbortController();
      const signal = AbortSignal.any([job.controller.signal, AbortSignal.timeout(310000)]);
      job.running = Promise.resolve().then(async () => {
        try {
          const response = await transport(new URL(job.path, config.base), {method: 'GET', headers: {authorization: `Bearer ${config.secret}`}, signal, redirect: 'error'});
          await response.body?.cancel();
          report(JSON.stringify({worker: job.path, status: response.status}));
        } catch { report(JSON.stringify({worker: job.path, status: 'unavailable'})); }
      }).finally(() => { job.running = null; job.controller = null; });
    }
  }
  async function stop() {
    stopped = true;
    for (const job of jobs) job.controller?.abort();
    await Promise.all(jobs.map(job => job.running));
  }
  return {poll, stop};
}
