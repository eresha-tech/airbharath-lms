// Browser JSON mutations require a same-origin Origin; don't trust forwarded headers.
export function eligibilitySameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || request.headers.get('sec-fetch-site') === 'cross-site') return false;
  try {
    const publicUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!publicUrl && process.env.NODE_ENV === 'production') return false;
    return new URL(origin).origin === new URL(publicUrl || request.url).origin && origin === new URL(origin).origin;
  }
  catch { return false; }
}
