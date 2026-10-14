import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { waitForWorkspaceActivation } from '@/lib/workspace/payments/activation-watch';
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); });
afterEach(() => vi.useRealTimers());
const response = (hasCreatorAccess: boolean, hasPaidEntitlement = hasCreatorAccess) => new Response(JSON.stringify({ hasCreatorAccess, hasPaidEntitlement }));
it('automatically observes delayed webhook fulfillment instead of leaving the first pending reply on screen', async () => {
  const http = vi.fn().mockResolvedValueOnce(response(false)).mockResolvedValueOnce(response(true));
  const result = waitForWorkspaceActivation({ signal: new AbortController().signal, http, intervalMs: 2000, timeoutMs: 6000 });
  await vi.advanceTimersByTimeAsync(2000);
  expect(await result).toBe('ready'); expect(http).toHaveBeenCalledTimes(2);
  expect(http.mock.calls[0][1].cache).toBe('no-store');
});
it('returns immediately when persisted paid Creator access is already ready', async () => {
  const http = vi.fn().mockResolvedValue(response(true));
  expect(await waitForWorkspaceActivation({ signal: new AbortController().signal, http })).toBe('ready');
  expect(http).toHaveBeenCalledTimes(1);
});
it('never treats capture/callback or partial entitlement as fulfilled paid access and stops at its deadline', async () => {
  const http = vi.fn().mockResolvedValue(response(true, false));
  const result = waitForWorkspaceActivation({ signal: new AbortController().signal, http, intervalMs: 2000, timeoutMs: 5000 });
  await vi.advanceTimersByTimeAsync(5000);
  expect(await result).toBe('timeout'); expect(http).toHaveBeenCalledTimes(3);
});
it('retries a transient read failure without repeating confirmation, order creation or Checkout', async () => {
  const http = vi.fn().mockRejectedValueOnce(Error('temporary')).mockResolvedValueOnce(response(true));
  const result = waitForWorkspaceActivation({ signal: new AbortController().signal, http, intervalMs: 2000 });
  await vi.advanceTimersByTimeAsync(2000); expect(await result).toBe('ready');
  expect(http.mock.calls.every(([path]) => path === '/api/workspace/journey')).toBe(true);
});
it('stops on expired authentication without implying paid access', async () => {
  const http = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }));
  expect(await waitForWorkspaceActivation({ signal: new AbortController().signal, http })).toBe('authentication');
  expect(http).toHaveBeenCalledTimes(1);
});
it('cancels on unmount and does not keep making status requests', async () => {
  const controller = new AbortController(), http = vi.fn().mockResolvedValue(response(false));
  const result = waitForWorkspaceActivation({ signal: controller.signal, http, intervalMs: 2000 });
  await vi.advanceTimersByTimeAsync(0); controller.abort();
  expect(await result).toBe('cancelled'); await vi.advanceTimersByTimeAsync(60_000);
  expect(http).toHaveBeenCalledTimes(1);
});
it('never accepts an unsuccessful API response even if its body contains entitlement flags', async () => {
  const http = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ hasCreatorAccess: true, hasPaidEntitlement: true }), { status: 503 })).mockResolvedValueOnce(response(true));
  const result = waitForWorkspaceActivation({ signal: new AbortController().signal, http, intervalMs: 2000 });
  await vi.advanceTimersByTimeAsync(2000); expect(await result).toBe('ready'); expect(http).toHaveBeenCalledTimes(2);
});
it('aborts a stalled status request at the overall deadline instead of leaving an infinite spinner', async () => {
  const http = vi.fn<typeof fetch>().mockImplementation((_path, options) => new Promise<Response>((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
  const result = waitForWorkspaceActivation({ signal: new AbortController().signal, http, timeoutMs: 5000 });
  await vi.advanceTimersByTimeAsync(5000); expect(await result).toBe('timeout'); expect(http).toHaveBeenCalledTimes(1);
});
