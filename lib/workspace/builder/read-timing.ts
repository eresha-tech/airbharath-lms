import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { classifyWorkspaceRuntime } from '../payments/configuration-core.mjs';

type Phase = 'authentication' | 'transaction' | 'connection_and_begin' | 'owner_lock' | 'order_lock' | 'profile_lock' | 'membership_evidence' | 'grant_evidence' | 'project' | 'lesson';
type Timing = { phases: Partial<Record<Phase, number>> };
const timings = new AsyncLocalStorage<Timing>();

export function recordBuilderReadTime(phase: Phase, started: number) {
  const timing = timings.getStore();
  if (timing) timing.phases[phase] = (timing.phases[phase] || 0) + Math.max(0, Math.round(performance.now() - started));
}

export async function measureBuilderRead<T>(phase: Phase, work: () => PromiseLike<T>): Promise<T> {
  const started = performance.now();
  try { return await work(); } finally { recordBuilderReadTime(phase, started); }
}

// Only the existing protected, authoring-only staging contract enables these diagnostics.
// Never record IDs, URLs, headers, SQL, content, error messages or credentials.
export async function withBuilderReadTiming(request: Request, work: () => Promise<Response>) {
  if (request.method !== 'GET' || process.env.VERCEL_ENV !== 'preview' || classifyWorkspaceRuntime() !== 'staging') return work();
  const timing: Timing = { phases: {} }, started = performance.now(), trace = randomUUID();
  return timings.run(timing, async () => {
    let status = 500;
    try {
      const response = await work();
      status = response.status;
      try { response.headers.set('X-AirBharath-Builder-Read', trace); } catch { /* Immutable responses stay unchanged. */ }
      return response;
    } finally {
      // Diagnostics must never turn a successful read into a failure.
      try { console.info(JSON.stringify({ event: 'workspace_builder_read_timing', trace, status, elapsedMs: Math.round(performance.now() - started), aborted: request.signal.aborted, phases: timing.phases })); } catch { /* Best effort only. */ }
    }
  });
}
