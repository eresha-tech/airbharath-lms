import { getPostHogConfig } from '@/lib/posthog-config';

const ALLOWED_PATHS = new Set(['i/v0/e', 'e', 'batch', 'flags', 'decide']);
const MAXIMUM_BYTES = 1_048_576;

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const config = getPostHogConfig();
  if (!config) return new Response(null, { status: 204 });
  const { path } = await context.params;
  const endpoint = path.join('/');
  const isRemoteConfig = request.method === 'GET' && path.length === 3 && path[0] === 'array' && path[1] === config.key && path[2] === 'config';
  if (!ALLOWED_PATHS.has(endpoint) && !isRemoteConfig) return new Response(null, { status: 404 });

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const contentEncoding = request.headers.get('content-encoding');
  if (contentEncoding) headers.set('content-encoding', contentEncoding);
  // Never forward LMS cookies, authorization, or arbitrary browser headers upstream.
  let body: Uint8Array<ArrayBuffer> | undefined;
  if (request.method === 'POST') {
    const reader = request.body?.getReader();
    if (reader) {
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > MAXIMUM_BYTES) {
            await reader.cancel();
            return new Response(null, { status: 413 });
          }
          chunks.push(value);
        }
      } catch {
        return new Response(null, { status: 400 });
      } finally {
        reader.releaseLock();
      }
      body = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    }
  }

  try {
    const upstreamUrl = isRemoteConfig
      ? `${config.assetHost}/array/${encodeURIComponent(config.key)}/config${new URL(request.url).search}`
      : `${config.host}/${endpoint}/${new URL(request.url).search}`;
    const upstream = await fetch(upstreamUrl, {
      method: request.method, headers, body: body ? new Blob([body]) : undefined,
      redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(5_000),
    });
    if (upstream.status >= 300 && upstream.status < 400) return new Response(null, { status: 502 });
    const responseHeaders = new Headers({ 'Cache-Control': 'no-store' });
    const responseType = upstream.headers.get('content-type');
    if (responseType) responseHeaders.set('content-type', responseType);
    const retryAfter = upstream.headers.get('retry-after');
    if (retryAfter) responseHeaders.set('retry-after', retryAfter);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

export { proxy as GET, proxy as POST };
