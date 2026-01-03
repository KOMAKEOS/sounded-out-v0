'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

// ============================================================================
// PARTNER PORTAL - Full event management for promoters
// Includes: Date/time pickers, description, image upload, verified badge
// ============================================================================

interface Venue {
  id: string
  name: string
  address: string
}

interface Event {
  id: string
  title: string
  start_time: string
  end_time: string | null
  description: string | null
  genres: string | null
  price_min: number | null
  price_max: number | null
  event_url: string | null
  image_url: string | null
  status: string
  venue: Venue
}

interface Partner {
  id: string
  name: string
  email: string
  is_verified: boolean
  brand_name: string | null
  logo_url: string | null
}

export default function PortalPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [partner, setPartner] = useState<Partner | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Auth states
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authConfirmPassword, setAuthConfirmPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')

  // New event form
  const [eventForm, setEventForm] = useState({
    title: '',
    venue_id: '',
    start_date: '',
    start_time: '21:00',
    end_date: '',
    end_time: '',
    description: '',
    genres: '',
    price_min: '',
    price_max: '',
    event_url: '',
    image_url: '',
  })

  // Image upload state
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
    loadVenues()
  }, [])

  const checkAuth = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (authUser) {
      setUser({ id: authUser.id, email: authUser.email })
      await loadPartnerData(authUser.id)
    }
    
    setLoading(false)
  }

  const loadPartnerData = async (userId: string) => {
    // Load partner profile
    const { data: partnerData } = await supabase
      .from('partners')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (partnerData) {
      setPartner(partnerData as Partner)
      
      // Load partner's events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*, venue:venues(*)')
        .eq('created_by', userId)
        .order('start_time', { ascending: false })

      if (eventsData) {
        setEvents(eventsData as unknown as Event[])
      }
    }
  }

  const loadVenues = async () => {
    const { data } = await supabase
      .from('venues')
      .select('id, name, address')
      .order('name')

    if (data) {
      setVenues(data as Venue[])
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthSubmitting(true)
    setAuthError('')

    try {
      if (authMode === 'signup') {
        if (authPassword !== authConfirmPassword) {
          throw new Error('Passwords do not match')
        }
        if (authPassword.length < 6) {
          throw new Error('Password must be at least 6 characters')
        }

        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        })

        if (error) throw error

        if (data.user) {
          // Create partner profile
          await supabase.from('partners').insert({
            user_id: data.user.id,
            name: authName,
            email: authEmail,
            is_verified: false,
          })

          setUser({ id: data.user.id, email: data.user.email })
          await loadPartnerData(data.user.id)
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        })

        if (error) throw error

        if (data.user) {
          setUser({ id: data.user.id, email: data.user.email })
          await loadPartnerData(data.user.id)
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed')
    }

    setAuthSubmitting(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setUploading(true)
    setError('')

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target?.result as string)
      reader.readAsDataURL(file)

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { data, error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName)

      setEventForm({ ...eventForm, image_url: publicUrl })
    } catch (err: any) {
      setError('Failed to upload image: ' + err.message)
      setImagePreview(null)
    }

    setUploading(false)
  }

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Combine date and time
      const startDateTime = `${eventForm.start_date}T${eventForm.start_time}:00`
      const endDateTime = eventForm.end_date && eventForm.end_time 
        ? `${eventForm.end_date}T${eventForm.end_time}:00`
        : null

      const { error: insertError } = await supabase.from('events').insert({
        title: eventForm.title,
        venue_id: eventForm.venue_id,
        start_time: startDateTime,
        end_time: endDateTime,
        description: eventForm.description || null,
        genres: eventForm.genres || null,
        price_min: eventForm.price_min ? parseFloat(eventForm.price_min) : null,
        price_max: eventForm.price_max ? parseFloat(eventForm.price_max) : null,
        event_url: eventForm.event_url || null,
        image_url: eventForm.image_url || null,
        status: 'pending', // Requires approval
        created_by: user.id,
      })

      if (insertError) throw insertError

      setSuccess('Event submitted for review! We\'ll notify you when it\'s approved.')
      setShowAddEvent(false)
      setEventForm({
        title: '',
        venue_id: '',
        start_date: '',
        start_time: '21:00',
        end_date: '',
        end_time: '',
        description: '',
        genres: '',
        price_min: '',
        price_max: '',
        event_url: '',
        image_url: '',
      })
      setImagePreview(null)

      // Reload events
      await loadPartnerData(user.id)
    } catch (err: any) {
      setError(err.message || 'Failed to create event')
    }

    setSaving(false)
  }

  // Loading state
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#999' }}>Loading...</p>
      </div>
    )
  }

  // Auth screen
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white' }}>
        <header style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ maxWidth: '400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/">
              <img src="/logo.svg" alt="Sounded Out" style={{ height: '24px' }} />
            </Link>
          </div>
        </header>

        <main style={{ maxWidth: '400px', margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>
              🎵
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Partner Portal</h1>
            <p style={{ fontSize: '14px', color: '#777' }}>
              Manage your events and reach Newcastle's nightlife audience
            </p>
          </div>

          {/* Auth toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', marginBottom: '24px' }}>
            <button
              onClick={() => setAuthMode('signin')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: authMode === 'signin' ? '#ab67f7' : 'transparent',
                color: authMode === 'signin' ? 'white' : '#777',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: authMode === 'signup' ? '#ab67f7' : 'transparent',
                color: authMode === 'signup' ? 'white' : '#777',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign Up
            </button>
          </div>

          {authError && (
            <div style={{ padding: '12px 16px', background: 'rgba(248,113,113,0.15)', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', color: '#f87171' }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth}>
            {authMode === 'signup' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#777', marginBottom: '6px' }}>Your Name *</label>
                <input
                  type="text"
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="John Smith"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#141416',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#777', marginBottom: '6px' }}>Email *</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@email.com"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: '#141416',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#777', marginBottom: '6px' }}>Password *</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: '#141416',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>

            {authMode === 'signup' && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#777', marginBottom: '6px' }}>Confirm Password *</label>
                <input
                  type="password"
                  required
                  value={authConfirmPassword}
                  onChange={(e) => setAuthConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#141416',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              style={{
                width: '100%',
                padding: '16px',
                background: authSubmitting ? '#666' : 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '16px',
                fontWeight: 700,
                cursor: authSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {authSubmitting ? 'Please wait...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p style={{ fontSize: '12px', color: '#555', textAlign: 'center', marginTop: '24px', lineHeight: 1.5 }}>
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </main>
      </div>
    )
  }

  // Dashboard
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white' }}>
      {/* Header */}
      <header style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,10,11,0.95)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/">
            <img src="/logo.svg" alt="Sounded Out" style={{ height: '24px' }} />
          </Link>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {partner?.is_verified && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(171,103,247,0.15)', borderRadius: '20px', fontSize: '12px', color: '#ab67f7', fontWeight: 600 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#ab67f7">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01" fill="none" stroke="#ab67f7" strokeWidth="2"/>
                </svg>
                Verified Partner
              </span>
            )}
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                setUser(null)
                setPartner(null)
              }}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '8px',
                color: '#999',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 20px' }}>
        {/* Welcome */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
            Welcome back{partner?.name ? `, ${partner.name}` : ''}
          </h1>
          <p style={{ fontSize: '14px', color: '#777' }}>
            Manage your events and track performance
          </p>
        </div>

        {/* Success/Error messages */}
        {success && (
          <div style={{ padding: '16px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', color: '#22c55e' }}>
            {success}
          </div>
        )}
        {error && (
          <div style={{ padding: '16px', background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '12px', color: '#777', marginBottom: '8px' }}>Total Events</p>
            <p style={{ fontSize: '28px', fontWeight: 800, color: '#ab67f7' }}>{events.length}</p>
          </div>
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '12px', color: '#777', marginBottom: '8px' }}>Published</p>
            <p style={{ fontSize: '28px', fontWeight: 800, color: '#22c55e' }}>{events.filter(e => e.status === 'published').length}</p>
          </div>
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '12px', color: '#777', marginBottom: '8px' }}>Pending</p>
            <p style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>{events.filter(e => e.status === 'pending').length}</p>
          </div>
        </div>

        {/* Add Event Button */}
        <button
          onClick={() => setShowAddEvent(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '16px',
            background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
            border: 'none',
            borderRadius: '14px',
            color: 'white',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: '32px',
          }}
        >
          <span style={{ fontSize: '20px' }}>+</span>
          Add New Event
        </button>

        {/* Events List */}
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Your Events</h2>
        
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>🎵</p>
            <p style={{ fontSize: '16px', color: '#777', marginBottom: '8px' }}>No events yet</p>
            <p style={{ fontSize: '14px', color: '#555' }}>Create your first event to get started</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {events.map((event) => (
              <div
                key={event.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {event.image_url ? (
                  <img src={event.image_url} alt="" style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '60px', height: '60px', borderRadius: '10px', background: 'linear-gradient(135deg, #1a1a2e, #2d2d44)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎵</div>
                )}
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{event.title}</h3>
                  <p style={{ fontSize: '13px', color: '#777' }}>{event.venue?.name}</p>
                  <p style={{ fontSize: '12px', color: '#ab67f7' }}>
                    {new Date(event.start_time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {' · '}
                    {new Date(event.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                
                <span
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: event.status === 'published' ? 'rgba(34,197,94,0.15)' : event.status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(248,113,113,0.15)',
                    color: event.status === 'published' ? '#22c55e' : event.status === 'pending' ? '#f59e0b' : '#f87171',
                  }}
                >
                  {event.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Event Modal */}
      {showAddEvent && (
        <div
          onClick={() => setShowAddEvent(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              background: '#141416',
              borderRadius: '24px 24px 0 0',
              padding: '24px',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Add New Event</h2>
              <button
                onClick={() => setShowAddEvent(false)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#999',
                  fontSize: '16px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEvent}>
              {/* Image Upload */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#777', marginBottom: '8px' }}>
                  Event Image
                  <span style={{ color: '#555', marginLeft: '8px' }}>Recommended: 1200×630px (16:9)</span>
                </label>
                
                {imagePreview || eventForm.image_url ? (
                  <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', marginBottom: '8px' }}>
                    <img 
                      src={imagePreview || eventForm.image_url} 
                      alt="Preview" 
                      style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} 
                    />
                    <button
                      type="button"
                      onClick={() => { setImagePreview(null); setEventForm({ ...eventForm, image_url: '' }) }}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '32px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '2px dashed rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontSize: '32px' }}>📷</span>
                    <span style={{ fontSize: '14px', color: '#777' }}>
                      {uploading ? 'Uploading...' : 'Click to upload image'}
                    </span>
                  </label>
                )}
              </div>

              {/* Title */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#777', marginBottom: '6px' }}>Event Title *</label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="e.g. Saturday Night Techno"
                  style={inputStyle}
                />
              </div>

              {/* Venue */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#777', marginBottom: '6px' }}>Venue *</label>
                <select
                  required
                  value={eventForm.venue_id}
                  onChange={(e) => setEventForm({ ...eventForm, venue_id: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Select venue</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#777', marginBottom: '6px' }}>Start Date *</label>
                  <input
                    type="date"
                    required
                    value={eventForm.start_date}
                    onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#777', marginBottom: '6px' }}>Start Time *</label>
                  <input
                    type="time"
                    required
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#777', marginBottom: '6px' }}>End Date</label>
                  <input
                    type="date"
                    value={eventForm.end_date}
                    onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#777', marginBottom: '6px' }}>End Time</label>
                  <input
                    type="time"
                    value={eventForm.end_time}
                    onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#777', marginBottom: '6px' }}>Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Tell people about your event..."
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {/* Genres */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#777', marginBottom: '6px' }}>Genres</label>
                <input
                  type="text"
                  value={eventForm.genres}
                  onChange={(e) => setEventForm({ ...eventForm, genres: e.target.value })}
                  placeholder="e.g. Techno, House, Disco"
                  style={inputStyle}
                />
                <p style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>Separate multiple genres with commas</p>
              </div>

              {/* Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#777', marginBottom: '6px' }}>Min Price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={eventForm.price_min}
                    onChange={(e) => setEventForm({ ...eventForm, price_min: e.target.value })}
                    placeholder="0 for free"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#777', marginBottom: '6px' }}>Max Price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={eventForm.price_max}
                    onChange={(e) => setEventForm({ ...eventForm, price_max: e.target.value })}
                    placeholder="Leave empty if same"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Ticket URL */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#777', marginBottom: '6px' }}>Ticket URL</label>
                <input
                  type="url"
                  value={eventForm.event_url}
                  onChange={(e) => setEventForm({ ...eventForm, event_url: e.target.value })}
                  placeholder="https://ra.co/events/..."
                  style={inputStyle}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: saving ? '#666' : 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                  border: 'none',
                  borderRadius: '14px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Submitting...' : 'Submit Event for Review'}
              </button>

              <p style={{ fontSize: '12px', color: '#555', textAlign: 'center', marginTop: '12px' }}>
                Events are reviewed within 24 hours before going live
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  background: '#0a0a0b',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: 'white',
  fontSize: '15px',
  outline: 'none',
}
