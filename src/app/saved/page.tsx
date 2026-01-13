'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import NavBar from '../../components/NavBar'

interface User {
  id: string
  email?: string
}

// ============================================================================
// SETTINGS PAGE - With honest "Coming Soon" labels
// ============================================================================

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) setUser({ id: data.user.id, email: data.user.email })
      setLoading(false)
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) setUser({ id: session.user.id, email: session.user.email })
      else setUser(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white' }}>
      <NavBar />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Settings</h1>
          <p style={{ fontSize: '15px', color: '#888' }}>
            {user ? `Signed in as ${user.email || 'account'}` : 'Sign in to access account settings.'}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '3px solid rgba(171,103,247,0.2)',
                borderTopColor: '#ab67f7',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <p style={{ color: '#888' }}>Loading settings...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* Account */}
            <div
              style={{
                background: '#141416',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                padding: '18px',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '8px' }}>Account</h3>

              {user ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Email</p>
                      <p style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>{user.email || '—'}</p>
                    </div>

                    <button
                      onClick={handleSignOut}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(248,113,113,0.12)',
                        color: '#f87171',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '14px',
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                </>
              ) : (
                <Link
                  href="/login"
                  style={{
                    display: 'inline-block',
                    marginTop: '10px',
                    padding: '12px 16px',
                    background: '#ab67f7',
                    borderRadius: '12px',
                    color: 'white',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  Sign in
                </Link>
              )}
            </div>

            {/* Preferences */}
            <div
              style={{
                background: '#141416',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                padding: '18px',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '8px' }}>Preferences</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SettingRow title="Notifications" value="Coming soon" />
                <SettingRow title="Location" value="Coming soon" />
                <SettingRow title="Music tastes" value="Coming soon" />
              </div>
            </div>

            {/* Support */}
            <div
              style={{
                background: '#141416',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                padding: '18px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '8px' }}>Support</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link
                  href="/"
                  style={{
                    textDecoration: 'none',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <span style={{ fontWeight: 700 }}>Back to map</span>
                  <span style={{ color: '#888' }}>→</span>
                </Link>

                <SettingRow title="Privacy policy" value="Coming soon" />
                <SettingRow title="Terms" value="Coming soon" />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function SettingRow({ title, value }: { title: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 12px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      <span style={{ fontWeight: 700 }}>{title}</span>
      <span style={{ color: '#888', fontSize: '13px', fontWeight: 600 }}>{value}</span>
    </div>
  )
}
