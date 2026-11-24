import { NextResponse } from 'next/server';

export function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
// Protected configuration is authoritative; proxy headers may only agree with it.
function applicationOrigin(request: Request): URL | null {
  let configured = process.env.NEXT_PUBLIC_BASE_URL;
  if (configured === undefined && process.env.VERCEL === '1') {
    const host = process.env.VERCEL_ENV === 'production'
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
      : process.env.VERCEL_ENV === 'preview' ? process.env.VERCEL_URL : undefined;
    if (host !== undefined) {
      if (!/^[a-zA-Z0-9.-]+$/.test(host)) return null;
      configured = `https://${host}`;
    }
  }
  try {
    if (configured === undefined && process.env.NODE_ENV === 'production') return null;
    if (configured !== undefined && configured.trim() !== configured) return null;
    const url = new URL(configured === undefined ? new URL(request.url).origin : configured);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
      || url.pathname !== '/' || url.search || url.hash) return null;
    return url;
  } catch { return null; }
}
function matchesAuthority(value: string, expected: URL): boolean {
  // Reject lists, credentials, paths, percent-encoding and ambiguous proxy input.
  if (!/^[a-zA-Z0-9.:[\]-]+$/.test(value)) return false;
  try { return new URL(`${expected.protocol}//${value}`).host === expected.host; }
  catch { return false; }
}
export function isSameOrigin(request: Request): boolean {
  const expected = applicationOrigin(request);
  if (!expected || request.headers.get('sec-fetch-site') === 'cross-site'
    || request.headers.has('forwarded')) return false;
  for (const key of ['host', 'x-forwarded-host']) {
    const value = request.headers.get(key);
    if (value !== null && !matchesAuthority(value, expected)) return false;
  }
  const protocol = request.headers.get('x-forwarded-proto');
  if (protocol !== null && protocol !== expected.protocol.slice(0, -1)) return false;
  const port = request.headers.get('x-forwarded-port');
  if (port !== null && port !== (expected.port || (expected.protocol === 'https:' ? '443' : '80'))) return false;
  const origin = request.headers.get('origin');
  // Retain originless media/server requests; their authentication still applies.
  return origin === null || origin === expected.origin;
}
export async function readJson(request: Request, maximumBytes = 32_768): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('JSON_REQUIRED');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_JSON');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) { await reader.cancel(); throw new Error('BODY_TOO_LARGE'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
