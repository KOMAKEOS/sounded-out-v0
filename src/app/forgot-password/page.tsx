'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '380px', width: '100%' }}>
        <Link href="/login" style={{ color: '#ab67f7', textDecoration: 'none', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '32px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          Back to login
        </Link>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
            <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Check your email</h1>
            <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.6' }}>
              If an account exists for <strong style={{ color: '#fff' }}>{email}</strong>, you'll receive a password reset link shortly.
            </p>
          </div>
        ) : (
          <>
            <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Reset your password</h1>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '24px' }}>Enter your email and we'll send you a reset link.</p>

            {error && (
              <div style={{ padding: '12px', background: 'rgba(248,113,113,0.15)', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', color: '#f87171' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                style={{ width: '100%', padding: '14px', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '15px', marginBottom: '12px', boxSizing: 'border-box' }}
              />
              <button
                type="submit"
                disabled={loading || !email}
                style={{ width: '100%', padding: '14px', background: loading ? '#666' : '#ab67f7', border: 'none', borderRadius: '10px', color: 'white', fontSize: '15px', fontWeight: 600, cursor: loading ? 'wait' : 'pointer' }}
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
