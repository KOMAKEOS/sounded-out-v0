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
  
  // Auth state - NOW WITH PASSWORD
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  
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
  // AUTH HANDLERS - EMAIL/PASSWORD
  // ============================================================================
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    setAuthSuccess('')
    
    if (!email || !password) {
      setAuthError('Please enter both email and password')
      setAuthLoading(false)
      return
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setAuthError('Invalid email or password. Please try again.')
      } else {
        setAuthError(error.message)
      }
    } else {
      setAuthSuccess('Signed in successfully!')
      setEmail('')
      setPassword('')
    }
    setAuthLoading(false)
  }
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    setAuthSuccess('')
    
    if (!email || !password || !confirmPassword) {
      setAuthError('Please fill in all fields')
      setAuthLoading(false)
      return
    }
    
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match')
      setAuthLoading(false)
      return
    }
    
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters')
      setAuthLoading(false)
      return
    }
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/portal`,
      },
    })
    
    if (error) {
      setAuthError(error.message)
    } else {
      setAuthSuccess('Account created! Please check your email to verify your account.')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setFullName('')
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
  // EVENT HANDLERS
  // ============================================================================
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddEventLoading(true)
    setAddEventMessage('')
    
    if (!addEventForm.title || !addEventForm.venue_id || !addEventForm.start_date) {
      setAddEventMessage('Please fill in required fields')
      setAddEventLoading(false)
      return
    }
    
    const startDateTime = `${addEventForm.start_date}T${addEventForm.start_time}:00`
    const endDateTime = addEventForm.end_time ? `${addEventForm.start_date}T${addEventForm.end_time}:00` : null
    
    const { error } = await supabase.from('events').insert({
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
      status: 'pending',
      is_claimed: true,
    })
    
    if (error) {
      setAddEventMessage(`Error: ${error.message}`)
    } else {
      setAddEventMessage('Event submitted! It will be reviewed shortly.')
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
      setShowAddEvent(false)
      // Reload events
      if (user) loadMyData(user.id)
    }
    setAddEventLoading(false)
  }
  
  // ============================================================================
  // RENDER - LOADING
  // ============================================================================
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    )
  }
  
  // ============================================================================
  // RENDER - AUTH SCREEN
  // ============================================================================
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <Link href="/" style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo.svg" alt="Sounded Out" style={{ height: '24px' }} />
        </Link>
        
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Partner Portal</h1>
            <p style={{ fontSize: '14px', color: '#888' }}>
              {authMode === 'signin' ? 'Sign in to manage your events' : 'Create an account to get started'}
            </p>
          </div>
          
          {/* Auth Mode Toggle */}
          <div style={{ display: 'flex', marginBottom: '24px', background: '#141416', borderRadius: '10px', padding: '4px' }}>
            <button
              onClick={() => { setAuthMode('signin'); setAuthError(''); setAuthSuccess('') }}
              style={{
                flex: 1,
                padding: '10px',
                background: authMode === 'signin' ? '#ab67f7' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: authMode === 'signin' ? 'white' : '#888',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccess('') }}
              style={{
                flex: 1,
                padding: '10px',
                background: authMode === 'signup' ? '#ab67f7' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: authMode === 'signup' ? 'white' : '#888',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Sign Up
            </button>
          </div>
          
          {/* Messages */}
          {authError && (
            <div style={{ padding: '12px 16px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#f87171' }}>{authError}</p>
            </div>
          )}
          
          {authSuccess && (
            <div style={{ padding: '12px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#22c55e' }}>{authSuccess}</p>
            </div>
          )}
          
          {/* Sign In Form */}
          {authMode === 'signin' && (
            <form onSubmit={handleSignIn}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#141416',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#141416',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                />
              </div>
              
              <button
                type="submit"
                disabled={authLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#ab67f7',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: authLoading ? 'not-allowed' : 'pointer',
                  opacity: authLoading ? 0.7 : 1,
                }}
              >
                {authLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}
          
          {/* Sign Up Form */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignUp}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#141416',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#141416',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#141416',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                />
                <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>At least 6 characters</p>
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#141416',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                />
              </div>
              
              <button
                type="submit"
                disabled={authLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#ab67f7',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: authLoading ? 'not-allowed' : 'pointer',
                  opacity: authLoading ? 0.7 : 1,
                }}
              >
                {authLoading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}
          
          <p style={{ fontSize: '12px', color: '#666', textAlign: 'center', marginTop: '24px' }}>
            By signing in, you agree to our{' '}
            <Link href="/terms" style={{ color: '#ab67f7', textDecoration: 'none' }}>Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" style={{ color: '#ab67f7', textDecoration: 'none' }}>Privacy Policy</Link>
          </p>
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // RENDER - PORTAL DASHBOARD
  // ============================================================================
  const formatDate = (d: string): string => {
    return new Date(d).toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white' }}>
      {/* Header */}
      <header style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo.svg" alt="Sounded Out" style={{ height: '24px' }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', color: '#888' }}>{user?.email}</span>
          <button
            onClick={handleSignOut}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.06)',
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
      
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Partner Dashboard</h1>
        
        {/* Brands */}
        {myBrands.length > 0 && (
          <div style={{ marginBottom: '24px', padding: '16px', background: '#141416', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#888', marginBottom: '12px' }}>Your Brands</h2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {myBrands.map((brand: Brand) => (
                <div key={brand.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(171,103,247,0.1)', borderRadius: '8px' }}>
                  {brand.logo_url && <img src={brand.logo_url} alt="" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />}
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{brand.name}</span>
                  {brand.is_verified && <span style={{ color: '#ab67f7' }}>✓</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('events')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'events' ? '#ab67f7' : 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: '8px',
              color: activeTab === 'events' ? 'white' : '#888',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            My Events ({myEvents.length})
          </button>
          <button
            onClick={() => setShowAddEvent(true)}
            style={{
              padding: '10px 20px',
              background: 'rgba(171,103,247,0.15)',
              border: '1px solid rgba(171,103,247,0.3)',
              borderRadius: '8px',
              color: '#ab67f7',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            + Add Event
          </button>
        </div>
        
        {/* Events List */}
        {myEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📅</p>
            <p style={{ fontSize: '16px', color: '#888', marginBottom: '8px' }}>No events yet</p>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>Add your first event to get started</p>
            <button
              onClick={() => setShowAddEvent(true)}
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
              Add Event
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myEvents.map((event: Event) => (
              <div key={event.id} style={{ padding: '16px', background: '#141416', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{event.title}</h3>
                    <p style={{ fontSize: '13px', color: '#888' }}>{event.venue?.name}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {event.is_verified && <span style={{ padding: '4px 8px', background: 'rgba(34,197,94,0.15)', borderRadius: '4px', fontSize: '11px', color: '#22c55e' }}>Verified</span>}
                    {event.sold_out && <span style={{ padding: '4px 8px', background: 'rgba(248,113,113,0.15)', borderRadius: '4px', fontSize: '11px', color: '#f87171' }}>Sold Out</span>}
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#ab67f7' }}>{formatDate(event.start_time)}</p>
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* Add Event Modal */}
      {showAddEvent && (
        <div 
          onClick={() => setShowAddEvent(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#141416', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Add New Event</h2>
              <button onClick={() => setShowAddEvent(false)} style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#888', fontSize: '16px', cursor: 'pointer' }}>×</button>
            </div>
            
            {addEventMessage && (
              <div style={{ padding: '12px', background: addEventMessage.includes('Error') ? 'rgba(248,113,113,0.1)' : 'rgba(34,197,94,0.1)', borderRadius: '8px', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: addEventMessage.includes('Error') ? '#f87171' : '#22c55e' }}>{addEventMessage}</p>
              </div>
            )}
            
            <form onSubmit={handleAddEvent}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Event Title *</label>
                <input
                  type="text"
                  value={addEventForm.title}
                  onChange={(e) => setAddEventForm({ ...addEventForm, title: e.target.value })}
                  required
                  style={{ width: '100%', padding: '12px', background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Venue *</label>
                <select
                  value={addEventForm.venue_id}
                  onChange={(e) => setAddEventForm({ ...addEventForm, venue_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '12px', background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }}
                >
                  <option value="">Select venue</option>
                  {venues.map((v: Venue) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Date *</label>
                  <input
                    type="date"
                    value={addEventForm.start_date}
                    onChange={(e) => setAddEventForm({ ...addEventForm, start_date: e.target.value })}
                    required
                    style={{ width: '100%', padding: '12px', background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Start Time *</label>
                  <input
                    type="time"
                    value={addEventForm.start_time}
                    onChange={(e) => setAddEventForm({ ...addEventForm, start_time: e.target.value })}
                    required
                    style={{ width: '100%', padding: '12px', background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Genres (comma separated)</label>
                <input
                  type="text"
                  value={addEventForm.genres}
                  onChange={(e) => setAddEventForm({ ...addEventForm, genres: e.target.value })}
                  placeholder="e.g. techno, house"
                  style={{ width: '100%', padding: '12px', background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Price Min (£)</label>
                  <input
                    type="number"
                    value={addEventForm.price_min}
                    onChange={(e) => setAddEventForm({ ...addEventForm, price_min: e.target.value })}
                    placeholder="0 for free"
                    style={{ width: '100%', padding: '12px', background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Price Max (£)</label>
                  <input
                    type="number"
                    value={addEventForm.price_max}
                    onChange={(e) => setAddEventForm({ ...addEventForm, price_max: e.target.value })}
                    style={{ width: '100%', padding: '12px', background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Ticket URL</label>
                <input
                  type="url"
                  value={addEventForm.event_url}
                  onChange={(e) => setAddEventForm({ ...addEventForm, event_url: e.target.value })}
                  placeholder="https://..."
                  style={{ width: '100%', padding: '12px', background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }}
                />
              </div>
              
              <button
                type="submit"
                disabled={addEventLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#ab67f7',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: addEventLoading ? 'not-allowed' : 'pointer',
                  opacity: addEventLoading ? 0.7 : 1,
                }}
              >
                {addEventLoading ? 'Submitting...' : 'Submit Event'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
