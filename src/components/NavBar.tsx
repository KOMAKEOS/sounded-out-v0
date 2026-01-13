'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'

interface User {
  id: string
  email?: string
}

export default function NavBar() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email })
      }
    }
    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setShowDropdown(false)
  }

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/')

  const navItems = [
    { href: '/events', label: 'Events' },
    { href: '/venues', label: 'Venues' },
    { href: '/saved', label: 'Saved' },
  ]

  return (
    <>
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'rgba(10,10,11,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        {/* Left: Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo.svg" alt="Sounded Out" style={{ height: '24px', width: 'auto' }} />
        </Link>

        {/* Center: Navigation Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '4px',
        }}>
          {navItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href} 
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                background: isActive(item.href) ? 'rgba(171,103,247,0.2)' : 'transparent',
                color: isActive(item.href) ? '#ab67f7' : '#888',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: isActive(item.href) ? 600 : 500,
                transition: 'all 150ms ease',
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right: Sign In or User Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'rgba(171,103,247,0.15)',
                  border: '1px solid rgba(171,103,247,0.3)',
                  borderRadius: '10px',
                  color: '#ab67f7',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: '#ab67f7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: 'white',
                  fontWeight: 700,
                }}>
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </span>
                <span style={{ 
                  maxWidth: '100px', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap' 
                }}>
                  {user.email?.split('@')[0] || 'Account'}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <>
                  <div 
                    onClick={() => setShowDropdown(false)} 
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
                  />
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: '#1a1a1f',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '14px',
                    padding: '8px',
                    minWidth: '220px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    zIndex: 100,
                  }}>
                    <div style={{ 
                      padding: '12px 14px', 
                      borderBottom: '1px solid rgba(255,255,255,0.08)', 
                      marginBottom: '8px' 
                    }}>
                      <p style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Signed in as</p>
                      <p style={{ fontSize: '14px', color: '#ab67f7', fontWeight: 600 }}>{user.email}</p>
                    </div>
                    
                    <Link 
                      href="/profile" 
                      onClick={() => setShowDropdown(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        color: 'white',
                        textDecoration: 'none',
                        fontSize: '14px',
                      }}
                    >
                      👤 Profile
                    </Link>
                    
                    <Link 
                      href="/portal" 
                      onClick={() => setShowDropdown(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        color: 'white',
                        textDecoration: 'none',
                        fontSize: '14px',
                      }}
                    >
                      🏢 Partner Portal
                    </Link>
                    
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
                    
                    <button
                      onClick={handleSignOut}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'rgba(248,113,113,0.1)',
                        color: '#f87171',
                        fontSize: '14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      🚪 Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                borderRadius: '12px',
                color: 'white',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                boxShadow: '0 4px 16px rgba(171,103,247,0.3)',
              }}
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Spacer to push content below fixed nav */}
      <div style={{ height: '64px' }} />
    </>
  )
}
