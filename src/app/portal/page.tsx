'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

// ============================================================================
// TYPES
// ============================================================================
type Profile = {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: 'admin' | 'partner'
}

type Venue = {
  id: string
  name: string
  address: string
  venue_type: string
  is_claimed: boolean
  is_verified: boolean
}

type Event = {
  id: string
  title: string
  start_time: string
  end_time: string | null
  venue_id: string
  is_claimed: boolean
  is_verified: boolean
  sold_out: boolean
  price_min: number | null
  price_max: number | null
}

// ============================================================================
// PARTNER PORTAL
// ============================================================================
export default function PortalPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [myVenues, setMyVenues] = useState<Venue[]>([])
  const [myEvents, setMyEvents] = useState<Event[]>([])
  const [activeTab, setActiveTab] = useState<'venues' | 'events'>('events')
  
  // Auth state
  const [email, setEmail] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  
  // ============================================================================
  // AUTH & DATA LOADING
  // ============================================================================
  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
        loadMyData(session.user.id)
      }
      setLoading(false)
    })
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
        loadMyData(session.user.id)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (data) setProfile(data)
  }
  
  const loadMyData = async (userId: string) => {
    // Load venues I own
    const { data: venues } = await supabase
      .from('entity_claims')
      .select('venue_id, venues(*)')
      .eq('user_id', userId)
      .eq('claim_type', 'venue')
      .eq('is_active', true)
    
    if (venues) {
      setMyVenues(venues.map((v: any) => v.venues).filter(Boolean))
    }
    
    // Load events I own
    const { data: events } = await supabase
      .from('entity_claims')
      .select('event_id, events(*)')
      .eq('user_id', userId)
      .eq('claim_type', 'event')
      .eq('is_active', true)
    
    if (events) {
      setMyEvents(events.map((e: any) => e.events).filter(Boolean))
    }
  }
  
  // ============================================================================
  // AUTH HANDLERS
  // ============================================================================
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthMessage('')
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/portal`,
      },
    })
    
    if (error) {
      setAuthMessage(`Error: ${error.message}`)
    } else {
      setAuthMessage('Check your email for the login link!')
    }
    setAuthLoading(false)
  }
  
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setMyVenues([])
    setMyEvents([])
  }
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ color: '#888' }}>Loading...</div>
      </div>
    )
  }
  
  // Not logged in - show login form
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0b',
        color: 'white',
        padding: '20px',
        overflowY: 'auto',
      }}>
        <div style={{ maxWidth: '400px', margin: '0 auto', paddingTop: '60px' }}>
          {/* Logo */}
          <Link href="/">
            <img 
              src="/logo.svg" 
              alt="Sounded Out" 
              style={{ height: '32px', marginBottom: '8px', cursor: 'pointer' }}
            />
          </Link>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '40px' }}>Partner Portal</p>
          
          {/* Login form */}
          <div style={{
            background: '#141416',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Sign in</h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
              Enter your email to receive a magic link
            </p>
            
            <form onSubmit={handleMagicLink}>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: '#1e1e24',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '15px',
                  marginBottom: '16px',
                  outline: 'none',
                }}
              />
              
              <button
                type="submit"
                disabled={authLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: authLoading ? '#666' : 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: authLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {authLoading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>
            
            {authMessage && (
              <p style={{
                marginTop: '16px',
                padding: '12px',
                background: authMessage.includes('Error') ? 'rgba(248,113,113,0.15)' : 'rgba(34,197,94,0.15)',
                borderRadius: '8px',
                fontSize: '13px',
                color: authMessage.includes('Error') ? '#f87171' : '#22c55e',
                textAlign: 'center',
              }}>
                {authMessage}
              </p>
            )}
          </div>
          
          <p style={{ 
            color: '#555', 
            fontSize: '12px', 
            textAlign: 'center', 
            marginTop: '24px',
            lineHeight: 1.6,
          }}>
            Don't have an account? <Link href="/" style={{ color: '#ab67f7' }}>Claim your venue or event</Link> on the map to get started.
          </p>
        </div>
      </div>
    )
  }
  
  // Logged in - show portal
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0b',
      color: 'white',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <Link href="/">
            <img src="/logo.svg" alt="Sounded Out" style={{ height: '24px', cursor: 'pointer' }} />
          </Link>
          <span style={{ color: '#666', fontSize: '12px', marginLeft: '10px' }}>Partner Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#888', fontSize: '13px' }}>{profile?.email}</span>
          <button
            onClick={handleSignOut}
            style={{
              padding: '8px 14px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              color: '#888',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      
      {/* Content */}
      <main style={{ padding: '24px 20px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Welcome */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}
          </h1>
          <p style={{ color: '#888', fontSize: '15px' }}>
            Manage your venues and events on Sounded Out
          </p>
        </div>
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('events')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'events' ? '#ab67f7' : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '10px',
              color: activeTab === 'events' ? 'white' : '#888',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            My Events ({myEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('venues')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'venues' ? '#ab67f7' : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '10px',
              color: activeTab === 'venues' ? 'white' : '#888',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            My Venues ({myVenues.length})
          </button>
        </div>
        
        {/* Content based on tab */}
        {activeTab === 'events' && (
          <div>
            {myEvents.length === 0 ? (
              <div style={{
                padding: '40px',
                background: '#141416',
                borderRadius: '16px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <p style={{ color: '#888', marginBottom: '16px' }}>No events yet</p>
                <Link 
                  href="/"
                  style={{
                    color: '#ab67f7',
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}
                >
                  Claim an event on the map →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myEvents.map(event => (
                  <Link
                    key={event.id}
                    href={`/portal/event/${event.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{
                      padding: '18px',
                      background: '#141416',
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background 150ms ease',
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>{event.title}</span>
                          {event.is_verified && (
                            <span style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '16px',
                              height: '16px',
                              background: '#3b82f6',
                              borderRadius: '50%',
                              fontSize: '9px',
                              color: 'white',
                            }}>✓</span>
                          )}
                        </div>
                        <p style={{ fontSize: '13px', color: '#888' }}>
                          {new Date(event.start_time).toLocaleDateString('en-GB', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span style={{ color: '#666', fontSize: '20px' }}>→</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'venues' && (
          <div>
            {myVenues.length === 0 ? (
              <div style={{
                padding: '40px',
                background: '#141416',
                borderRadius: '16px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <p style={{ color: '#888', marginBottom: '16px' }}>No venues yet</p>
                <Link 
                  href="/"
                  style={{
                    color: '#ab67f7',
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}
                >
                  Claim a venue on the map →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myVenues.map(venue => (
                  <Link
                    key={venue.id}
                    href={`/portal/venue/${venue.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{
                      padding: '18px',
                      background: '#141416',
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>{venue.name}</span>
                          {venue.is_verified && (
                            <span style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '16px',
                              height: '16px',
                              background: '#3b82f6',
                              borderRadius: '50%',
                              fontSize: '9px',
                              color: 'white',
                            }}>✓</span>
                          )}
                        </div>
                        <p style={{ fontSize: '13px', color: '#888' }}>{venue.address}</p>
                      </div>
                      <span style={{ color: '#666', fontSize: '20px' }}>→</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
