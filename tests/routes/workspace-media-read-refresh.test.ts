import { afterEach, expect, it, vi } from 'vitest';
import { mediaNeedsRefresh, startMediaReadRefresh } from '@/lib/workspace/media/read-refresh';

afterEach(() => { vi.useRealTimers(); });
it.each([{ assets: [] }, { assets: [{ status: 'ready' }] }, { assets: [{ status: 'failed' }, { status: 'detached' }] }])('stops after one read for terminal/empty assets %j', async ({ assets }) => {
  vi.useFakeTimers(); const read = vi.fn(async () => mediaNeedsRefresh(assets));
  const stop = startMediaReadRefresh(read, vi.fn());
  await vi.advanceTimersByTimeAsync(60000);
  expect(read).toHaveBeenCalledOnce(); stop();
});
it.each(['pending_upload', 'uploaded', 'verified', 'processing'])('refreshes transitional %s until authoritative ready', async status => {
  vi.useFakeTimers(); const read = vi.fn().mockResolvedValueOnce(mediaNeedsRefresh([{ status }])).mockResolvedValue(false);
  const stop = startMediaReadRefresh(read, vi.fn());
  await vi.advanceTimersByTimeAsync(60000);
  expect(read).toHaveBeenCalledTimes(2); stop();
});
it('waits for slow responses before scheduling another read', async () => {
  vi.useFakeTimers(); let finish!: (pending: boolean) => void;
  const read = vi.fn().mockImplementationOnce(() => new Promise<boolean>(resolve => { finish = resolve; })).mockResolvedValue(false);
  const stop = startMediaReadRefresh(read, vi.fn());
  await vi.advanceTimersByTimeAsync(20000); expect(read).toHaveBeenCalledOnce();
  finish(true); await vi.advanceTimersByTimeAsync(4999); expect(read).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(1); expect(read).toHaveBeenCalledTimes(2); stop();
});
it('aborts an interrupted read and suppresses its error and retries', async () => {
  vi.useFakeTimers(); let signal!: AbortSignal, fail!: (error: Error) => void;
  const error = vi.fn();
  const read = vi.fn((input: AbortSignal) => { signal = input; return new Promise<boolean>((_, reject) => { fail = reject; }); });
  const stop = startMediaReadRefresh(read, error); stop();
  expect(signal.aborted).toBe(true); fail(new Error('interrupted'));
  await vi.advanceTimersByTimeAsync(60000);
  expect(read).toHaveBeenCalledOnce(); expect(error).not.toHaveBeenCalled();
});
it('cancels scheduled work and permits a fresh reader after navigation', async () => {
  vi.useFakeTimers(); const read = vi.fn(async () => true);
  const stop = startMediaReadRefresh(read, vi.fn());
  await vi.advanceTimersByTimeAsync(1); stop();
  await vi.advanceTimersByTimeAsync(60000); expect(read).toHaveBeenCalledOnce();
  const next = vi.fn(async () => false); const stopNext = startMediaReadRefresh(next, vi.fn());
  await vi.advanceTimersByTimeAsync(60000); expect(next).toHaveBeenCalledOnce(); stopNext();
});
it('bounds failures with backoff and recovers on a subsequent explicit refresh', async () => {
  vi.useFakeTimers(); const error = vi.fn(), read = vi.fn().mockRejectedValue(new Error('timeout'));
  const stop = startMediaReadRefresh(read, error);
  await vi.advanceTimersByTimeAsync(4999); expect(read).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(1); expect(read).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(10000); expect(read).toHaveBeenCalledTimes(3);
  await vi.advanceTimersByTimeAsync(60000); expect(read).toHaveBeenCalledTimes(3); expect(error).toHaveBeenCalledTimes(3); stop();
  read.mockResolvedValue(false); const retry = startMediaReadRefresh(read, error);
  await vi.advanceTimersByTimeAsync(1); expect(read).toHaveBeenCalledTimes(4); retry();
});
