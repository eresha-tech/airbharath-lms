import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const email = user.email!.toLowerCase();
        const isAdmin = email.startsWith("admin@") || 
                        email.endsWith("@irii.in") || 
                        email === "rishisingh1034@gmail.com";
        const role = isAdmin ? "admin" : "student";

        // Create or update user profile in public.users table
        await supabase.from('users').upsert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata.full_name || user.user_metadata.name || 'User',
          avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture || '',
          role: role,
        }, { onConflict: 'id' })
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-error`)
}
