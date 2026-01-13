'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

// ============================================================================
// EVENTS LIST PAGE - /events/page.tsx
// 
// FIXES:
// 1. All genres shown with expandable "Show more" option
// 2. Slicker header with sign-in
// 3. Better mobile layout
// ============================================================================

type Event = {
  id: string
  title: string
  date: string
  start_time: string | null
  image_url: string | null
  ticket_url: string | null
  ticket_source: string | null
  price_type: string | null
  price_min: number | null
  genres: string | null
  venue: {
    id: string
    name: string
  } | null
}

// All available genres - add more as needed
const ALL_GENRES = [
  '140',
  'Techno',
  'Industrial',
  'Disco',
  'Balearic',
  'House',
  'Throwbacks',
  'Garage',
  'DnB',
  'Jungle',
  'Tech House',
  'Minimal',
  'Ambient',
  'Breaks',
  'Dub',
  'Reggae',
  'Hip Hop',
  'R&B',
  'Soul',
  'Funk',
  'Jazz',
  'Electronic',
  'Experimental',
  'Live Music',
]

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  
  return date.toLocaleDateString('en-GB', { 
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

function formatTime(time: string | null): string {
  if (!time) return ''
  const [h, m] = time.split(':')
  return `${h}:${m}`
}

function formatPrice(event: Event): string {
  if (event.price_type === 'free') return 'FREE'
  if (event.price_min) return `£${event.price_min}+`
  return ''
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  
  // Filters
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'weekend'>('all')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [showAllGenres, setShowAllGenres] = useState(false)

  useEffect(() => {
    async function loadData() {
      // Load user
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Load events
      let query = supabase
        .from('events')
        .select(`
          id, title, date, start_time, image_url, ticket_url, 
          ticket_source, price_type, price_min, genres,
          venue:venues(id, name)
        `)
        .eq('status', 'published')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      const { data } = await query
      if (data) setEvents(data)
      setLoading(false)
    }

    loadData()
  }, [])

  // Filter events
  const filteredEvents = events.filter(event => {
    // Date filter
    const eventDate = new Date(event.date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (dateFilter === 'today' && eventDate.toDateString() !== today.toDateString()) return false
    if (dateFilter === 'tomorrow' && eventDate.toDateString() !== tomorrow.toDateString()) return false
    if (dateFilter === 'weekend') {
      const dayOfWeek = eventDate.getDay()
      if (dayOfWeek !== 5 && dayOfWeek !== 6 && dayOfWeek !== 0) return false
    }

    // Genre filter
    if (selectedGenres.length > 0) {
      const eventGenres = event.genres?.toLowerCase().split(',').map(g => g.trim()) || []
      const hasMatchingGenre = selectedGenres.some(sg => 
        eventGenres.some(eg => eg.includes(sg.toLowerCase()))
      )
      if (!hasMatchingGenre) return false
    }

    return true
  })

  // Group by date
  const groupedEvents: { [key: string]: Event[] } = {}
  filteredEvents.forEach(event => {
    const dateKey = event.date
    if (!groupedEvents[dateKey]) groupedEvents[dateKey] = []
    groupedEvents[dateKey].push(event)
  })

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    )
  }

  // Genres to show - first 8 or all
  const visibleGenres = showAllGenres ? ALL_GENRES : ALL_GENRES.slice(0, 8)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: '#fff' }}>
      
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          background: 'rgba(10,10,11,0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Link href="/" style={{ color: '#888', textDecoration: 'none', fontSize: '14px' }}>
          ← Map
        </Link>
        
        <span style={{ fontSize: '16px', fontWeight: 700 }}>
          Events
        </span>
        
        {user ? (
          <Link href="/profile" style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            background: '#AB67F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 600,
            color: '#fff',
            textDecoration: 'none',
          }}>
            {user.email?.charAt(0).toUpperCase()}
          </Link>
        ) : (
          <Link 
            href="/login" 
            style={{ 
              padding: '6px 12px',
              background: '#AB67F7',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Sign In
          </Link>
        )}
      </header>

      {/* Filters */}
      <div style={{ padding: '20px', paddingBottom: '8px' }}>
        
        {/* Page title */}
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '4px', letterSpacing: '-1px' }}>
          Events
        </h1>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
          Discover what's happening in Newcastle
        </p>

        {/* Date filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {(['all', 'today', 'tomorrow', 'weekend'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              style={{
                padding: '10px 18px',
                borderRadius: '20px',
                border: dateFilter === filter ? '2px solid #AB67F7' : '1px solid rgba(255,255,255,0.15)',
                background: dateFilter === filter ? 'rgba(171,103,247,0.15)' : 'rgba(255,255,255,0.04)',
                color: dateFilter === filter ? '#AB67F7' : '#999',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {filter === 'all' ? 'All' : filter}
            </button>
          ))}
        </div>

        {/* Genre filters - expandable */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {visibleGenres.map(genre => (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '16px',
                  border: selectedGenres.includes(genre) 
                    ? '1px solid #AB67F7' 
                    : '1px solid rgba(255,255,255,0.12)',
                  background: selectedGenres.includes(genre) 
                    ? 'rgba(171,103,247,0.15)' 
                    : 'rgba(255,255,255,0.04)',
                  color: selectedGenres.includes(genre) ? '#AB67F7' : '#888',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {genre}
              </button>
            ))}
            
            {/* Show more/less toggle */}
            <button
              onClick={() => setShowAllGenres(!showAllGenres)}
              style={{
                padding: '8px 14px',
                borderRadius: '16px',
                border: '1px solid rgba(171,103,247,0.3)',
                background: 'transparent',
                color: '#AB67F7',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {showAllGenres ? '− Show less' : `+ ${ALL_GENRES.length - 8} more`}
            </button>
          </div>
          
          {/* Clear filters if any selected */}
          {selectedGenres.length > 0 && (
            <button
              onClick={() => setSelectedGenres([])}
              style={{
                marginTop: '12px',
                padding: '6px 12px',
                background: 'transparent',
                border: 'none',
                color: '#666',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Clear genre filters
            </button>
          )}
        </div>

        {/* Results count */}
        <div style={{ 
          color: '#AB67F7', 
          fontSize: '14px', 
          fontWeight: 600,
          marginTop: '16px',
        }}>
          {filteredEvents.length} events found
        </div>
      </div>

      {/* Events list */}
      <main style={{ padding: '0 20px 100px' }}>
        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            padding: '60px 0',
            color: '#666',
          }}>
            Loading events...
          </div>
        ) : Object.keys(groupedEvents).length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🌙</div>
            <p style={{ color: '#888', fontSize: '16px', marginBottom: '8px' }}>No events found</p>
            <p style={{ color: '#666', fontSize: '14px' }}>Try different filters or check back later</p>
          </div>
        ) : (
          Object.entries(groupedEvents).map(([date, dateEvents]) => (
            <div key={date} style={{ marginBottom: '32px' }}>
              {/* Date header */}
              <div style={{ 
                fontSize: '12px', 
                fontWeight: 700, 
                color: '#666',
                letterSpacing: '1px',
                marginBottom: '12px',
                padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                {formatDate(date).toUpperCase()}
              </div>
              
              {/* Events for this date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dateEvents.map(event => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    style={{
                      display: 'flex',
                      gap: '14px',
                      padding: '14px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      textDecoration: 'none',
                      transition: 'background 150ms ease',
                    }}
                  >
                    {/* Event image */}
                    <div
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        background: '#1a1a1f',
                        flexShrink: 0,
                      }}
                    >
                      {event.image_url ? (
                        <img 
                          src={event.image_url} 
                          alt="" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ 
                          width: '100%', 
                          height: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '24px',
                          opacity: 0.3,
                        }}>
                          ♪
                        </div>
                      )}
                    </div>
                    
                    {/* Event info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ 
                        fontSize: '15px', 
                        fontWeight: 600, 
                        color: '#fff',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {event.title}
                      </h3>
                      
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#888',
                        marginBottom: '8px',
                      }}>
                        {event.venue?.name}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#AB67F7', fontWeight: 600 }}>
                          {formatTime(event.start_time)}
                        </span>
                        
                        {event.genres && (
                          <span style={{ 
                            fontSize: '11px', 
                            color: '#666',
                            background: 'rgba(255,255,255,0.06)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}>
                            {event.genres.split(',')[0]?.trim()}
                          </span>
                        )}
                        
                        {event.ticket_source === 'ra' && (
                          <span style={{ 
                            fontSize: '10px', 
                            color: '#ffcc00',
                            background: 'rgba(255,204,0,0.1)',
                            padding: '2px 5px',
                            borderRadius: '3px',
                            fontWeight: 600,
                          }}>
                            RA
                          </span>
                        )}
                        
                        {formatPrice(event) && (
                          <span style={{ fontSize: '12px', color: '#666', marginLeft: 'auto' }}>
                            {formatPrice(event)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
