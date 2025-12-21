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

type Brand = {
  id: string
  name: string
  slug: string | null
  logo_url: string | null
  instagram_url: string | null
  is_verified: boolean
}

type Venue = {
  id: string
  name: string
  address: string
}

type Event = {
  id: string
  title: string
  start_time: string
  end_time: string | null
  venue_id: string
  brand_id: string | null
  is_claimed: boolean
  is_verified: boolean
  sold_out: boolean
  price_min: number | null
  price_max: number | null
  venue?: Venue
}

// ============================================================================
// PARTNER PORTAL
// ============================================================================
export default function PortalPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [myBrands, setMyBrands] = useState<Brand[]>([])
  const [myEvents, setMyEvents] = useState<Event[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [activeTab, setActiveTab] = useState<'events' | 'add'>('events')
  
  // Auth state
  const [email, setEmail] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  
  // Add event form
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [addEventForm, setAddEventForm] = useState({
    title: '',
    venue_id: '',
    brand_id: '',
    start_date: '',
    start_time: '22:00',
    end_time: '',
    genres: '',
    description: '',
    event_url: '',
    price_min: '',
    price_max: '',
  })
  const [addEventLoading, setAddEventLoading] = useState(false)
  const [addEventMessage, setAddEventMessage] = useState('')
  
  // ============================================================================
  // AUTH & DATA LOADING
  // ============================================================================
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
        loadMyData(session.user.id)
        loadVenues()
      }
      setLoading(false)
    })
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
        loadMyData(session.user.id)
        loadVenues()
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
  
  const loadVenues = async () => {
    const { data } = await supabase
      .from('venues')
      .select('id, name, address')
      .order('name')
    
    if (data) setVenues(data)
  }
  
  const loadMyData = async (userId: string) => {
    // Load brands I'm a member of
    const { data: brandMemberships } = await supabase
      .from('brand_members')
      .select('brand_id, brands(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
    
    if (brandMemberships && brandMemberships.length > 0) {
      const brands = brandMemberships.map((bm: any) => bm.brands).filter(Boolean)
      setMyBrands(brands)
      
      // Load events for all my brands
      if (brands.length > 0) {
        const brandIds = brands.map((b: Brand) => b.id)
        const { data: brandEvents } = await supabase
          .from('events')
          .select('*, venue:venues(id, name, address)')
          .in('brand_id', brandIds)
          .order('start_time', { ascending: false })
        
        if (brandEvents) {
          setMyEvents(brandEvents)
          // Set default brand for add event form
          if (brands.length > 0) {
            setAddEventForm(prev => ({ ...prev, brand_id: brands[0].id }))
          }
          return
        }
      }
    }
    
    // Fallback: Load events I own directly (legacy)
    const { data: directEvents } = await supabase
      .from('entity_claims')
      .select('event_id, events(*, venue:venues(id, name, address))')
      .eq('user_id', userId)
      .eq('claim_type', 'event')
      .eq('is_active', true)
    
    if (directEvents) {
      setMyEvents(directEvents.map((e: any) => e.events).filter(Boolean))
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
    setMyBrands([])
    setMyEvents([])
  }
  
  // ============================================================================
  // ADD EVENT HANDLER
  // ============================================================================
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddEventLoading(true)
    setAddEventMessage('')
    
    try {
      // Combine date and time
      const startDateTime = `${addEventForm.start_date}T${addEventForm.start_time}:00`
      const endDateTime = addEventForm.end_time 
        ? `${addEventForm.start_date}T${addEventForm.end_time}:00`
        : null
      
      const { error } = await supabase
        .from('events')
        .insert({
          title: addEventForm.title,
          venue_id: addEventForm.venue_id,
          brand_id: addEventForm.brand_id || null,
          start_time: startDateTime,
          end_time: endDateTime,
          genres: addEventForm.genres || null,
          description: addEventForm.description || null,
          event_url: addEventForm.event_url || null,
          price_min: addEventForm.price_min ? parseFloat(addEventForm.price_min) : null,
          price_max: addEventForm.price_max ? parseFloat(addEventForm.price_max) : null,
          is_claimed: true,
          claimed_by_user_id: user.id,
        })
      
      if (error) throw error
      
      setAddEventMessage('Event created successfully!')
      setAddEventForm({
        title: '',
        venue_id: '',
        brand_id: myBrands[0]?.id || '',
        start_date: '',
        start_time: '22:00',
        end_time: '',
        genres: '',
        description: '',
        event_url: '',
        price_min: '',
        price_max: '',
      })
      
      // Reload events
      loadMyData(user.id)
      
      // Switch to events tab after 2 seconds
      setTimeout(() => {
        setActiveTab('events')
        setAddEventMessage('')
      }, 2000)
      
    } catch (error: any) {
      setAddEventMessage(`Error: ${error.message}`)
    }
    
    setAddEventLoading(false)
  }
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  // Loading state
  if (loading) {
    return (
      <div style={{
        height: '100vh',
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
        height: '100vh',
        background: '#0a0a0b',
        color: 'white',
        padding: '20px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
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
      height: '100vh',
      background: '#0a0a0b',
      color: 'white',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/">
            <img src="/logo.svg" alt="Sounded Out" style={{ height: '24px', cursor: 'pointer' }} />
          </Link>
          <span style={{ color: '#666', fontSize: '12px' }}>Partner Portal</span>
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
      <main style={{ padding: '24px 20px 100px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Brand info (if user has brands) */}
        {myBrands.length > 0 && (
          <div style={{
            padding: '16px',
            background: '#141416',
            borderRadius: '14px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {myBrands[0].logo_url ? (
              <img 
                src={myBrands[0].logo_url} 
                alt="" 
                style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }} 
              />
            ) : (
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 700,
              }}>
                {myBrands[0].name.charAt(0)}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{myBrands[0].name}</h2>
                {myBrands[0].is_verified && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    background: '#ab67f7',
                    borderRadius: '50%',
                    fontSize: '10px',
                  }}>✓</span>
                )}
              </div>
              <p style={{ fontSize: '13px', color: '#888' }}>
                {myEvents.length} event{myEvents.length !== 1 ? 's' : ''}
              </p>
            </div>
            {myBrands[0].instagram_url && (
              <a 
                href={myBrands[0].instagram_url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ fontSize: '20px' }}
              >
                📸
              </a>
            )}
          </div>
        )}
        
        {/* Welcome (if no brands) */}
        {myBrands.length === 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
              Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}
            </h1>
            <p style={{ color: '#888', fontSize: '15px' }}>
              Manage your events on Sounded Out
            </p>
          </div>
        )}
        
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
          {myBrands.length > 0 && (
            <button
              onClick={() => setActiveTab('add')}
              style={{
                padding: '10px 20px',
                background: activeTab === 'add' ? '#ab67f7' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '10px',
                color: activeTab === 'add' ? 'white' : '#888',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '16px' }}>+</span> Add Event
            </button>
          )}
        </div>
        
        {/* Events Tab */}
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
                              background: '#ab67f7',
                              borderRadius: '50%',
                              fontSize: '9px',
                              color: 'white',
                            }}>✓</span>
                          )}
                          {event.sold_out && (
                            <span style={{
                              padding: '2px 6px',
                              background: 'rgba(248,113,113,0.15)',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              color: '#f87171',
                            }}>SOLD OUT</span>
                          )}
                        </div>
                        <p style={{ fontSize: '13px', color: '#888' }}>
                          {event.venue?.name} · {new Date(event.start_time).toLocaleDateString('en-GB', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short',
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
        
        {/* Add Event Tab */}
        {activeTab === 'add' && myBrands.length > 0 && (
          <div style={{
            background: '#141416',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Add New Event</h3>
            
            {addEventMessage && (
              <div style={{
                padding: '12px',
                background: addEventMessage.includes('Error') ? 'rgba(248,113,113,0.15)' : 'rgba(34,197,94,0.15)',
                borderRadius: '10px',
                marginBottom: '20px',
                fontSize: '14px',
                color: addEventMessage.includes('Error') ? '#f87171' : '#22c55e',
              }}>
                {addEventMessage}
              </div>
            )}
            
            <form onSubmit={handleAddEvent}>
              {/* Event Title */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={addEventForm.title}
                  onChange={(e) => setAddEventForm({ ...addEventForm, title: e.target.value })}
                  placeholder="Friday Night Techno"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: '#1e1e24',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
              
              {/* Venue */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                  Venue *
                </label>
                <select
                  required
                  value={addEventForm.venue_id}
                  onChange={(e) => setAddEventForm({ ...addEventForm, venue_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: '#1e1e24',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  <option value="">Select venue...</option>
                  {venues.map(venue => (
                    <option key={venue.id} value={venue.id}>{venue.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={addEventForm.start_date}
                    onChange={(e) => setAddEventForm({ ...addEventForm, start_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: '#1e1e24',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={addEventForm.start_time}
                    onChange={(e) => setAddEventForm({ ...addEventForm, start_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: '#1e1e24',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                    End Time
                  </label>
                  <input
                    type="time"
                    value={addEventForm.end_time}
                    onChange={(e) => setAddEventForm({ ...addEventForm, end_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: '#1e1e24',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
              
              {/* Genres */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                  Genres (comma separated)
                </label>
                <input
                  type="text"
                  value={addEventForm.genres}
                  onChange={(e) => setAddEventForm({ ...addEventForm, genres: e.target.value })}
                  placeholder="House, Techno, Disco"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: '#1e1e24',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
              
              {/* Prices */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                    Price Min (£)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={addEventForm.price_min}
                    onChange={(e) => setAddEventForm({ ...addEventForm, price_min: e.target.value })}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: '#1e1e24',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                    Price Max (£)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={addEventForm.price_max}
                    onChange={(e) => setAddEventForm({ ...addEventForm, price_max: e.target.value })}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: '#1e1e24',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
              
              {/* Ticket URL */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                  Ticket URL
                </label>
                <input
                  type="url"
                  value={addEventForm.event_url}
                  onChange={(e) => setAddEventForm({ ...addEventForm, event_url: e.target.value })}
                  placeholder="https://ra.co/events/..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: '#1e1e24',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
              
              {/* Description */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  value={addEventForm.description}
                  onChange={(e) => setAddEventForm({ ...addEventForm, description: e.target.value })}
                  rows={3}
                  placeholder="Tell people about your event..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: '#1e1e24',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
              
              {/* Submit */}
              <button
                type="submit"
                disabled={addEventLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: addEventLoading ? '#666' : 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: addEventLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {addEventLoading ? 'Creating...' : 'Create Event'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
