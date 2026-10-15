import { NextResponse } from 'next/server';

export function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const publicUrl = new URL(request.url);
    // Next.js may reconstruct request.url with an internal hostname. Host is the
    // browser-facing authority and cannot be changed by page JavaScript.
    const host = request.headers.get('host');
    if (host) publicUrl.host = host;
    return origin === publicUrl.origin;
  } catch { return false; }
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
