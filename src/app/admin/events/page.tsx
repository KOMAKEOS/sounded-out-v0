'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

// ============================================================================
// TYPES - Matches your actual events table
// ============================================================================
interface Event {
  id: string
  venue_id: string
  title: string
  description: string | null
  start_time: string
  end_time: string | null
  genres: string | null
  event_url: string | null
  image_url: string | null
  price_min: number | null
  price_max: number | null
  status: string
  vibe: string | null
  venue_name: string | null
  so_pick: boolean
  sold_out: boolean
  no_phones: boolean
  is_claimed: boolean
  is_verified: boolean
  created_at: string
  venue?: { name: string } | null
}

interface Venue {
  id: string
  name: string
}

const GENRES = [
  'techno',
  'house',
  'tech_house',
  'deep_house',
  'dnb',
  'garage',
  'disco',
  'hip_hop',
  'rnb',
  'pop',
  'rock',
  'indie',
  'jazz',
  'soul',
  'funk',
  'afrobeats',
  'reggae',
  'latin',
  'mixed'
]

const VIBES = [
  'underground',
  'mainstream',
  'intimate',
  'high-energy',
  'chill',
  'queer-friendly',
  'late-night',
  'day-party'
]

// ============================================================================
// ADMIN PASSCODE CHECK
// ============================================================================
const ADMIN_PASSCODE = '1234'

export default function AdminEventsPage() {
  // Auth state
  const [passcodeEntered, setPasscodeEntered] = useState(false)
  const [passcodeInput, setPasscodeInput] = useState('')
  const [passcodeError, setPasscodeError] = useState(false)

  // Data state
  const [events, setEvents] = useState<Event[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDate, setFilterDate] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  
  // Edit modal state
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  // Form state - matches your schema
  const [formData, setFormData] = useState({
    venue_id: '',
    title: '',
    description: '',
    start_date: '',
    start_time_hour: '22:00',
    end_date: '',
    end_time_hour: '03:00',
    genres: [] as string[],
    vibe: '',
    event_url: '',
    image_url: '',
    price_min: '',
    price_max: '',
    so_pick: false,
    sold_out: false,
    no_phones: false,
    status: 'active'
  })

  // Check session storage for passcode
  useEffect(() => {
    const savedAccess = sessionStorage.getItem('so_admin_access')
    if (savedAccess === 'granted') {
      setPasscodeEntered(true)
    }
  }, [])

  // Load data
  useEffect(() => {
    if (passcodeEntered) {
      loadVenues()
      loadEvents()
    } else {
      setLoading(false)
    }
  }, [passcodeEntered, filterDate])

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

  const loadVenues = async () => {
    const { data } = await supabase
      .from('venues')
      .select('id, name')
      .eq('status', 'active')
      .order('name')

    if (data) setVenues(data)
  }

  const loadEvents = async () => {
    setLoading(true)
    
    let query = supabase
      .from('events')
      .select(`
        *,
        venue:venues(name)
      `)
      .order('start_time', { ascending: filterDate === 'upcoming' })

    const now = new Date().toISOString()
    if (filterDate === 'upcoming') {
      query = query.gte('start_time', now)
    } else if (filterDate === 'past') {
      query = query.lt('start_time', now)
    }

    const { data, error } = await query.limit(100)

    if (error) {
      console.error('Error loading events:', error)
    } else {
      setEvents(data || [])
    }
    setLoading(false)
  }

  // Filter events by search
  const filteredEvents = events.filter((event: Event) => {
    const query = searchQuery.toLowerCase()
    return event.title.toLowerCase().includes(query) ||
      event.venue?.name?.toLowerCase().includes(query) ||
      event.genres?.toLowerCase().includes(query) ||
      event.venue_name?.toLowerCase().includes(query)
  })

  // Parse datetime for form
  const parseDateTime = (isoString: string) => {
    const date = new Date(isoString)
    return {
      date: date.toISOString().split('T')[0],
      time: date.toTimeString().slice(0, 5)
    }
  }

  // Open edit modal
  const openEditModal = (event: Event) => {
    setEditingEvent(event)
    setIsCreating(false)
    
    const startParsed = parseDateTime(event.start_time)
    const endParsed = event.end_time ? parseDateTime(event.end_time) : null
    
    setFormData({
      venue_id: event.venue_id || '',
      title: event.title || '',
      description: event.description || '',
      start_date: startParsed.date,
      start_time_hour: startParsed.time,
      end_date: endParsed?.date || startParsed.date,
      end_time_hour: endParsed?.time || '03:00',
      genres: event.genres ? event.genres.split(',').map((g: string) => g.trim()) : [],
      vibe: event.vibe || '',
      event_url: event.event_url || '',
      image_url: event.image_url || '',
      price_min: event.price_min?.toString() || '',
      price_max: event.price_max?.toString() || '',
      so_pick: event.so_pick || false,
      sold_out: event.sold_out || false,
      no_phones: event.no_phones || false,
      status: event.status || 'active'
    })
  }

  // Open create modal
  const openCreateModal = () => {
    setEditingEvent(null)
    setIsCreating(true)
    
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    setFormData({
      venue_id: venues[0]?.id || '',
      title: '',
      description: '',
      start_date: tomorrowStr,
      start_time_hour: '22:00',
      end_date: tomorrowStr,
      end_time_hour: '03:00',
      genres: [],
      vibe: '',
      event_url: '',
      image_url: '',
      price_min: '',
      price_max: '',
      so_pick: false,
      sold_out: false,
      no_phones: false,
      status: 'active'
    })
  }

  // Close modal
  const closeModal = () => {
    setEditingEvent(null)
    setIsCreating(false)
  }

  // Toggle genre
  const toggleGenre = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g: string) => g !== genre)
        : [...prev.genres, genre]
    }))
  }

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `event-${Date.now()}.${fileExt}`
      const filePath = `events/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, image_url: publicUrl }))
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload image')
    }

    setUploadingImage(false)
  }

  // Get venue name for venue_name field
  const getVenueName = (venueId: string): string => {
    const venue = venues.find((v: Venue) => v.id === venueId)
    return venue?.name || ''
  }

  // Save event
  const handleSave = async () => {
    setSaving(true)

    // Build start_time
    const startDateTime = new Date(`${formData.start_date}T${formData.start_time_hour}:00`)
    
    // Build end_time (handle overnight events)
    let endDateTime = new Date(`${formData.end_date}T${formData.end_time_hour}:00`)
    if (endDateTime <= startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1)
    }

    const eventData = {
      venue_id: formData.venue_id,
      venue_name: getVenueName(formData.venue_id),
      title: formData.title,
      description: formData.description || null,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      genres: formData.genres.length > 0 ? formData.genres.join(', ') : null,
      vibe: formData.vibe || null,
      event_url: formData.event_url || null,
      image_url: formData.image_url || null,
      price_min: formData.price_min ? Number(formData.price_min) : null,
      price_max: formData.price_max ? Number(formData.price_max) : null,
      so_pick: formData.so_pick,
      sold_out: formData.sold_out,
      no_phones: formData.no_phones,
      status: formData.status
    }

    try {
      if (isCreating) {
        const { error } = await supabase
          .from('events')
          .insert([eventData])

        if (error) throw error
      } else if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id)

        if (error) throw error
      }

      await loadEvents()
      closeModal()
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save event')
    }

    setSaving(false)
  }

  // Duplicate event (quick add for recurring)
  const handleDuplicate = () => {
    if (!editingEvent) return
    
    const newStartDate = new Date(formData.start_date)
    newStartDate.setDate(newStartDate.getDate() + 7)
    const newEndDate = new Date(formData.end_date)
    newEndDate.setDate(newEndDate.getDate() + 7)
    
    setFormData(prev => ({
      ...prev,
      start_date: newStartDate.toISOString().split('T')[0],
      end_date: newEndDate.toISOString().split('T')[0]
    }))
    
    setEditingEvent(null)
    setIsCreating(true)
  }

  // Delete event
  const handleDelete = async () => {
    if (!editingEvent) return
    if (!confirm(`Delete "${editingEvent.title}"? This cannot be undone.`)) return

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', editingEvent.id)

      if (error) throw error

      await loadEvents()
      closeModal()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete event')
    }
  }

  // Format date for display
  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Check if event is free
  const isFree = (event: Event) => {
    return (!event.price_min && !event.price_max) || 
           (event.price_min === 0 && event.price_max === 0)
  }

  // ============================================================================
  // PASSCODE SCREEN
  // ============================================================================
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

  // ============================================================================
  // MAIN UI
  // ============================================================================
  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff' }}>
      {/* Header */}
      <header style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/admin" style={{ color: '#888', textDecoration: 'none' }}>
            ← Back
          </Link>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>
            Events Manager
          </h1>
          <span style={{
            background: 'rgba(171,103,247,0.15)',
            color: '#ab67f7',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600
          }}>
            {events.length} events
          </span>
        </div>
        <button
          onClick={openCreateModal}
          style={{
            padding: '10px 20px',
            background: '#ab67f7',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          + Add Event
        </button>
      </header>

      {/* Filters */}
      <div style={{ padding: '20px 24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            maxWidth: '400px',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['upcoming', 'past', 'all'] as const).map((filter: 'upcoming' | 'past' | 'all') => (
            <button
              key={filter}
              onClick={() => setFilterDate(filter)}
              style={{
                padding: '10px 16px',
                background: filterDate === filter ? '#ab67f7' : 'rgba(255,255,255,0.05)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <main style={{ padding: '0 24px 40px' }}>
        {loading ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>Loading...</p>
        ) : filteredEvents.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
            No events found
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredEvents.map((event: Event) => (
              <div
                key={event.id}
                onClick={() => openEditModal(event)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  transition: 'border-color 0.2s'
                }}
              >
                {/* Image */}
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '8px',
                  background: event.image_url
                    ? `url(${event.image_url}) center/cover`
                    : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {!event.image_url && <span style={{ opacity: 0.3 }}>🎵</span>}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                      {event.title}
                    </h3>
                    {event.so_pick && (
                      <span style={{
                        padding: '2px 6px',
                        background: 'rgba(251,191,36,0.15)',
                        borderRadius: '4px',
                        fontSize: '10px',
                        color: '#fbbf24',
                        fontWeight: 600
                      }}>
                        SO PICK
                      </span>
                    )}
                    {event.sold_out && (
                      <span style={{
                        padding: '2px 6px',
                        background: 'rgba(248,113,113,0.15)',
                        borderRadius: '4px',
                        fontSize: '10px',
                        color: '#f87171',
                        fontWeight: 600
                      }}>
                        SOLD OUT
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: '#888', margin: '0 0 6px' }}>
                    {event.venue?.name || event.venue_name || 'Unknown venue'}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '3px 8px',
                      background: 'rgba(171,103,247,0.15)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#ab67f7'
                    }}>
                      {formatDate(event.start_time)}
                    </span>
                    <span style={{
                      padding: '3px 8px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#888'
                    }}>
                      {formatTime(event.start_time)}
                    </span>
                    {isFree(event) && (
                      <span style={{
                        padding: '3px 8px',
                        background: 'rgba(34,197,94,0.15)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: '#22c55e'
                      }}>
                        FREE
                      </span>
                    )}
                    {event.genres && (
                      <span style={{
                        padding: '3px 8px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: '#666'
                      }}>
                        {event.genres}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <span style={{
                  padding: '4px 10px',
                  background: event.status === 'active'
                    ? 'rgba(34,197,94,0.15)'
                    : 'rgba(248,113,113,0.15)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: event.status === 'active' ? '#22c55e' : '#f87171',
                  textTransform: 'uppercase',
                  flexShrink: 0
                }}>
                  {event.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit/Create Modal */}
      {(editingEvent || isCreating) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000,
          overflow: 'auto'
        }}>
          <div style={{
            background: '#111',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              background: '#111',
              zIndex: 10
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                {isCreating ? 'Add New Event' : `Edit: ${editingEvent?.title}`}
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            {/* Form */}
            <div style={{ padding: '24px' }}>
              {/* Image Upload */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                  Event Image
                </label>
                <div style={{
                  height: '140px',
                  background: formData.image_url
                    ? `url(${formData.image_url}) center/cover`
                    : 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {!formData.image_url && !uploadingImage && (
                    <span style={{ color: '#666' }}>Click to upload</span>
                  )}
                  {uploadingImage && (
                    <span style={{ color: '#ab67f7' }}>Uploading...</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              {/* Venue */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                  Venue *
                </label>
                <select
                  value={formData.venue_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, venue_id: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                >
                  <option value="" style={{ background: '#111' }}>Select venue...</option>
                  {venues.map((venue: Venue) => (
                    <option key={venue.id} value={venue.id} style={{ background: '#111' }}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                  Event Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Shindig presents: Denis Sulta"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value, end_date: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                    Door Time
                  </label>
                  <input
                    type="time"
                    value={formData.start_time_hour}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time_hour: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.end_time_hour}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time_hour: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Genres */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                  Genres
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {GENRES.map((genre: string) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      style={{
                        padding: '6px 12px',
                        background: formData.genres.includes(genre)
                          ? '#ab67f7'
                          : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {genre.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vibe */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                  Vibe
                </label>
                <select
                  value={formData.vibe}
                  onChange={(e) => setFormData(prev => ({ ...prev, vibe: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                >
                  <option value="" style={{ background: '#111' }}>Select vibe...</option>
                  {VIBES.map((vibe: string) => (
                    <option key={vibe} value={vibe} style={{ background: '#111' }}>
                      {vibe}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pricing */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                    Min Price (£)
                  </label>
                  <input
                    type="number"
                    value={formData.price_min}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_min: e.target.value }))}
                    placeholder="0 = free"
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                    Max Price (£)
                  </label>
                  <input
                    type="number"
                    value={formData.price_max}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_max: e.target.value }))}
                    placeholder="e.g. 15"
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Ticket URL */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                  Ticket URL
                </label>
                <input
                  type="url"
                  value={formData.event_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_url: e.target.value }))}
                  placeholder="https://ra.co/events/..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.so_pick}
                    onChange={(e) => setFormData(prev => ({ ...prev, so_pick: e.target.checked }))}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '14px' }}>⭐ SO Pick</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.sold_out}
                    onChange={(e) => setFormData(prev => ({ ...prev, sold_out: e.target.checked }))}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '14px' }}>🚫 Sold Out</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.no_phones}
                    onChange={(e) => setFormData(prev => ({ ...prev, no_phones: e.target.checked }))}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '14px' }}>📵 No Phones</span>
                </label>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Optional event description..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.title || !formData.venue_id}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: saving ? '#444' : '#ab67f7',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Saving...' : (isCreating ? 'Create Event' : 'Save Changes')}
                </button>
                {!isCreating && (
                  <>
                    <button
                      onClick={handleDuplicate}
                      style={{
                        padding: '14px 16px',
                        background: 'rgba(59,130,246,0.15)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#3b82f6',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      title="Duplicate for next week"
                    >
                      📋 +7d
                    </button>
                    <button
                      onClick={handleDelete}
                      style={{
                        padding: '14px 16px',
                        background: 'rgba(248,113,113,0.15)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#f87171',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
