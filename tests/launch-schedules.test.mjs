import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('protected Vercel staging declares no cron jobs and preserves every job route', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.equal(config.crons, undefined, 'Preview must not declare unsupported Hobby schedules');
  for (const route of [
    '/api/internal/workspace/reconcile', '/api/internal/course-payments/reconcile',
    '/api/internal/creator-payouts/reconcile', '/api/internal/creator-bank-validations/reconcile',
    '/api/internal/workspace/media', '/api/internal/workspace/refund-notices',
  ]) assert(existsSync(`app${route}/route.ts`), `${route} implementation must remain available`);
});
