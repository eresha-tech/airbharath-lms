import { isSameOrigin } from '../http';
// Browser JSON mutations additionally require an explicit canonical Origin.
export function eligibilitySameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || !isSameOrigin(request)) return false;
  try {
    const publicUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!publicUrl && process.env.NODE_ENV === 'production') return false;
    return new URL(origin).origin === new URL(publicUrl || request.url).origin && origin === new URL(origin).origin;
  }
  catch { return false; }
}
