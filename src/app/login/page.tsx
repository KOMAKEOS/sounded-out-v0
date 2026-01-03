'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

    // Check for errors in URL and existing session
  useEffect(() => {
    // Check URL for error params
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError('Sign in failed. Please try again.')
    }

    // Check if already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/')
      }
    }
    checkSession()
  }, [searchParams, router])

  // Listen for auth changes (handles the OAuth redirect)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/')
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [router])
  
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
    }
  }
  
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }
  
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo */}
        <Link href="/" style={styles.logo}>
          Sounded Out
        </Link>
        
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to continue</p>
        
        {/* Error */}
        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}
        
        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={styles.googleButton}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
        
        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <span style={styles.dividerLine} />
        </div>
        
        {/* Email/Password Form */}
        <form onSubmit={handleEmailLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={styles.input}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Password</label>
              <Link href="/forgot-password" style={styles.forgotLink}>
                Forgot?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              style={styles.input}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            style={styles.submitButton}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link href="/signup" style={styles.footerLink}>
            Sign up
          </Link>
        </p>
        
        {/* Promoter CTA */}
        <div style={styles.promoterCta}>
          <p style={styles.promoterText}>Are you a promoter?</p>
          <Link href="/signup?type=promoter" style={styles.promoterLink}>
            Create your brand page →
          </Link>
        </div>
      </div>
      
      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          background: #000; 
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
      `}</style>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: '#000',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '40px 32px',
    background: '#0a0a0b',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  logo: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 800,
    color: '#ab67f7',
    textDecoration: 'none',
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    textAlign: 'center',
    marginBottom: '24px',
  },
  error: {
    padding: '12px 16px',
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '8px',
    color: '#f87171',
    fontSize: '14px',
    marginBottom: '16px',
  },
  googleButton: {
    width: '100%',
    padding: '14px',
    background: 'white',
    border: 'none',
    borderRadius: '10px',
    color: '#333',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    padding: '0 16px',
    color: '#666',
    fontSize: '13px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#888',
  },
  forgotLink: {
    fontSize: '13px',
    color: '#ab67f7',
    textDecoration: 'none',
  },
  input: {
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: 'white',
    fontSize: '15px',
    outline: 'none',
  },
  submitButton: {
    padding: '14px',
    background: '#ab67f7',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '8px',
  },
  footer: {
    fontSize: '14px',
    color: '#888',
    textAlign: 'center',
    marginTop: '24px',
  },
  footerLink: {
    color: '#ab67f7',
    textDecoration: 'none',
    fontWeight: 600,
  },
  promoterCta: {
    marginTop: '32px',
    padding: '16px',
    background: 'rgba(171,103,247,0.1)',
    borderRadius: '10px',
    textAlign: 'center',
  },
  promoterText: {
    fontSize: '13px',
    color: '#888',
    marginBottom: '4px',
  },
  promoterLink: {
    fontSize: '14px',
    color: '#ab67f7',
    textDecoration: 'none',
    fontWeight: 600,
  },
}
