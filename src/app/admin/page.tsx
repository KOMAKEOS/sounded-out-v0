'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// ============================================================================
// ADMIN HUB
// ============================================================================
const ADMIN_PASSCODE = '6521'

export default function AdminHubPage() {
  const [passcodeEntered, setPasscodeEntered] = useState(false)
  const [passcodeInput, setPasscodeInput] = useState('')
  const [passcodeError, setPasscodeError] = useState(false)

  useEffect(() => {
    const savedAccess = sessionStorage.getItem('so_admin_access')
    if (savedAccess === 'granted') {
      setPasscodeEntered(true)
    }
  }, [])

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (passcodeInput === ADMIN_PASSCODE) {
      setPasscodeEntered(true)
      setPasscodeError(false)
      sessionStorage.setItem('so_admin_access', 'granted')
    } else {
      setPasscodeError(true)
      setPasscodeInput('')
    }
  }

  // Passcode screen
  if (!passcodeEntered) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <form onSubmit={handlePasscodeSubmit} style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '320px',
          width: '100%',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#fff', fontSize: '24px', marginBottom: '8px' }}>
            🔐 Admin Access
          </h1>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
            Enter passcode to continue
          </p>
          <input
            type="password"
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            placeholder="Enter passcode"
            maxLength={4}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '24px',
              textAlign: 'center',
              letterSpacing: '8px',
              background: 'rgba(255,255,255,0.05)',
              border: passcodeError ? '2px solid #f87171' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#fff',
              marginBottom: '16px',
              outline: 'none'
            }}
          />
          {passcodeError && (
            <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>
              Incorrect passcode
            </p>
          )}
          <button type="submit" style={{
            width: '100%',
            padding: '14px',
            background: '#ab67f7',
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer'
          }}>
            Enter
          </button>
        </form>
      </div>
    )
  }

  // Admin sections
  const sections = [
    {
      title: 'Events',
      description: 'Add, edit, and manage events',
      icon: '🎵',
      href: '/admin/events',
      color: '#ab67f7'
    },
    {
      title: 'Venues',
      description: 'Manage venue listings and info',
      icon: '🏢',
      href: '/admin/venues',
      color: '#3b82f6'
    },
    {
      title: 'Claims',
      description: 'Review and approve claims',
      icon: '📋',
      href: '/admin/claims',
      color: '#22c55e'
    },
    {
      title: 'Analytics',
      description: 'View platform stats',
      icon: '📊',
      href: '/admin/analytics',
      color: '#f59e0b'
    }
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff' }}>
      {/* Header */}
      <header style={{
        padding: '24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ color: '#888', textDecoration: 'none' }}>
            ← Back to site
          </Link>
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
          Admin Dashboard
        </h1>
        <button
          onClick={() => {
            sessionStorage.removeItem('so_admin_access')
            setPasscodeEntered(false)
          }}
          style={{
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            borderRadius: '6px',
            color: '#888',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          Lock
        </button>
      </header>

      {/* Main */}
      <main style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {sections.map(section => (
            <Link
              key={section.href}
              href={section.href}
              style={{
                display: 'block',
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '24px',
                transition: 'border-color 0.2s, transform 0.2s',
                cursor: 'pointer'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = section.color
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: `${section.color}20`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginBottom: '16px'
                }}>
                  {section.icon}
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                  {section.title}
                </h2>
                <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
                  {section.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div style={{
          marginTop: '40px',
          padding: '24px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#888' }}>
            Quick Actions
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/admin/events" style={{
              padding: '12px 20px',
              background: '#ab67f7',
              borderRadius: '8px',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600
            }}>
              + Add Event
            </Link>
            <Link href="/admin/venues" style={{
              padding: '12px 20px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600
            }}>
              + Add Venue
            </Link>
            <Link href="/" target="_blank" style={{
              padding: '12px 20px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              color: '#888',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500
            }}>
              View Live Site →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
