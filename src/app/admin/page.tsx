'use client'

import { useState } from 'react'
import Link from 'next/link'
import AdminLoginGate, { AdminLockButton } from '@/components/AdminLoginGate'

// ============================================================================
// ADMIN HUB — SECURED
// No passwords in this file. Auth handled server-side.
// ============================================================================

export default function AdminHubPage() {
  return (
    <AdminLoginGate>
      <AdminHubContent />
    </AdminLoginGate>
  )
}

function AdminHubContent() {
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
        <AdminLockButton />
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

        {/* Quick Actions */}
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
