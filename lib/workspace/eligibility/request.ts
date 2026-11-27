import { isSameOrigin } from '../http';
// Browser JSON mutations additionally require an explicit canonical Origin.
export function eligibilitySameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || !isSameOrigin(request)) return false;
  try {
    const publicUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!publicUrl && process.env.NODE_ENV === 'production') return false;
    const reqOrigin = new URL(origin);
    const expected = new URL(publicUrl || request.url);
    const stripWww = (h: string) => h.replace(/^www\./, '');
    return origin === reqOrigin.origin && reqOrigin.protocol === expected.protocol && stripWww(reqOrigin.host) === stripWww(expected.host);
  }
  catch { return false; }
}
