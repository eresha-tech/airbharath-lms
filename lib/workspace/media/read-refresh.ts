// Browser-only scheduling. Reads are serialized; mutations keep their own guards.
export function mediaNeedsRefresh(assets: readonly { status: string }[]) {
  return assets.some(asset => ['pending_upload', 'uploaded', 'verified', 'processing'].includes(asset.status));
}

export function startMediaReadRefresh(read: (signal: AbortSignal) => Promise<boolean>, onError: (error: unknown) => void) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  async function refresh() {
    if (controller.signal.aborted) return;
    try {
      const pending = await read(controller.signal);
      failures = 0;
      if (pending && !controller.signal.aborted) timer = setTimeout(() => void refresh(), 5000);
    } catch (error) {
      if (controller.signal.aborted) return;
      onError(error);
      // Bounded recovery, including initial-load failures. Manual refresh remains available.
      if (++failures < 3) timer = setTimeout(() => void refresh(), 5000 * 2 ** (failures - 1));
    }
  }
  void refresh();
  return () => { controller.abort(); clearTimeout(timer); };
}
