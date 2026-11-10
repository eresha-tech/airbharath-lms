import 'server-only';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { abortable } from '@/lib/async-budget';
import { MediaError, displayName } from './model';

export type ByteRange = { start: number; end: number };
export type PrivateObject = { body?: ReadableStream<Uint8Array>; size: number };
export type PrivateObjectReader = (range: ByteRange | null, signal: AbortSignal, head: boolean) => Promise<PrivateObject>;
export function storageBodyStream(body: { transformToWebStream(): ReadableStream<Uint8Array> }) {
  if (body instanceof Readable) {
    if (body.readableObjectMode) throw new MediaError('verification');
    // Pull directly from the Node iterator. This avoids both SDK chunk-count
    // queue inflation and a Node22 toWeb enqueue-after-cancel race.
    body.pause(); const iterator = body[Symbol.asyncIterator](); let stopped = false;
    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const next = await iterator.next(); if (stopped) return;
          if (next.done) { stopped = true; controller.close(); return; }
          if (!(next.value instanceof Uint8Array)) throw new MediaError('verification');
          controller.enqueue(next.value);
        } catch { if (!stopped) { stopped = true; body.destroy(); controller.error(new MediaError('unavailable')); } }
      },
      async cancel() { stopped = true; body.destroy(); await iterator.return?.().catch(() => undefined); },
    }, { highWaterMark: 0 });
  }
  return body.transformToWebStream();
}
export const privateMediaHeaders = {
  'Cache-Control': 'private, no-store, no-transform', 'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; sandbox", 'Cross-Origin-Resource-Policy': 'same-origin',
  'Referrer-Policy': 'no-referrer', Vary: 'Cookie, Authorization', 'X-Accel-Buffering': 'no',
};
export function boundedMediaRequest(request: Request) {
  return new Request(request, { signal: AbortSignal.any([request.signal, AbortSignal.timeout(50_000)]) });
}
export function attachment(name: string, mime: string) {
  const ext = mime === 'application/pdf' ? 'pdf' : mime === 'image/png' ? 'png' : 'jpg';
  const encoded = encodeURIComponent(displayName(name)).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="resource.${ext}"; filename*=UTF-8''${encoded}`;
}
// One range only, matching S3. Invalid/multiple/unsatisfiable ranges fail closed.
export function byteRange(value: string | null, size: number): ByteRange | null {
  if (value === null) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || !match[1] && !match[2]) throw new MediaError('validation');
  const number = (v: string) => { const n = Number(v); if (!Number.isSafeInteger(n) || n < 0) throw new MediaError('validation'); return n; };
  if (!match[1]) { const suffix = number(match[2]); if (!suffix) throw new MediaError('validation'); return { start: Math.max(0, size - suffix), end: size - 1 }; }
  const start = number(match[1]), end = match[2] ? Math.min(number(match[2]), size - 1) : size - 1;
  if (start >= size || end < start) throw new MediaError('validation');
  return { start, end };
}
export async function privateObjectResponse(request: Request, object: {
  size: number; type: string; checksum?: string; disposition?: string; open: PrivateObjectReader;
}, authorize: () => Promise<void>) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { ...privateMediaHeaders, Allow: 'GET, HEAD' } });
  if (!Number.isSafeInteger(object.size) || object.size < 1) throw new MediaError('verification');
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 50_000);
  const cancelled = () => abort.abort(); request.signal.addEventListener('abort', cancelled, { once: true });
  if (request.signal.aborted) abort.abort();
  const cleanup = () => { clearTimeout(timer); request.signal.removeEventListener('abort', cancelled); };
  try { abort.signal.throwIfAborted(); await abortable(authorize(), abort.signal); }
  catch (error) { cleanup(); abort.abort(); throw error; }
  const headers = new Headers({ ...privateMediaHeaders, 'Content-Type': object.type, 'Accept-Ranges': 'bytes' });
  if (object.checksum) headers.set('ETag', `"${object.checksum}"`);
  if (object.disposition) { headers.set('Content-Disposition', object.disposition); headers.set('X-Frame-Options', 'DENY'); }
  // Ignore Range for HEAD, as specified by HTTP; this is metadata for the full representation.
  let range: ByteRange | null;
  try { range = request.method === 'HEAD' || request.headers.has('if-range') && request.headers.get('if-range') !== headers.get('etag') ? null : byteRange(request.headers.get('range'), object.size); }
  catch { cleanup(); abort.abort(); headers.set('Content-Range', `bytes */${object.size}`); return new Response(null, { status: 416, headers }); }
  const size = range ? range.end - range.start + 1 : object.size;
  headers.set('Content-Length', String(size));
  if (range) headers.set('Content-Range', `bytes ${range.start}-${range.end}/${object.size}`);
  let source: PrivateObject | undefined;
  try {
    abort.signal.throwIfAborted(); source = await abortable(object.open(range, abort.signal, request.method === 'HEAD'), abort.signal);
    if (source.size !== size) throw new MediaError('verification');
    await abortable(authorize(), abort.signal); abort.signal.throwIfAborted();
  } catch (error) { cleanup(); abort.abort(); await source?.body?.cancel().catch(() => undefined); throw error; }
  if (request.method === 'HEAD') { cleanup(); abort.abort(); return new Response(null, { headers }); }
  if (!source.body) { cleanup(); abort.abort(); throw new MediaError('verification'); }
  const reader = source.body.getReader();
  let received = 0, pending: Uint8Array | undefined, lastCheck = Date.now(), closed = false;
  const hash = object.checksum && (!range || range.start === 0 && range.end === object.size - 1) ? createHash('sha256') : null;
  const stop = async () => { if (closed) return; closed = true; cleanup(); abort.abort(); await reader.cancel().catch(() => undefined); };
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        abort.signal.throwIfAborted();
        if (Date.now() - lastCheck >= 5000) { await abortable(authorize(), abort.signal); lastCheck = Date.now(); }
        if (!pending) {
          const next = await abortable(reader.read(), abort.signal);
          if (next.done) {
            if (received !== size || hash && hash.digest('hex') !== object.checksum) throw new MediaError('verification');
            closed = true; cleanup(); abort.abort(); reader.releaseLock(); controller.close(); return;
          }
          received += next.value.byteLength;
          if (received > size) throw new MediaError('verification');
          hash?.update(next.value); pending = next.value;
        }
        abort.signal.throwIfAborted();
        const chunk = pending.subarray(0, 64 * 1024), last = received === size && pending.length === chunk.length;
        if (last) {
          // Hold the final chunk until EOF/integrity/access checks pass. With a
          // Content-Length header, emitting all bytes before checking the hash
          // could let an HTTP client consider a corrupt response complete.
          const tail = await abortable(reader.read(), abort.signal);
          if (!tail.done || hash && hash.digest('hex') !== object.checksum) throw new MediaError('verification');
          await abortable(authorize(), abort.signal); abort.signal.throwIfAborted();
          closed = true; cleanup(); abort.abort(); reader.releaseLock();
          controller.enqueue(chunk); controller.close(); return;
        }
        pending = pending.length > chunk.length ? pending.subarray(chunk.length) : undefined;
        controller.enqueue(chunk);
      } catch { await stop(); controller.error(new MediaError('unavailable')); }
    },
    async cancel() { await stop(); },
  }, { highWaterMark: 0 });
  // Cancellation also interrupts an in-flight SDK/read operation, not just the next pull.
  abort.signal.addEventListener('abort', () => { if (!closed) void reader.cancel().catch(() => undefined); }, { once: true });
  return new Response(stream, { status: range ? 206 : 200, headers });
}

// Small verified playlists/captions may be buffered for parsing, but the HTTP body
// is still a pull-driven stream. Large binaries use the storage reader above.
export function privateBytesResponse(request: Request, bytes: Uint8Array, type: string, disposition?: string, authorize: () => Promise<void> = async () => undefined) {
  return privateObjectResponse(request, { size: bytes.length, type, disposition,
    open: async (range, _signal, head) => ({ size: range ? range.end - range.start + 1 : bytes.length,
      ...(!head ? { body: new ReadableStream<Uint8Array>({ start(c) { c.enqueue(range ? bytes.subarray(range.start, range.end + 1) : bytes); c.close(); } }) } : {}) }),
  }, authorize);
}
