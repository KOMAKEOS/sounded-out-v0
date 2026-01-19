import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  console.log('🔐 Auth callback received')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
      // Exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('❌ Session exchange error:', error.message)
        return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
      }

      if (data.session && data.user) {
        console.log('✅ User authenticated:', data.user.email)

        // Create/update profile with CORRECT column names
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            display_name: data.user.user_metadata?.name || 
                         data.user.user_metadata?.full_name || 
                         data.user.email?.split('@')[0],
            avatar_url: data.user.user_metadata?.avatar_url || 
                        data.user.user_metadata?.picture,
            home_city: 'Newcastle',
            onboarding_complete: false,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id'
          })

        if (profileError) {
          console.error('❌ Profile error:', profileError.message)
        } else {
          console.log('✅ Profile saved to user_profiles')
        }

        return NextResponse.redirect(new URL('/', requestUrl.origin))
      }
    } catch (error: any) {
      console.error('❌ Callback error:', error.message)
      return NextResponse.redirect(new URL('/login?error=callback_failed', requestUrl.origin))
    }
  }

  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
