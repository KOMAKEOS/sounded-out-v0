'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

interface User {
  id: string
  email?: string
}

interface ClaimRequest {
  id: string
  claim_type: 'venue' | 'event'
  event_id: string | null
  venue_id: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  events?: { title: string } | null
  venues?: { name: string } | null
}

interface Venue {
  id: string
  name: string
  address: string
  is_verified: boolean
}

interface Brand {
  id: string
  name: string
  slug: string
  is_verified: boolean
}

export default function PortalPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'venues' | 'brands' | 'claims'>('venues')
  
  // Data
  const [claims, setClaims] = useState<ClaimRequest[]>([])
  const [myVenues, setMyVenues] = useState<Venue[]>([])
  const [myBrands, setMyBrands] = useState<Brand[]>([])

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email })
      }
      setLoading(false)
    }
    loadUser()
  }, [])

  // Load claims for this user
  useEffect(() => {
    if (!user?.email) return

    const loadClaims = async () => {
      const { data, error } = await supabase
        .from('claim_requests')
        .select(`
          *,
          events:event_id(title),
          venues:venue_id(name)
        `)
        .eq('requested_by_email', user.email)
        .order('created_at', { ascending: false })

      if (data && !error) {
        setClaims(data as ClaimRequest[])
      }
    }
    loadClaims()
  }, [user])

  // Load venues and brands this user has access to
  useEffect(() => {
    if (!user?.id) return

    const loadMyStuff = async () => {
      // Load claimed venues
      const { data: venues } = await supabase
        .from('venues')
        .select('*')
        .eq('claimed_by', user.id)

      if (venues) {
        setMyVenues(venues as Venue[])
      }

      // Load brands
      const { data: brands } = await supabase
        .from('brands')
        .select('*')
        .eq('owner_id', user.id)

      if (brands) {
        setMyBrands(brands as Brand[])
      }
    }
    loadMyStuff()
  }, [user])

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', text: 'Approved' }
      case 'rejected':
        return { bg: 'rgba(248,113,113,0.15)', color: '#f87171', text: 'Rejected' }
      default:
        return { bg: 'rgba(234,179,8,0.15)', color: '#eab308', text: 'Pending' }
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '3px solid rgba(171,103,247,0.2)', 
            borderTopColor: '#ab67f7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#888' }}>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(171,103,247,0.2), rgba(171,103,247,0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '36px',
          }}>
            🏢
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>Partner Portal</h1>
          <p style={{ fontSize: '15px', color: '#888', marginBottom: '32px', lineHeight: 1.6 }}>
            Sign in to manage your venues, brands, and view your claim requests.
          </p>
          <Link
            href="/login"
            style={{
              display: 'inline-block',
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
              borderRadius: '14px',
              color: 'white',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: 700,
              boxShadow: '0 8px 32px rgba(171,103,247,0.3)',
            }}
          >
            Sign In
          </Link>
          <p style={{ fontSize: '13px', color: '#666', marginTop: '20px' }}>
            <Link href="/" style={{ color: '#ab67f7', textDecoration: 'none' }}>← Back to Map</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white' }}>
      {/* Header */}
      <header style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/">
            <img src="/logo.svg" alt="Sounded Out" style={{ height: '24px' }} />
          </Link>
          <span style={{ color: '#444' }}>|</span>
          <span style={{ fontSize: '14px', color: '#ab67f7', fontWeight: 600 }}>Partner Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#888' }}>{user.email}</span>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/'
            }}
            style={{
              padding: '8px 16px',
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Welcome back!</h1>
        <p style={{ fontSize: '15px', color: '#888', marginBottom: '32px' }}>
          Manage your venues and brands from here.
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '32px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
          {(['venues', 'brands', 'claims'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === tab ? 'rgba(171,103,247,0.2)' : 'transparent',
                color: activeTab === tab ? '#ab67f7' : '#888',
                fontSize: '14px',
                fontWeight: activeTab === tab ? 600 : 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab}
              {tab === 'claims' && claims.length > 0 && (
                <span style={{
                  marginLeft: '8px',
                  padding: '2px 8px',
                  background: 'rgba(171,103,247,0.3)',
                  borderRadius: '10px',
                  fontSize: '11px',
                }}>
                  {claims.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Venues Tab */}
        {activeTab === 'venues' && (
          <div>
            {myVenues.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#141416', borderRadius: '16px' }}>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</p>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No venues yet</h3>
                <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px' }}>
                  Claim a venue from the map to manage it here.
                </p>
                <Link
                  href="/"
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    background: '#ab67f7',
                    borderRadius: '10px',
                    color: 'white',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  Browse Venues
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myVenues.map((venue) => (
                  <div key={venue.id} style={{
                    padding: '20px',
                    background: '#141416',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>{venue.name}</h3>
                        <p style={{ fontSize: '14px', color: '#888' }}>{venue.address}</p>
                      </div>
                      <Link
                        href={`/venue/${venue.id}`}
                        style={{
                          padding: '10px 20px',
                          background: 'rgba(171,103,247,0.15)',
                          border: '1px solid rgba(171,103,247,0.3)',
                          borderRadius: '10px',
                          color: '#ab67f7',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontWeight: 600,
                        }}
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Brands Tab */}
        {activeTab === 'brands' && (
          <div>
            {myBrands.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#141416', borderRadius: '16px' }}>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>🎵</p>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No brands yet</h3>
                <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px' }}>
                  Create a brand to promote your events.
                </p>
                <button
                  onClick={() => alert('Brand creation coming soon! Contact us to set up your brand.')}
                  style={{
                    padding: '12px 24px',
                    background: '#ab67f7',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Create Brand
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myBrands.map((brand) => (
                  <div key={brand.id} style={{
                    padding: '20px',
                    background: '#141416',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                        }}>
                          🎵
                        </div>
                        <div>
                          <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '2px' }}>{brand.name}</h3>
                          <p style={{ fontSize: '13px', color: '#888' }}>@{brand.slug}</p>
                        </div>
                      </div>
                      <Link
                        href={`/brand/${brand.slug}`}
                        style={{
                          padding: '10px 20px',
                          background: 'rgba(171,103,247,0.15)',
                          border: '1px solid rgba(171,103,247,0.3)',
                          borderRadius: '10px',
                          color: '#ab67f7',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontWeight: 600,
                        }}
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Claims Tab */}
        {activeTab === 'claims' && (
          <div>
            {claims.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#141416', borderRadius: '16px' }}>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>📋</p>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No claim requests</h3>
                <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px' }}>
                  When you claim a venue or event, your requests will appear here.
                </p>
                <Link
                  href="/"
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    background: '#ab67f7',
                    borderRadius: '10px',
                    color: 'white',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  Browse Events
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {claims.map((claim) => {
                  const status = getStatusBadge(claim.status)
                  const name = claim.claim_type === 'event' 
                    ? claim.events?.title 
                    : claim.venues?.name
                  
                  return (
                    <div key={claim.id} style={{
                      padding: '20px',
                      background: '#141416',
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '18px' }}>
                              {claim.claim_type === 'event' ? '📅' : '🏢'}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              color: '#888',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}>
                              {claim.claim_type} claim
                            </span>
                          </div>
                          <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>
                            {name || 'Unknown'}
                          </h3>
                          <p style={{ fontSize: '13px', color: '#888' }}>
                            Submitted {formatDate(claim.created_at)}
                          </p>
                        </div>
                        <span style={{
                          padding: '6px 12px',
                          background: status.bg,
                          color: status.color,
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '6px',
                        }}>
                          {status.text}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
