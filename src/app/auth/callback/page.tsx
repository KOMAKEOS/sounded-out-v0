'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Auth error:', error)
        router.push('/login?error=auth_failed')
        return
      }
      
      if (session) {
        const userType = searchParams.get('type')
        
        // Create/update profile
        await supabase.from('profiles').upsert({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
          role: userType === 'promoter' ? 'partner' : 'user',
        })
        
        // Redirect based on user type
        if (userType === 'promoter') {
          // Check if they already have a brand
          const { data: existingBrand } = await supabase
            .from('brands')
            .select('id')
            .eq('owner_user_id', session.user.id)
            .single()
          
          if (existingBrand) {
            router.push('/portal')
          } else {
            router.push('/portal/brand/new')
          }
        } else {
          router.push('/')
        }
      } else {
        router.push('/login')
      }
    }
    
    handleCallback()
  }, [router, searchParams])
  
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
      color: 'white',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(171,103,247,0.2)',
          borderTopColor: '#ab67f7',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: '#888' }}>Signing you in...</p>
      </div>
      
      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
