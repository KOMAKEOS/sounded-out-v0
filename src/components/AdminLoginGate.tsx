// ==========================================================================
// /components/AdminLoginGate.tsx
// Reusable login gate for ALL admin pages.
// NO passwords in this file. Auth is handled server-side.
// ==========================================================================

'use client'

import { useState } from 'react'
import { useAdminAuth } from '@/lib/admin-auth'

interface AdminLoginGateProps {
  children: React.ReactNode
}

export default function AdminLoginGate({ children }: AdminLoginGateProps) {
  const { isAuthenticated, isLoading, error, login, logout } = useAdminAuth()
  const [passcodeInput, setPasscodeInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passcodeInput.trim() || submitting) return
    setSubmitting(true)
    const success = await login(passcodeInput)
    if (!success) {
      setPasscodeInput('')
    }
    setSubmitting(false)
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(171,103,247,0.2)',
          borderTopColor: '#ab67f7',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        padding: '20px',
      }}>
        <div style={{
          background: '#141416',
          borderRadius: '20px',
          padding: '32px',
          width: '100%',
          maxWidth: '320px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'rgba(171,103,247,0.15)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '24px',
            }}>
              🔐
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
              Admin Access
            </h1>
            <p style={{ fontSize: '13px', color: '#888' }}>
              Enter passcode to continue
            </p>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(248,113,113,0.12)',
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#f87171',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              placeholder="Enter passcode"
              autoFocus
              autoComplete="off"
              style={{
                width: '100%',
                padding: '14px',
                background: '#1e1e24',
                border: error
                  ? '1px solid rgba(248,113,113,0.4)'
                  : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '16px',
                textAlign: 'center',
                letterSpacing: '4px',
                marginBottom: '16px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={submitting || !passcodeInput.trim()}
              style={{
                width: '100%',
                padding: '14px',
                background: submitting ? '#7c4ab8' : '#ab67f7',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '15px',
                fontWeight: 600,
                cursor: submitting ? 'wait' : 'pointer',
                opacity: !passcodeInput.trim() ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              {submitting ? 'Verifying...' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ✅ Authenticated — render children
  return <>{children}</>
}

// ==========================================================================
// Export a Lock button component for admin headers
// ==========================================================================
export function AdminLockButton() {
  const { logout } = useAdminAuth()
  
  return (
    <button
      onClick={logout}
      style={{
        padding: '8px 14px',
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '8px',
        color: '#888',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
        e.currentTarget.style.color = '#fff'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
        e.currentTarget.style.color = '#888'
      }}
    >
      Lock
    </button>
  )
}
