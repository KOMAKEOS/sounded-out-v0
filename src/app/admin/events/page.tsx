'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AdminLoginGate from '@/components/AdminLoginGate'

// ============================================================================
// TYPES
// ============================================================================
interface Venue {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
  slug: string
  is_verified: boolean
}

interface Event {
  id: string
  venue_id: string
  brand_id: string | null
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
  price_type: string | null
  free_before_time: string | null
  ticket_source: string | null
  status: string
  so_pick: boolean
  sold_out: boolean
  no_phones: boolean
  is_verified: boolean
  venue?: Venue
  brand?: Brand
}

// ============================================================================
// CONSTANTS
// ============================================================================
const PRESET_GENRES = [
  'techno', 'house', 'tech_house', 'disco', 'dnb', 'garage', 'bass', 
  'afrobeats', 'hip_hop', 'rnb', 'indie', 'rock', 'live', 'jazz',
  'funk', 'soul', 'reggae', 'dancehall', 'latin', 'electronic',
  'trance', 'progressive', 'minimal', 'hard_techno', 'acid',
  'club_classics', 'student', 'commercial', 'mixed'
]

const PRESET_VIBES = [
  'underground', 'intimate', 'high-energy', 'chill', 'late-night',
  'after-party', 'daytime', 'outdoor', 'warehouse', 'club',
  'bar', 'festival', 'boat-party', 'rooftop', 'basement'
]

const TICKET_SOURCES = [
  { value: '', label: 'Auto-detect from URL' },
  { value: 'ra', label: 'Resident Advisor (RA)' },
  { value: 'fatsoma', label: 'Fatsoma' },
  { value: 'skiddle', label: 'Skiddle' },
  { value: 'dice', label: 'DICE' },
  { value: 'eventbrite', label: 'Eventbrite' },
  { value: 'fixr', label: 'FIXR' },
  { value: 'venue', label: 'Venue Website' },
  { value: 'other', label: 'Other' },
]

const PRICE_TYPES = [
  { value: 'unknown', label: '❓ Unknown / TBA', description: 'Price not confirmed yet' },
  { value: 'free', label: '🆓 Free Entry', description: 'No charge for entry' },
  { value: 'free_before', label: '🕐 Free Before Time', description: 'Free until specific time' },
  { value: 'paid', label: '💰 Paid Entry', description: 'Has ticket price' },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const formatGenre = (genre: string): string => {
  return genre.trim().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr)
  return {
    date: d.toISOString().split('T')[0],
    time: d.toTimeString().slice(0, 5),
  }
}

const combineDateAndTime = (date: string, time: string): string => {
  return new Date(`${date}T${time}`).toISOString()
}

// ============================================================================
// WRAPPER WITH AUTH GATE
// ============================================================================
export default function AdminEventsPage() {
  return (
    <AdminLoginGate>
      <AdminEventsContent />
    </AdminLoginGate>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
function AdminEventsContent() {
  // Data state
  const [events, setEvents] = useState<Event[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  
  // UI state
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Form state
  const [form, setForm] = useState({
    venue_id: '',
    brand_id: '',
    title: '',
    description: '',
    start_date: '',
    start_time: '22:00',
    end_date: '',
    end_time: '03:00',
    genres: [] as string[],
    vibes: [] as string[],
    event_url: '',
    image_url: '',
    price_type: 'unknown',
    price_min: '',
    price_max: '',
    free_before_time: '',
    ticket_source: '',
    status: 'published',
    so_pick: false,
    sold_out: false,
    no_phones: false,
  })
  
  // Custom genre/vibe state
  const [customGenres, setCustomGenres] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('so_custom_genres')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [customVibes, setCustomVibes] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('so_custom_vibes')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [newGenre, setNewGenre] = useState('')
  const [newVibe, setNewVibe] = useState('')
  
  // Messages
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Image upload state
  const [uploading, setUploading] = useState(false)

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  // Save custom genres/vibes to localStorage
  useEffect(() => {
    localStorage.setItem('so_custom_genres', JSON.stringify(customGenres))
  }, [customGenres])
  
  useEffect(() => {
    localStorage.setItem('so_custom_vibes', JSON.stringify(customVibes))
  }, [customVibes])

  const loadData = async () => {
    setLoading(true)
    
    const { data: eventsData } = await supabase
      .from('events')
      .select('*, venue:venues(id, name), brand:brands(id, name, slug, is_verified)')
      .order('start_time', { ascending: false })
    
    const { data: venuesData } = await supabase
      .from('venues')
      .select('id, name')
      .order('name')
    
    const { data: brandsData } = await supabase
      .from('brands')
      .select('id, name, slug, is_verified')
      .order('name')
    
    if (eventsData) setEvents(eventsData)
    if (venuesData) setVenues(venuesData)
    if (brandsData) setBrands(brandsData)
    
    setLoading(false)
  }

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    setForm({
      venue_id: venues[0]?.id || '',
      brand_id: '',
      title: '',
      description: '',
      start_date: today,
      start_time: '22:00',
      end_date: today,
      end_time: '03:00',
      genres: [],
      vibes: [],
      event_url: '',
      image_url: '',
      price_type: 'unknown',
      price_min: '',
      price_max: '',
      free_before_time: '',
      ticket_source: '',
      status: 'published',
      so_pick: false,
      sold_out: false,
      no_phones: false,
    })
    setEditingEvent(null)
  }

  const openNewForm = () => {
    resetForm()
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const openEditForm = (event: Event) => {
    const start = formatDateTime(event.start_time)
    const end = event.end_time ? formatDateTime(event.end_time) : { date: start.date, time: '03:00' }
    
    setForm({
      venue_id: event.venue_id,
      brand_id: event.brand_id || '',
      title: event.title,
      description: event.description || '',
      start_date: start.date,
      start_time: start.time,
      end_date: end.date,
      end_time: end.time,
      genres: event.genres ? event.genres.split(',').map(g => g.trim()) : [],
      vibes: event.vibe ? event.vibe.split(',').map(v => v.trim()) : [],
      event_url: event.event_url || '',
      image_url: event.image_url || '',
      price_type: event.price_type || 'unknown',
      price_min: event.price_min?.toString() || '',
      price_max: event.price_max?.toString() || '',
      free_before_time: event.free_before_time || '',
      ticket_source: event.ticket_source || '',
      status: event.status || 'published',
      so_pick: event.so_pick || false,
      sold_out: event.sold_out || false,
      no_phones: event.no_phones || false,
    })
    setEditingEvent(event)
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    setError('')
    
    try {
      const ext = file.name.split('.').pop()
      const fileName = `event-${Date.now()}.${ext}`
      
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file)
      
      if (uploadError) throw uploadError
      
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(fileName)
      
      setForm({ ...form, image_url: urlData.publicUrl })
    } catch (err: any) {
      setError('Image upload failed: ' + err.message)
    }
    
    setUploading(false)
  }

  const toggleGenre = (genre: string) => {
    setForm(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }))
  }

  const toggleVibe = (vibe: string) => {
    setForm(prev => ({
      ...prev,
      vibes: prev.vibes.includes(vibe)
        ? prev.vibes.filter(v => v !== vibe)
        : [...prev.vibes, vibe]
    }))
  }

  const addCustomGenre = () => {
    if (!newGenre.trim()) return
    const formatted = newGenre.toLowerCase().replace(/\s+/g, '_')
    if (!customGenres.includes(formatted) && !PRESET_GENRES.includes(formatted)) {
      setCustomGenres([...customGenres, formatted])
    }
    toggleGenre(formatted)
    setNewGenre('')
  }

  const addCustomVibe = () => {
    if (!newVibe.trim()) return
    const formatted = newVibe.toLowerCase().replace(/\s+/g, '-')
    if (!customVibes.includes(formatted) && !PRESET_VIBES.includes(formatted)) {
      setCustomVibes([...customVibes, formatted])
    }
    toggleVibe(formatted)
    setNewVibe('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!form.venue_id) {
      setError('Please select a venue')
      return
    }
    if (!form.title.trim()) {
      setError('Please enter a title')
      return
    }

    let startTime = combineDateAndTime(form.start_date, form.start_time)
    let endTime = null
    
    if (form.end_time) {
      let endDate = form.end_date || form.start_date
      if (form.end_time < form.start_time && endDate === form.start_date) {
        const nextDay = new Date(form.start_date)
        nextDay.setDate(nextDay.getDate() + 1)
        endDate = nextDay.toISOString().split('T')[0]
      }
      endTime = combineDateAndTime(endDate, form.end_time)
    }

    const eventData = {
      venue_id: form.venue_id,
      brand_id: form.brand_id || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_time: startTime,
      end_time: endTime,
      genres: form.genres.length > 0 ? form.genres.join(', ') : null,
      vibe: form.vibes.length > 0 ? form.vibes.join(', ') : null,
      event_url: form.event_url.trim() || null,
      image_url: form.image_url || null,
      price_type: form.price_type,
      price_min: form.price_type === 'paid' ? (parseFloat(form.price_min) || null) : (form.price_type === 'free' ? 0 : null),
      price_max: form.price_type === 'paid' ? (parseFloat(form.price_max) || null) : null,
      free_before_time: form.price_type === 'free_before' ? form.free_before_time : null,
      ticket_source: form.ticket_source || null,
      status: form.status,
      so_pick: form.so_pick,
      sold_out: form.sold_out,
      no_phones: form.no_phones,
    }

    try {
      if (editingEvent) {
        const { error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id)
        
        if (updateError) throw updateError
        setSuccess('Event updated successfully!')
      } else {
        const { error: insertError } = await supabase
          .from('events')
          .insert(eventData)
        
        if (insertError) throw insertError
        setSuccess('Event created successfully!')
      }
      
      await loadData()
      setShowForm(false)
      resetForm()
    } catch (err: any) {
      setError('Failed to save: ' + err.message)
    }
  }

  const handleDuplicate = async (event: Event) => {
    const newStart = new Date(event.start_time)
    newStart.setDate(newStart.getDate() + 7)
    
    let newEnd = null
    if (event.end_time) {
      const endDate = new Date(event.end_time)
      endDate.setDate(endDate.getDate() + 7)
      newEnd = endDate.toISOString()
    }

    const { error: dupError } = await supabase
      .from('events')
      .insert({
        venue_id: event.venue_id,
        brand_id: event.brand_id,
        title: event.title,
        description: event.description,
        start_time: newStart.toISOString(),
        end_time: newEnd,
        genres: event.genres,
        vibe: event.vibe,
        event_url: event.event_url,
        image_url: event.image_url,
        price_type: event.price_type,
        price_min: event.price_min,
        price_max: event.price_max,
        free_before_time: event.free_before_time,
        ticket_source: event.ticket_source,
        status: 'published',
        so_pick: event.so_pick,
        sold_out: false,
        no_phones: event.no_phones,
      })

    if (dupError) {
      setError('Duplicate failed: ' + dupError.message)
    } else {
      setSuccess('Event duplicated (+7 days)')
      await loadData()
    }
  }

  const handleDelete = async (event: Event) => {
    if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return
    
    const { error: delError } = await supabase
      .from('events')
      .delete()
      .eq('id', event.id)

    if (delError) {
      setError('Delete failed: ' + delError.message)
    } else {
      setSuccess('Event deleted')
      await loadData()
    }
  }

  const filteredEvents = events.filter(event => {
    const now = new Date()
    const eventDate = new Date(event.start_time)
    
    if (filter === 'upcoming' && eventDate < now) return false
    if (filter === 'past' && eventDate >= now) return false
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!event.title.toLowerCase().includes(query) &&
          !event.venue?.name?.toLowerCase().includes(query) &&
          !event.brand?.name?.toLowerCase().includes(query)) {
        return false
      }
    }
    
    return true
  })

  // ============================================================================
  // MAIN ADMIN UI
  // ============================================================================
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0b',
      color: 'white',
      padding: '20px',
      paddingTop: 'max(20px, env(safe-area-inset-top))',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <Link href="/admin" style={{ fontSize: '13px', color: '#ab67f7', textDecoration: 'none', marginBottom: '8px', display: 'inline-block' }}>
              ← Back to Hub
            </Link>
            <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Events Manager</h1>
            <p style={{ fontSize: '13px', color: '#888' }}>{events.length} total events</p>
          </div>
          <button
            onClick={openNewForm}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Add Event
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            padding: '14px',
            background: 'rgba(248,113,113,0.15)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: '10px',
            marginBottom: '16px',
            color: '#f87171',
            fontSize: '14px',
          }}>
            ❌ {error}
          </div>
        )}
        {success && (
          <div style={{
            padding: '14px',
            background: 'rgba(34,197,94,0.15)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '10px',
            marginBottom: '16px',
            color: '#22c55e',
            fontSize: '14px',
          }}>
            ✅ {success}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '12px 16px',
              background: '#141416',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: 'white',
              fontSize: '14px',
            }}
          />
          {(['upcoming', 'past', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '12px 20px',
                background: filter === f ? '#ab67f7' : 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: '10px',
                color: filter === f ? 'white' : '#888',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Warning if no venues */}
        {venues.length === 0 && (
          <div style={{
            padding: '20px',
            background: 'rgba(255,200,50,0.1)',
            border: '1px solid rgba(255,200,50,0.2)',
            borderRadius: '12px',
            marginBottom: '20px',
          }}>
            <p style={{ color: '#ffc832', fontWeight: 600, marginBottom: '8px' }}>⚠️ No venues found</p>
            <p style={{ fontSize: '13px', color: '#999' }}>
              Add venues first in the <Link href="/admin/venues" style={{ color: '#ab67f7' }}>Venues Manager</Link>
            </p>
          </div>
        )}

        {/* Events List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
            Loading events...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                style={{
                  padding: '16px',
                  background: '#141416',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                {event.image_url ? (
                  <img
                    src={event.image_url}
                    alt=""
                    style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px',
                    background: 'rgba(171,103,247,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0,
                  }}>
                    🎵
                  </div>
                )}
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {event.title}
                    </span>
                    {event.so_pick && <span style={{ fontSize: '10px', background: '#ab67f7', padding: '2px 6px', borderRadius: '4px' }}>SO PICK</span>}
                    {event.sold_out && <span style={{ fontSize: '10px', background: '#f87171', padding: '2px 6px', borderRadius: '4px' }}>SOLD OUT</span>}
                    {event.is_verified && <span style={{ fontSize: '10px', background: '#22c55e', padding: '2px 6px', borderRadius: '4px' }}>VERIFIED</span>}
                  </div>
                  
                  {event.brand && (
                    <p style={{ fontSize: '12px', color: '#ab67f7', marginBottom: '2px' }}>
                      by {event.brand.name} {event.brand.is_verified && '✓'}
                    </p>
                  )}
                  
                  <p style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>
                    {event.venue?.name} · {new Date(event.start_time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {event.genres?.split(',').slice(0, 3).map((g, i) => (
                      <span key={i} style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(171,103,247,0.15)', borderRadius: '4px', color: '#ab67f7' }}>
                        {formatGenre(g)}
                      </span>
                    ))}
                    {event.price_type && (
                      <span style={{ 
                        fontSize: '10px', 
                        padding: '2px 8px', 
                        background: event.price_type === 'free' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)', 
                        borderRadius: '4px', 
                        color: event.price_type === 'free' ? '#22c55e' : '#888' 
                      }}>
                        {event.price_type === 'free' ? 'FREE' : event.price_type === 'unknown' ? 'TBA' : event.price_type === 'free_before' ? `Free before ${event.free_before_time}` : `£${event.price_min}`}
                      </span>
                    )}
                    {event.ticket_source && (
                      <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(59,130,246,0.15)', borderRadius: '4px', color: '#3b82f6' }}>
                        🎫 {event.ticket_source.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => openEditForm(event)}
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(171,103,247,0.15)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#ab67f7',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDuplicate(event)}
                    title="Duplicate +7 days"
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.06)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#888',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    +7d
                  </button>
                  <button
                    onClick={() => handleDelete(event)}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(248,113,113,0.1)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#f87171',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            
            {filteredEvents.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                No events found
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================================ */}
      {/* FORM MODAL */}
      {/* ============================================================================ */}
      {showForm && (
        <div
          onClick={() => setShowForm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '20px',
            overflowY: 'auto',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '600px',
              background: '#1a1a1f',
              borderRadius: '20px',
              padding: '24px',
              marginTop: '20px',
              marginBottom: '40px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
                {editingEvent ? 'Edit Event' : 'Add Event'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#888',
                  fontSize: '18px',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Venue Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Venue *</label>
                <select required value={form.venue_id} onChange={(e) => setForm({ ...form, venue_id: e.target.value })} style={{ width: '100%', padding: '12px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '14px' }}>
                  <option value="">Select venue...</option>
                  {venues.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
                </select>
              </div>

              {/* Brand Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#ab67f7', marginBottom: '6px', fontWeight: 600 }}>🎵 Brand / Promoter</label>
                <select value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })} style={{ width: '100%', padding: '12px', background: '#141416', border: '1px solid rgba(171,103,247,0.3)', borderRadius: '10px', color: 'white', fontSize: '14px' }}>
                  <option value="">No brand (venue event)</option>
                  {brands.map((b) => (<option key={b.id} value={b.id}>{b.name} {b.is_verified ? '✓' : ''}</option>))}
                </select>
                <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Shows &quot;by Underground Sound&quot; on event cards</p>
              </div>

              {/* Title */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Event Title *</label>
                <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="SHINDIG" style={{ width: '100%', padding: '12px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '14px' }} />
              </div>

              {/* Date/Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Start Date *</label>
                  <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} style={{ width: '100%', padding: '12px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Start Time *</label>
                  <input type="time" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} style={{ width: '100%', padding: '12px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>End Date</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} style={{ width: '100%', padding: '12px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>End Time</label>
                  <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} style={{ width: '100%', padding: '12px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '14px' }} />
                </div>
              </div>

              {/* Price Type */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '8px' }}>Price Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {PRICE_TYPES.map((pt) => (
                    <button key={pt.value} type="button" onClick={() => setForm({ ...form, price_type: pt.value })} style={{ padding: '12px', background: form.price_type === pt.value ? 'rgba(171,103,247,0.2)' : '#141416', border: form.price_type === pt.value ? '2px solid #ab67f7' : '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: form.price_type === pt.value ? '#ab67f7' : '#888', fontSize: '13px', fontWeight: form.price_type === pt.value ? 600 : 400, cursor: 'pointer', textAlign: 'left' }}>
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.price_type === 'paid' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Min Price (£)</label>
                    <input type="number" step="0.01" value={form.price_min} onChange={(e) => setForm({ ...form, price_min: e.target.value })} placeholder="5.00" style={{ width: '100%', padding: '12px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Max Price (£)</label>
                    <input type="number" step="0.01" value={form.price_max} onChange={(e) => setForm({ ...form, price_max: e.target.value })} placeholder="15.00" style={{ width: '100%', padding: '12px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '14px' }} />
                  </div>
                </div>
              )}

              {form.price_type === 'free_before' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Free Before Time</label>
                  <input type="text" value={form.free_before_time} onChange={(e) => setForm({ ...form, free_before_time: e.target.value })} placeholder="11pm" style={{ width: '100%', padding: '12px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '14px' }} />
                </div>
              )}

              {/* Ticket URL & Source */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Ticket URL</label>
                  <input type="url" value={form.event_url} onChange={(e) => setForm({ ...form, event_url: e.target.value })} placeholder="https://ra.co/events/..." style={{ width: '100%', padding: '12px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>🎫 Source</label>
                  <select value={form.ticket_source} onChange={(e) => setForm({ ...form, ticket_source: e.target.value })} style={{ width: '100%', padding: '12px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '14px' }}>
                    {TICKET_SOURCES.map((ts) => (<option key={ts.value} value={ts.value}>{ts.label}</option>))}
                  </select>
                </div>
              </div>

              {/* Image Upload */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Event Image</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} style={{ flex: 1 }} />
                  {form.image_url && (
                    <>
                      <img src={form.image_url} alt="" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                      <button type="button" onClick={() => setForm({ ...form, image_url: '' })} style={{ padding: '8px', background: 'rgba(248,113,113,0.15)', border: 'none', borderRadius: '6px', color: '#f87171', cursor: 'pointer' }}>✕</button>
                    </>
                  )}
                </div>
                {uploading && <p style={{ fontSize: '12px', color: '#ab67f7', marginTop: '6px' }}>Uploading...</p>}
              </div>

              {/* Genres */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '8px' }}>Genres (click to select)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {[...PRESET_GENRES, ...customGenres].map((genre) => (
                    <button key={genre} type="button" onClick={() => toggleGenre(genre)} style={{ padding: '8px 12px', background: form.genres.includes(genre) ? '#ab67f7' : '#141416', border: form.genres.includes(genre) ? 'none' : '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: form.genres.includes(genre) ? 'white' : '#888', fontSize: '12px', fontWeight: form.genres.includes(genre) ? 600 : 400, cursor: 'pointer' }}>
                      {formatGenre(genre)}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" value={newGenre} onChange={(e) => setNewGenre(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomGenre())} placeholder="Add custom genre..." style={{ flex: 1, padding: '8px 12px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '12px' }} />
                  <button type="button" onClick={addCustomGenre} style={{ padding: '8px 16px', background: 'rgba(171,103,247,0.15)', border: 'none', borderRadius: '6px', color: '#ab67f7', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Add</button>
                </div>
              </div>

              {/* Vibes */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '8px' }}>Vibes (click to select)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {[...PRESET_VIBES, ...customVibes].map((vibe) => (
                    <button key={vibe} type="button" onClick={() => toggleVibe(vibe)} style={{ padding: '8px 12px', background: form.vibes.includes(vibe) ? '#3b82f6' : '#141416', border: form.vibes.includes(vibe) ? 'none' : '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: form.vibes.includes(vibe) ? 'white' : '#888', fontSize: '12px', fontWeight: form.vibes.includes(vibe) ? 600 : 400, cursor: 'pointer' }}>
                      {vibe.replace(/-/g, ' ')}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" value={newVibe} onChange={(e) => setNewVibe(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomVibe())} placeholder="Add custom vibe..." style={{ flex: 1, padding: '8px 12px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '12px' }} />
                  <button type="button" onClick={addCustomVibe} style={{ padding: '8px 16px', background: 'rgba(59,130,246,0.15)', border: 'none', borderRadius: '6px', color: '#3b82f6', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Add</button>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Event description..." style={{ width: '100%', padding: '12px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '14px', resize: 'vertical' }} />
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.so_pick} onChange={(e) => setForm({ ...form, so_pick: e.target.checked })} />
                  <span style={{ fontSize: '13px', color: '#ab67f7' }}>⭐ SO Pick</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.sold_out} onChange={(e) => setForm({ ...form, sold_out: e.target.checked })} />
                  <span style={{ fontSize: '13px', color: '#f87171' }}>🎟️ Sold Out</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.no_phones} onChange={(e) => setForm({ ...form, no_phones: e.target.checked })} />
                  <span style={{ fontSize: '13px', color: '#ffc832' }}>📵 No Cameras</span>
                </label>
              </div>

              {/* Status */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: '12px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '14px' }}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              {/* Submit */}
              <button type="submit" style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
                {editingEvent ? 'Update Event' : 'Create Event'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
