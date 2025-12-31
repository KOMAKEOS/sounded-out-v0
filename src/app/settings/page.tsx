'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUser(data.user)
      } else {
        router.push('/login')
      }
      setLoading(false)
    }
    loadUser()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleDeleteAccount = async () => {
    // Delete user data
    if (user) {
      await supabase.from('saved_events').delete().eq('user_id', user.id)
      await supabase.from('venue_likes').delete().eq('user_id', user.id)
      // Note: Can't delete auth user from client - would need server function
    }
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', paddingBottom: '60px' }}>
      {/* Header */}
      <header style={{
        padding: '16px 20px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <img src="/logo.svg" alt="Sounded Out" style={{ height: '24px' }} />
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '32px' }}>Settings</h1>

        {/* Account Section */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            color: '#888', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            marginBottom: '16px',
          }}>
            Account
          </h2>
          
          <div style={{ background: '#141416', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Email</p>
              <p style={{ fontSize: '14px', color: 'white' }}>{user?.email}</p>
            </div>
            
            <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Signed in via</p>
              <p style={{ fontSize: '14px', color: 'white' }}>
                {user?.app_metadata?.provider === 'google' ? 'Google' : 'Email'}
              </p>
            </div>
            
            <div style={{ padding: '16px' }}>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Member since</p>
              <p style={{ fontSize: '14px', color: 'white' }}>
                {new Date(user?.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            color: '#888', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            marginBottom: '16px',
          }}>
            Preferences
          </h2>
          
          <div style={{ background: '#141416', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ 
              padding: '16px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div>
                <p style={{ fontSize: '14px', color: 'white', marginBottom: '2px' }}>Push notifications</p>
                <p style={{ fontSize: '12px', color: '#666' }}>Get notified about saved events</p>
              </div>
              <span style={{ fontSize: '12px', color: '#666' }}>Coming soon</span>
            </div>
            
            <div style={{ 
              padding: '16px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: '14px', color: 'white', marginBottom: '2px' }}>Email updates</p>
                <p style={{ fontSize: '12px', color: '#666' }}>Weekly highlights and recommendations</p>
              </div>
              <span style={{ fontSize: '12px', color: '#666' }}>Coming soon</span>
            </div>
          </div>
        </section>

        {/* Links Section */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            color: '#888', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            marginBottom: '16px',
          }}>
            About
          </h2>
          
          <div style={{ background: '#141416', borderRadius: '12px', overflow: 'hidden' }}>
            <Link 
              href="/about"
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '16px', 
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                textDecoration: 'none',
                color: 'white',
              }}
            >
              <span style={{ fontSize: '14px' }}>About Sounded Out</span>
              <span style={{ color: '#666' }}>→</span>
            </Link>
            
            <Link 
              href="/terms"
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '16px', 
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                textDecoration: 'none',
                color: 'white',
              }}
            >
              <span style={{ fontSize: '14px' }}>Terms of Service</span>
              <span style={{ color: '#666' }}>→</span>
            </Link>
            
            <Link 
              href="/privacy"
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '16px', 
                textDecoration: 'none',
                color: 'white',
              }}
            >
              <span style={{ fontSize: '14px' }}>Privacy Policy</span>
              <span style={{ color: '#666' }}>→</span>
            </Link>
          </div>
        </section>

        {/* Actions */}
        <section>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: '14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              marginBottom: '12px',
            }}
          >
            Sign out
          </button>
          
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                width: '100%',
                padding: '14px',
                background: 'transparent',
                border: 'none',
                color: '#f87171',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Delete account
            </button>
          ) : (
            <div style={{ 
              padding: '16px', 
              background: 'rgba(248,113,113,0.1)', 
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: '10px',
            }}>
              <p style={{ fontSize: '14px', color: '#f87171', marginBottom: '12px' }}>
                Are you sure? This will delete all your saved events and preferences.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#f87171',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
