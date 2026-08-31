import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirect unauthenticated users away from protected routes
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
    pathname.startsWith('/search')

  if (!user) {
    // Clear cached role cookie on logout/unauthenticated
    supabaseResponse.cookies.delete('x-user-role')
    if (!isPublic) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const redirectRes = NextResponse.redirect(url)
      redirectRes.cookies.delete('x-user-role')
      return redirectRes
    }
    return supabaseResponse
  }

  if ((pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) && user) {
    const cachedRole = request.cookies.get('x-user-role')?.value

    if (cachedRole) {
      if (cachedRole === 'admin' && pathname.startsWith('/dashboard')) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      }
      if (cachedRole !== 'admin' && pathname.startsWith('/admin')) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'student'

    supabaseResponse.cookies.set('x-user-role', role, {
      maxAge: 60 * 30, // 30 minutes
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })

    if (role === 'admin' && pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      const res = NextResponse.redirect(url)
      res.cookies.set('x-user-role', 'admin', {
        maxAge: 60 * 30,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      })
      return res
    }

    if (role !== 'admin' && pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      const res = NextResponse.redirect(url)
      res.cookies.set('x-user-role', role, {
        maxAge: 60 * 30,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      })
      return res
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
