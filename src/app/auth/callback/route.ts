import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      // Exchange code for session - trigger handles profile creation
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('❌ Auth error:', error.message)
        return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
      }
      
      // Redirect based on user type
      if (type === 'promoter') {
        return NextResponse.redirect(new URL('/portal/brand/new', requestUrl.origin))
      }
      
      return NextResponse.redirect(new URL('/', requestUrl.origin))
    } catch (error: any) {
      console.error('❌ Callback error:', error.message)
      return NextResponse.redirect(new URL('/login?error=callback_failed', requestUrl.origin))
    }
  }

  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
