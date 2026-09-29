import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

function getJwtSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: JWT_SECRET environment variable is missing in production.');
    }
    return null;
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('ab_session')?.value;

  let sessionUser: { id: string; role: string; phone: string } | null = null;
  if (token) {
    try {
      const secret = getJwtSecret();
      if (secret) {
        const { payload } = await jwtVerify(token, secret);
        sessionUser = payload as any;
      }
    } catch {
      sessionUser = null;
    }
  }

  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/about') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/faq') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/courses') ||
    pathname.startsWith('/preview') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/practice') ||
    pathname.startsWith('/search') ||
    pathname.startsWith('/verify-certificate');

  if (!sessionUser) {
    if (!isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      const redirectRes = NextResponse.redirect(url);
      redirectRes.cookies.delete('ab_session');
      return redirectRes;
    }
    return NextResponse.next();
  }

  const role = sessionUser.role || 'student';

  if (role !== 'admin' && pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
