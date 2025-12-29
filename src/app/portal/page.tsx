'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

// ============================================================================
// TYPES
// ============================================================================
type Brand = {
  id: string
  name: string
  slug: string
  profile_image_url: string | null
  is_verified: boolean
  follower_count: number
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
  status: string
  sold_out: boolean
  price_min: number | null
  price_max: number | null
  venue?: Venue
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function PortalPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [myBrand, setMyBrand] = useState<Brand | null>(null)
  const [myEvents, setMyEvents] = useState<Event[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  
  // Auth
  const [email, setEmail] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  
  // Add event
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [eventForm, setEventForm] = useState({
    title: '',
    venue_id: '',
    start_date: '',
    start_time: '22:00',
    end_time: '03:00',
    description: '',
    event_url: '',
    image_url: '',
    price_min: '',
    price_max: '',
    genres: '',
  })
  const [addingEvent, setAddingEvent] = useState(false)
  const [eventMessage, setEventMessage] = useState('')

  // ============================================================================
  // LOAD DATA
  // ============================================================================
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadData(session.user.id)
      }
      setLoading(false)
    })
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadData(session.user.id)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
  const loadData = async (userId: string) => {
    // Load user's brand
    const { data: brand } = await supabase
      .from('brands')
      .select('*')
      .eq('owner_user_id', userId)
      .single()
    
    if (brand) {
      setMyBrand(brand)
      
      // Load events for this brand
      const { data: events } = await supabase
        .from('events')
        .select('*, venue:venues(id, name, address)')
        .eq('brand_id', brand.id)
        .order('start_time', { ascending: false })
      
      if (events) setMyEvents(events)
    }
    
    // Load venues
    const { data: venueList } = await supabase
      .from('venues')
      .select('id, name, address')
      .order('name')
    
    if (venueList) setVenues(venueList)
  }
  
  // ============================================================================
  // AUTH
  // ============================================================================
  const handleLogin = async (e: React.FormEvent) => {
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
      setAuthMessage('✓ Check your email for the login link!')
    }
    setAuthLoading(false)
  }
  
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setMyBrand(null)
    setMyEvents([])
  }
  
  // ============================================================================
  // ADD EVENT
  // ============================================================================
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!myBrand) {
      setEventMessage('Please create your brand first')
      return
    }
    
    setAddingEvent(true)
    setEventMessage('')
    
    // Combine date and time
    const startDateTime = `${eventForm.start_date}T${eventForm.start_time}:00`
    let endDateTime = null
    if (eventForm.end_time) {
      // Handle end time on next day if it's before start time
      const endDate = eventForm.end_time < eventForm.start_time
        ? new Date(new Date(eventForm.start_date).getTime() + 86400000).toISOString().split('T')[0]
        : eventForm.start_date
      endDateTime = `${endDate}T${eventForm.end_time}:00`
    }
    
    const { error } = await supabase
      .from('events')
      .insert({
        title: eventForm.title,
        venue_id: eventForm.venue_id || null,
        brand_id: myBrand.id,
        start_time: startDateTime,
        end_time: endDateTime,
        description: eventForm.description || null,
        event_url: eventForm.event_url || null,
        image_url: eventForm.image_url || null,
        price_min: eventForm.price_min ? parseFloat(eventForm.price_min) : null,
        price_max: eventForm.price_max ? parseFloat(eventForm.price_max) : null,
        genres: eventForm.genres || null,
        status: 'published',
      })
    
    if (error) {
      setEventMessage(`Error: ${error.message}`)
    } else {
      setEventMessage('✓ Event added!')
      setShowAddEvent(false)
      setEventForm({
        title: '',
        venue_id: '',
        start_date: '',
        start_time: '22:00',
        end_time: '03:00',
        description: '',
        event_url: '',
        image_url: '',
        price_min: '',
        price_max: '',
        genres: '',
      })
      loadData(user.id)
    }
    setAddingEvent(false)
  }
  
  // ============================================================================
  // RENDER - Loading
  // ============================================================================
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
      </div>
    )
  }
  
  // ============================================================================
  // RENDER - Login
  // ============================================================================
  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.loginBox}>
          <h1 style={styles.logo}>Sounded Out</h1>
          <h2 style={styles.loginTitle}>Partner Portal</h2>
          <p style={styles.loginSubtitle}>
            Sign in to manage your events and brand profile
          </p>
          
          <form onSubmit={handleLogin} style={styles.form}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={styles.input}
            />
            <button
              type="submit"
              disabled={authLoading}
              style={styles.primaryButton}
            >
              {authLoading ? 'Sending...' : 'Send Login Link'}
            </button>
          </form>
          
          {authMessage && (
            <p style={{
              ...styles.message,
              color: authMessage.includes('Error') ? '#f87171' : '#22c55e',
            }}>
              {authMessage}
            </p>
          )}
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // RENDER - Dashboard
  // ============================================================================
  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>Partner Portal</h1>
          <p style={styles.headerEmail}>{user.email}</p>
        </div>
        <button onClick={handleSignOut} style={styles.signOutButton}>
          Sign Out
        </button>
      </header>
      
      {/* Brand Section */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Your Brand</h2>
        
        {myBrand ? (
          <div style={styles.brandCard}>
            <div style={styles.brandInfo}>
              <div style={styles.brandAvatar}>
                {myBrand.profile_image_url ? (
                  <img
                    src={myBrand.profile_image_url}
                    alt={myBrand.name}
                    style={styles.brandAvatarImg}
                  />
                ) : (
                  <span style={styles.brandAvatarLetter}>
                    {myBrand.name.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <p style={styles.brandName}>
                  {myBrand.name}
                  {myBrand.is_verified && <span style={styles.verifiedBadge}>✓</span>}
                </p>
                <p style={styles.brandUrl}>soundedout.com/brand/{myBrand.slug}</p>
                <p style={styles.brandFollowers}>{myBrand.follower_count} followers</p>
              </div>
            </div>
            <div style={styles.brandActions}>
              <Link href={`/brand/${myBrand.slug}`} target="_blank" style={styles.secondaryButton}>
                View Page
              </Link>
              <Link href={`/portal/brand/${myBrand.id}`} style={styles.primaryButtonSmall}>
                Edit Profile
              </Link>
            </div>
          </div>
        ) : (
          <Link href="/portal/brand/new" style={styles.createBrandCard}>
            <span style={styles.createBrandIcon}>+</span>
            <div>
              <p style={styles.createBrandTitle}>Create Your Brand Profile</p>
              <p style={styles.createBrandSubtitle}>
                Set up your page so people can follow you and discover your events
              </p>
            </div>
          </Link>
        )}
      </section>
      
      {/* Events Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Your Events</h2>
          {myBrand && (
            <button
              onClick={() => setShowAddEvent(!showAddEvent)}
              style={styles.addButton}
            >
              {showAddEvent ? 'Cancel' : '+ Add Event'}
            </button>
          )}
        </div>
        
        {!myBrand && (
          <p style={styles.hint}>Create your brand first to add events</p>
        )}
        
        {/* Add Event Form */}
        {showAddEvent && myBrand && (
          <form onSubmit={handleAddEvent} style={styles.addEventForm}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Event Title *</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={e => setEventForm({...eventForm, title: e.target.value})}
                  placeholder="e.g. Techno Tuesday"
                  required
                  style={styles.input}
                />
              </div>
            </div>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Venue</label>
                <select
                  value={eventForm.venue_id}
                  onChange={e => setEventForm({...eventForm, venue_id: e.target.value})}
                  style={styles.input}
                >
                  <option value="">Select venue...</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Date *</label>
                <input
                  type="date"
                  value={eventForm.start_date}
                  onChange={e => setEventForm({...eventForm, start_date: e.target.value})}
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Start Time *</label>
                <input
                  type="time"
                  value={eventForm.start_time}
                  onChange={e => setEventForm({...eventForm, start_time: e.target.value})}
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>End Time</label>
                <input
                  type="time"
                  value={eventForm.end_time}
                  onChange={e => setEventForm({...eventForm, end_time: e.target.value})}
                  style={styles.input}
                />
              </div>
            </div>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Ticket Link</label>
                <input
                  type="url"
                  value={eventForm.event_url}
                  onChange={e => setEventForm({...eventForm, event_url: e.target.value})}
                  placeholder="https://..."
                  style={styles.input}
                />
              </div>
            </div>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Event Image URL</label>
                <input
                  type="url"
                  value={eventForm.image_url}
                  onChange={e => setEventForm({...eventForm, image_url: e.target.value})}
                  placeholder="https://..."
                  style={styles.input}
                />
              </div>
            </div>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Min Price (£)</label>
                <input
                  type="number"
                  value={eventForm.price_min}
                  onChange={e => setEventForm({...eventForm, price_min: e.target.value})}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Max Price (£)</label>
                <input
                  type="number"
                  value={eventForm.price_max}
                  onChange={e => setEventForm({...eventForm, price_max: e.target.value})}
                  placeholder="20"
                  min="0"
                  step="0.01"
                  style={styles.input}
                />
              </div>
            </div>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={e => setEventForm({...eventForm, description: e.target.value})}
                  placeholder="What's this event about?"
                  rows={3}
                  style={{...styles.input, resize: 'vertical'}}
                />
              </div>
            </div>
            
            {eventMessage && (
              <p style={{
                ...styles.message,
                color: eventMessage.includes('Error') ? '#f87171' : '#22c55e',
              }}>
                {eventMessage}
              </p>
            )}
            
            <button
              type="submit"
              disabled={addingEvent}
              style={styles.primaryButton}
            >
              {addingEvent ? 'Adding...' : 'Add Event'}
            </button>
          </form>
        )}
        
        {/* Events List */}
        {myEvents.length > 0 ? (
          <div style={styles.eventsList}>
            {myEvents.map(event => (
              <div key={event.id} style={styles.eventCard}>
                <div style={styles.eventInfo}>
                  <p style={styles.eventDate}>
                    {new Date(event.start_time).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p style={styles.eventTitle}>{event.title}</p>
                  <p style={styles.eventVenue}>{event.venue?.name || 'No venue'}</p>
                </div>
                <div style={styles.eventStatus}>
                  <span style={{
                    ...styles.statusBadge,
                    background: event.status === 'published' 
                      ? 'rgba(34,197,94,0.15)' 
                      : 'rgba(255,255,255,0.08)',
                    color: event.status === 'published' ? '#22c55e' : '#888',
                  }}>
                    {event.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : myBrand ? (
          <p style={styles.emptyState}>No events yet. Add your first event above!</p>
        ) : null}
      </section>
      
      {/* Quick Links */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Quick Links</h2>
        <div style={styles.quickLinks}>
          <Link href="/" style={styles.quickLink}>
            <span>🗺</span> View Map
          </Link>
          <Link href="/coming-up" style={styles.quickLink}>
            <span>📅</span> Coming Up Feed
          </Link>
          {myBrand && (
            <Link href={`/brand/${myBrand.slug}`} style={styles.quickLink}>
              <span>👤</span> Your Public Page
            </Link>
          )}
        </div>
      </section>
      
      <div style={{ height: '40px' }} />
      
      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0b; color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      `}</style>
    </div>
  )
}

// ============================================================================
// STYLES
// ============================================================================
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: '#0a0a0b',
    color: 'white',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0b',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(171,103,247,0.2)',
    borderTopColor: '#ab67f7',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  
  // Login
  loginBox: {
    maxWidth: '400px',
    margin: '0 auto',
    padding: '60px 20px',
    textAlign: 'center' as const,
  },
  logo: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#ab67f7',
    marginBottom: '8px',
  },
  loginTitle: {
    fontSize: '28px',
    fontWeight: 700,
    marginBottom: '8px',
  },
  loginSubtitle: {
    fontSize: '15px',
    color: '#888',
    marginBottom: '32px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: 'white',
    fontSize: '15px',
    outline: 'none',
  },
  primaryButton: {
    padding: '14px 24px',
    background: '#ab67f7',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  message: {
    marginTop: '16px',
    fontSize: '14px',
  },
  
  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: 700,
  },
  headerEmail: {
    fontSize: '13px',
    color: '#888',
    marginTop: '4px',
  },
  signOutButton: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    borderRadius: '8px',
    color: '#888',
    fontSize: '13px',
    cursor: 'pointer',
  },
  
  // Sections
  section: {
    padding: '24px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  
  // Brand
  brandCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    flexWrap: 'wrap' as const,
    gap: '16px',
  },
  brandInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  brandAvatar: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandAvatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  brandAvatarLetter: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'white',
  },
  brandName: {
    fontSize: '16px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  verifiedBadge: {
    width: '16px',
    height: '16px',
    background: '#ab67f7',
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
  },
  brandUrl: {
    fontSize: '13px',
    color: '#888',
    marginTop: '2px',
  },
  brandFollowers: {
    fontSize: '12px',
    color: '#666',
    marginTop: '2px',
  },
  brandActions: {
    display: 'flex',
    gap: '8px',
  },
  secondaryButton: {
    padding: '10px 16px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: '#888',
    textDecoration: 'none',
    fontSize: '13px',
  },
  primaryButtonSmall: {
    padding: '10px 16px',
    background: '#ab67f7',
    borderRadius: '8px',
    color: 'white',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 600,
  },
  createBrandCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '24px',
    background: 'rgba(171,103,247,0.1)',
    border: '2px dashed rgba(171,103,247,0.3)',
    borderRadius: '12px',
    textDecoration: 'none',
    color: '#ab67f7',
  },
  createBrandIcon: {
    fontSize: '32px',
    fontWeight: 300,
  },
  createBrandTitle: {
    fontSize: '16px',
    fontWeight: 700,
  },
  createBrandSubtitle: {
    fontSize: '13px',
    opacity: 0.8,
    marginTop: '4px',
  },
  
  // Events
  addButton: {
    padding: '8px 16px',
    background: '#ab67f7',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  hint: {
    fontSize: '14px',
    color: '#666',
  },
  addEventForm: {
    padding: '20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  formGroup: {
    flex: 1,
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#888',
    marginBottom: '6px',
  },
  eventsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  eventCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
  },
  eventInfo: {},
  eventDate: {
    fontSize: '12px',
    color: '#ab67f7',
    fontWeight: 600,
    marginBottom: '4px',
  },
  eventTitle: {
    fontSize: '15px',
    fontWeight: 600,
    marginBottom: '2px',
  },
  eventVenue: {
    fontSize: '13px',
    color: '#888',
  },
  eventStatus: {},
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'capitalize' as const,
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center' as const,
    color: '#666',
    fontSize: '14px',
  },
  
  // Quick Links
  quickLinks: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  quickLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    color: '#888',
    textDecoration: 'none',
    fontSize: '14px',
  },
}
