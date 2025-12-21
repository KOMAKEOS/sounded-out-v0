'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

// ============================================================================
// TYPES
// ============================================================================
type Event = {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string | null
  genres: string | null
  vibe: string | null
  event_url: string | null
  image_url: string | null
  price_min: number | null
  price_max: number | null
  sold_out: boolean
  no_phones: boolean
  is_verified: boolean
  venue?: {
    id: string
    name: string
  }
}

// ============================================================================
// EVENT EDIT PAGE
// ============================================================================
export default function EventEditPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [event, setEvent] = useState<Event | null>(null)
  const [message, setMessage] = useState('')
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [genres, setGenres] = useState('')
  const [vibe, setVibe] = useState('')
  const [eventUrl, setEventUrl] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [soldOut, setSoldOut] = useState(false)
  const [noPhones, setNoPhones] = useState(false)
  
  // ============================================================================
  // AUTH & DATA LOADING
  // ============================================================================
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        checkAccessAndLoadEvent(session.user.id)
      } else {
        setLoading(false)
      }
    })
  }, [eventId])
  
  const checkAccessAndLoadEvent = async (userId: string) => {
    // Check if user owns this event
    const { data: claim } = await supabase
      .from('entity_claims')
      .select('*')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('is_active', true)
      .single()
    
    // Also check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    if (claim || profile?.role === 'admin') {
      setHasAccess(true)
      loadEvent()
    } else {
      setHasAccess(false)
      setLoading(false)
    }
  }
  
  const loadEvent = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*, venue:venues(id, name)')
      .eq('id', eventId)
      .single()
    
    if (data) {
      setEvent(data)
      // Populate form
      setTitle(data.title || '')
      setDescription(data.description || '')
      setGenres(data.genres || '')
      setVibe(data.vibe || '')
      setEventUrl(data.event_url || '')
      setPriceMin(data.price_min?.toString() || '')
      setPriceMax(data.price_max?.toString() || '')
      setSoldOut(data.sold_out || false)
      setNoPhones(data.no_phones || false)
    }
    setLoading(false)
  }
  
  // ============================================================================
  // SAVE HANDLER
  // ============================================================================
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    
    const { error } = await supabase
      .from('events')
      .update({
        title,
        description: description || null,
        genres: genres || null,
        vibe: vibe || null,
        event_url: eventUrl || null,
        price_min: priceMin ? parseFloat(priceMin) : null,
        price_max: priceMax ? parseFloat(priceMax) : null,
        sold_out: soldOut,
        no_phones: noPhones,
      })
      .eq('id', eventId)
    
    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('Changes saved successfully!')
    }
    
    setSaving(false)
  }
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#888',
      }}>
        Loading...
      </div>
    )
  }
  
  if (!user || !hasAccess) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        color: 'white',
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Access Denied</h1>
        <p style={{ color: '#888' }}>You don't have permission to edit this event.</p>
        <Link href="/portal" style={{ color: '#ab67f7' }}>← Back to portal</Link>
      </div>
    )
  }
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0b',
      color: 'white',
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
          <Link href="/portal" style={{ color: '#888', fontSize: '20px', textDecoration: 'none' }}>←</Link>
          <span style={{ color: '#888', fontSize: '14px' }}>Edit Event</span>
        </div>
        {event?.is_verified && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'rgba(59,130,246,0.15)',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#3b82f6',
            fontWeight: 600,
          }}>
            <span style={{
              width: '14px',
              height: '14px',
              background: '#3b82f6',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
            }}>✓</span>
            Verified
          </span>
        )}
      </header>
      
      {/* Content */}
      <main style={{ padding: '24px 20px', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>{event?.title}</h1>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>{event?.venue?.name}</p>
        
        <form onSubmit={handleSave}>
          {/* Title */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
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
          
          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: '#141416',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '15px',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>
          
          {/* Genres */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              Genres (comma separated)
            </label>
            <input
              type="text"
              value={genres}
              onChange={(e) => setGenres(e.target.value)}
              placeholder="House, Techno, Disco"
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
          
          {/* Vibe */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              Vibe
            </label>
            <input
              type="text"
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              placeholder="Intimate · Underground · High energy"
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
          
          {/* Ticket URL */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              Ticket URL
            </label>
            <input
              type="url"
              value={eventUrl}
              onChange={(e) => setEventUrl(e.target.value)}
              placeholder="https://..."
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
          
          {/* Prices */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                Price Min (£)
              </label>
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0"
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
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                Price Max (£)
              </label>
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0"
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
          </div>
          
          {/* Toggles */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              padding: '14px 16px',
              background: '#141416',
              borderRadius: '12px',
              marginBottom: '12px',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={soldOut}
                onChange={(e) => setSoldOut(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              <div>
                <span style={{ fontSize: '15px', fontWeight: 600 }}>Sold Out</span>
                <p style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>Mark this event as sold out</p>
              </div>
            </label>
            
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              padding: '14px 16px',
              background: '#141416',
              borderRadius: '12px',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={noPhones}
                onChange={(e) => setNoPhones(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              <div>
                <span style={{ fontSize: '15px', fontWeight: 600 }}>No Phones Policy</span>
                <p style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>Phone-free event</p>
              </div>
            </label>
          </div>
          
          {/* Message */}
          {message && (
            <div style={{
              padding: '12px 16px',
              background: message.includes('Error') ? 'rgba(248,113,113,0.15)' : 'rgba(34,197,94,0.15)',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '14px',
              color: message.includes('Error') ? '#f87171' : '#22c55e',
            }}>
              {message}
            </div>
          )}
          
          {/* Save button */}
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
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </main>
    </div>
  )
}
