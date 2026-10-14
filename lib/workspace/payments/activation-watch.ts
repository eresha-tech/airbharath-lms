type Options = { signal: AbortSignal; http?: typeof fetch; intervalMs?: number; timeoutMs?: number; onUpdate?: (state: 'waiting' | 'retrying') => void };
export type ActivationWatchResult = 'ready' | 'timeout' | 'authentication' | 'cancelled';
export async function waitForWorkspaceActivation({ signal, http = fetch, onUpdate, intervalMs = 2000, timeoutMs = 60_000 }: Options): Promise<ActivationWatchResult> {
  if (signal.aborted) return 'cancelled';
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), timeoutMs);
  const combined = AbortSignal.any([signal, deadline.signal]);
  const pause = () => new Promise<void>(resolve => {
    if (combined.aborted) { resolve(); return; }
    const finish = () => { clearTimeout(delay); combined.removeEventListener('abort', finish); resolve(); };
    const delay = setTimeout(finish, intervalMs);
    combined.addEventListener('abort', finish, { once: true });
  });
  try {
    while (!combined.aborted) {
      try {
        const response = await http('/api/workspace/journey', { cache: 'no-store', signal: AbortSignal.any([combined, AbortSignal.timeout(10_000)]) });
        if (combined.aborted) break;
        if (response.status === 401) return 'authentication';
        const journey = await response.json();
        if (combined.aborted) break;
        if (response.ok && journey?.hasCreatorAccess === true && journey?.hasPaidEntitlement === true) return 'ready';
        onUpdate?.(response.ok ? 'waiting' : 'retrying');
      } catch { if (!combined.aborted) onUpdate?.('retrying'); }
      await pause();
    }
    return signal.aborted ? 'cancelled' : 'timeout';
  } finally { clearTimeout(timer); }
}
