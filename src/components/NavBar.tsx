'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// ============================================================================
// UNIVERSAL NAV BAR - Consistent navigation for Events, Venues, Saved
// Inspired by Spotify's clean tab design
// ============================================================================

interface NavBarProps {
  showBackToMap?: boolean
}

export default function NavBar({ showBackToMap = true }: NavBarProps) {
  const pathname = usePathname()

  const tabs = [
    { href: '/events', label: 'Events'},
    { href: '/venues', label: 'Venues'},
    { href: '/saved', label: 'Saved'},
  ]

  const isActive = (href: string) => pathname === href

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(10,10,11,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '12px 20px',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
        }}
      >
        {/* Top row: Logo + Back to Map */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img
              src="/logo.svg"
              alt="Sounded Out"
              style={{ height: '24px', width: 'auto' }}
            />
          </Link>

          {showBackToMap && (
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: 'rgba(171,103,247,0.15)',
                border: '1px solid rgba(171,103,247,0.3)',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#ab67f7',
                textDecoration: 'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
              Map
            </Link>
          )}
        </div>

        {/* Tab navigation */}
        <nav
          style={{
            display: 'flex',
            gap: '6px',
            background: 'rgba(255,255,255,0.04)',
            padding: '4px',
            borderRadius: '12px',
          }}
        >
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: isActive(tab.href) ? 700 : 500,
                color: isActive(tab.href) ? 'white' : '#888',
                background: isActive(tab.href) 
                  ? 'linear-gradient(135deg, #ab67f7, #c490ff)' 
                  : 'transparent',
                textDecoration: 'none',
                transition: 'all 200ms ease',
              }}
            >
              <span style={{ fontSize: '14px' }}>{tab.icon}</span>
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}

// ============================================================================
// MINIMAL NAV BAR - For pages that need less prominence
// ============================================================================

export function MinimalNavBar() {
  const pathname = usePathname()

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(10,10,11,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 20px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          <span style={{ fontSize: '14px', color: '#999' }}>Back</span>
        </Link>

        <img
          src="/logo.svg"
          alt="Sounded Out"
          style={{ height: '20px', width: 'auto' }}
        />

        <div style={{ width: '60px' }} /> {/* Spacer for centering */}
      </div>
    </header>
  )
}
