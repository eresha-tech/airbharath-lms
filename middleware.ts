import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'airbharath-lms-super-secret-jwt-key-2026'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('ab_session')?.value;

  let sessionUser: { id: string; role: string; phone: string } | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      sessionUser = payload as any;
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

  if (role === 'admin' && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

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
