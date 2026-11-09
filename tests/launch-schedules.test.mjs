import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('every financial recovery route has the bounded launch recovery schedule', () => {
  const { crons } = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const jobs = new Map(crons.map(job => [job.path, job.schedule]));
  assert.equal(jobs.size, crons.length, 'No duplicate scheduler invocation declarations');
  for (const [route, schedule] of [
    ['/api/internal/workspace/reconcile', '*/5 * * * *'],
    ['/api/internal/course-payments/reconcile', '*/5 * * * *'],
    ['/api/internal/creator-payouts/reconcile', '* * * * *'],
    ['/api/internal/creator-bank-validations/reconcile', '* * * * *'],
  ]) {
    assert.equal(jobs.get(route), schedule, `${route} must recover without a browser return`);
    assert(existsSync(`app${route}/route.ts`), `${route} must resolve to a deployed route`);
  }
});
