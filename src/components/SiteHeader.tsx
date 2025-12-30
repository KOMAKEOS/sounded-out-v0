'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'

type UserType = 'anon' | 'user' | 'promoter'

export default function SiteHeader() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [userType, setUserType] = useState<UserType>('anon')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
        // Check if promoter (you'd have this in user metadata or a profiles table)
        setUserType(data.user.user_metadata?.is_promoter ? 'promoter' : 'user')
      }
    })
  }, [])

  const navLinks = [
    { href: '/', label: 'Explore' },
    { href: '/events', label: 'Events' },
    { href: '/venues', label: 'Venues' },
    { href: '/brands', label: 'Brands' },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'rgba(10,10,11,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}>
        {/* Left: Logo + Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo.svg" alt="Sounded Out" style={{ height: '22px' }} />
          </Link>
          
          {/* Desktop Nav */}
          <nav style={{ display: 'flex', gap: '32px' }}>
            {navLinks.map(link => (
              <Link 
                key={link.href}
                href={link.href} 
                style={{ 
                  color: isActive(link.href) ? '#fff' : '#888', 
                  textDecoration: 'none', 
                  fontSize: '14px', 
                  fontWeight: isActive(link.href) ? 600 : 400,
                  transition: 'color 150ms ease',
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Right: Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#ab67f7',
                  border: 'none',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {user.email?.charAt(0).toUpperCase()}
              </button>
              
              {dropdownOpen && (
                <>
                  <div 
                    onClick={() => setDropdownOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
                  />
                  <div style={{
                    position: 'absolute',
                    top: '44px',
                    right: 0,
                    width: '200px',
                    background: '#141416',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '8px',
                    zIndex: 999,
                  }}>
                    {userType === 'promoter' ? (
                      <>
                        <DropdownLink href="/portal" onClick={() => setDropdownOpen(false)}>Dashboard</DropdownLink>
                        <DropdownLink href="/portal/events" onClick={() => setDropdownOpen(false)}>My Events</DropdownLink>
                        <DropdownLink href="/portal/events/new" onClick={() => setDropdownOpen(false)}>Create Event</DropdownLink>
                        <DropdownLink href="/portal/analytics" onClick={() => setDropdownOpen(false)}>Analytics</DropdownLink>
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
                      </>
                    ) : (
                      <>
                        <DropdownLink href="/saved" onClick={() => setDropdownOpen(false)}>Saved</DropdownLink>
                        <DropdownLink href="/following" onClick={() => setDropdownOpen(false)}>Following</DropdownLink>
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
                      </>
                    )}
                    <DropdownLink href="/settings" onClick={() => setDropdownOpen(false)}>Settings</DropdownLink>
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut()
                        window.location.href = '/'
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#888',
                        fontSize: '14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link 
                href="/login"
                style={{
                  color: '#888',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Sign in
              </Link>
              <Link 
                href="/signup"
                style={{
                  padding: '10px 18px',
                  background: '#ab67f7',
                  borderRadius: '8px',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Create account
              </Link>
            </>
          )}
          
          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="mobile-menu-btn"
            style={{
              display: 'none',
              width: '40px',
              height: '40px',
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </header>
      
      {/* Mobile Menu */}
      {menuOpen && (
        <>
          <div 
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 1001,
            }}
          />
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '280px',
            maxWidth: '85vw',
            background: '#0a0a0b',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            zIndex: 1002,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}>
            <button
              onClick={() => setMenuOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '36px',
                height: '36px',
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '50%',
                color: '#888',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              ×
            </button>
            
            <div style={{ marginTop: '48px' }}>
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'block',
                    padding: '14px 0',
                    color: isActive(link.href) ? '#fff' : '#888',
                    textDecoration: 'none',
                    fontSize: '16px',
                    fontWeight: isActive(link.href) ? 600 : 400,
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {link.label}
                </Link>
              ))}
              
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />
              
              <Link
                href="/for-promoters"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'block',
                  padding: '14px 0',
                  color: '#888',
                  textDecoration: 'none',
                  fontSize: '14px',
                }}
              >
                For promoters
              </Link>
              <Link
                href="/about"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'block',
                  padding: '14px 0',
                  color: '#888',
                  textDecoration: 'none',
                  fontSize: '14px',
                }}
              >
                About
              </Link>
            </div>
            
            {!user && (
              <div style={{ marginTop: 'auto', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link
                  href="/signup"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'block',
                    padding: '14px',
                    background: '#ab67f7',
                    borderRadius: '10px',
                    color: 'white',
                    textDecoration: 'none',
                    textAlign: 'center',
                    fontSize: '15px',
                    fontWeight: 600,
                  }}
                >
                  Create account
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'block',
                    padding: '14px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    textDecoration: 'none',
                    textAlign: 'center',
                    fontSize: '15px',
                    fontWeight: 500,
                  }}
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        </>
      )}
      
      <style jsx global>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          header nav { display: none !important; }
          header > div:last-child > a { display: none !important; }
        }
      `}</style>
    </>
  )
}

function DropdownLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'block',
        padding: '10px 12px',
        color: '#ccc',
        textDecoration: 'none',
        fontSize: '14px',
        borderRadius: '8px',
      }}
    >
      {children}
    </Link>
  )
}
