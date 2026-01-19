import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  console.log('🔐 Auth callback triggered')
  console.log('Code present:', !!code)
  console.log('Redirect URL:', requestUrl.origin)

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
      // Exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      console.log('✅ Session exchange result:', { 
        hasSession: !!data.session,
        hasUser: !!data.user,
        error: error?.message 
      })

      if (error) {
        console.error('❌ Session exchange error:', error)
        return NextResponse.redirect(new URL(`/login?error=${error.message}`, requestUrl.origin))
      }

      if (data.session) {
        console.log('✅ User authenticated:', data.user?.email)
        
        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()

        console.log('Profile exists:', !!profile)

        // Redirect to home
        return NextResponse.redirect(new URL('/', requestUrl.origin))
      }
    } catch (error: any) {
      console.error('❌ Callback error:', error.message)
      return NextResponse.redirect(new URL('/login?error=callback_failed', requestUrl.origin))
    }
  }

  console.log('⚠️ No code present, redirecting to login')
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
