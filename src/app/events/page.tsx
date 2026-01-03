'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import NavBar from '../../components/NavBar'

// ============================================================================
// EVENTS PAGE - All events with smart genre ordering
// Genres ordered by event count, "For You" for logged-in users
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
  genres: string | null
  price_min: number | null
  price_max: number | null
  image_url: string | null
  event_url: string | null
  so_pick: boolean
  sold_out: boolean
  venue: Venue
}

// Genre styles for placeholders
const GENRE_STYLES: Record<string, { gradient: string; emoji: string }> = {
  techno: { gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', emoji: '🔊' },
  house: { gradient: 'linear-gradient(135deg, #2d132c 0%, #801336 50%, #c72c41 100%)', emoji: '🎧' },
  dnb: { gradient: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 50%, #2d2d44 100%)', emoji: '⚡' },
  disco: { gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)', emoji: '✨' },
  'hip-hop': { gradient: 'linear-gradient(135deg, #1e1e1e 0%, #3d3d3d 50%, #5a5a5a 100%)', emoji: '🔥' },
  indie: { gradient: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 50%, #c4e0e5 100%)', emoji: '🌙' },
  live: { gradient: 'linear-gradient(135deg, #232526 0%, #414345 50%, #5a5a5a 100%)', emoji: '🎸' },
  default: { gradient: 'linear-gradient(135deg, #1a1a22 0%, #252530 50%, #1e1e28 100%)', emoji: '🎵' },
}

const getGenreStyle = (genres: string | null) => {
  if (!genres) return GENRE_STYLES.default
  const firstGenre = genres.split(',')[0]?.trim().toLowerCase() || ''
  for (const key of Object.keys(GENRE_STYLES)) {
    if (firstGenre.includes(key) || key.includes(firstGenre)) {
      return GENRE_STYLES[key]
    }
  }
  return GENRE_STYLES.default
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set())
  const [activeGenre, setActiveGenre] = useState<string | null>(null)
  const [showForYou, setShowForYou] = useState(false)

  // Load user and events
  useEffect(() => {
    const loadData = async () => {
      // Check auth
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setUser({ id: authUser.id })
        
        // Load saved events from database
        const { data: savedData } = await supabase
          .from('saved_events')
          .select('event_id')
          .eq('user_id', authUser.id)
        
        if (savedData) {
          const ids = new Set<string>()
          for (let i = 0; i < savedData.length; i++) {
            ids.add(savedData[i].event_id as string)
          }
          setSavedEventIds(ids)
        }
      }

      // Load events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*, venue:venues(*)')
        .eq('status', 'published')
        .gte('start_time', new Date().toISOString().split('T')[0])
        .order('start_time')

      if (eventsData) {
        setEvents(eventsData as unknown as Event[])
      }

      setLoading(false)
    }

    loadData()
  }, [])

  // Calculate genres sorted by event count
  const sortedGenres = useMemo(() => {
    const genreCount = new Map<string, number>()
    
    for (let i = 0; i < events.length; i++) {
      const event: Event = events[i]
      if (event.genres) {
        const genres: string[] = event.genres.split(',')
        for (let j = 0; j < genres.length; j++) {
          const normalized: string = genres[j].trim().toLowerCase()
          genreCount.set(normalized, (genreCount.get(normalized) || 0) + 1)
        }
      }
    }

    // Sort by count descending
    const entries: [string, number][] = Array.from(genreCount.entries())
    entries.sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    
    const sorted: { genre: string; count: number }[] = []
    for (let i = 0; i < entries.length; i++) {
      sorted.push({ genre: entries[i][0], count: entries[i][1] })
    }

    return sorted
  }, [events])

  // Filter events
  const filteredEvents = useMemo(() => {
    let result: Event[] = events

    if (showForYou && user) {
      // Filter to saved genres (simplified - would be smarter with real preference data)
      const savedGenres = new Set<string>()
      for (let i = 0; i < events.length; i++) {
        const event: Event = events[i]
        if (savedEventIds.has(event.id) && event.genres) {
          const genreList: string[] = event.genres.split(',')
          for (let j = 0; j < genreList.length; j++) {
            savedGenres.add(genreList[j].trim().toLowerCase())
          }
        }
      }
      
      if (savedGenres.size > 0) {
        const filtered: Event[] = []
        for (let i = 0; i < events.length; i++) {
          const e: Event = events[i]
          if (!e.genres) continue
          const eventGenres: string[] = e.genres.split(',')
          for (let j = 0; j < eventGenres.length; j++) {
            if (savedGenres.has(eventGenres[j].trim().toLowerCase())) {
              filtered.push(e)
              break
            }
          }
        }
        result = filtered
      }
    }

    if (activeGenre) {
      const filtered: Event[] = []
      for (let i = 0; i < result.length; i++) {
        const e: Event = result[i]
        if (e.genres?.toLowerCase().includes(activeGenre.toLowerCase())) {
          filtered.push(e)
        }
      }
      result = filtered
    }

    return result
  }, [events, activeGenre, showForYou, user, savedEventIds])

  // Group by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, Event[]> = {}
    
    for (let i = 0; i < filteredEvents.length; i++) {
      const event: Event = filteredEvents[i]
      const date = new Date(event.start_time)
      const label: string = date.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      }).toUpperCase()
      
      if (!groups[label]) groups[label] = []
      groups[label].push(event)
    }

    return groups
  }, [filteredEvents])

  const formatTime = (s: string) => 
    new Date(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const formatPrice = (min: number | null, max: number | null) => {
    if (min === 0 || (!min && !max)) return 'Free'
    if (min && max && min !== max) return `£${min}–£${max}`
    return `£${min || max}`
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white' }}>
      <NavBar />
      
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px 100px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>All Events</h1>
          <p style={{ fontSize: '14px', color: '#777' }}>
            {loading ? 'Loading...' : `${filteredEvents.length} events coming up`}
          </p>
        </div>

        {/* Genre Filters - Scrollable */}
        <div 
          style={{ 
            display: 'flex', 
            gap: '8px', 
            overflowX: 'auto', 
            paddingBottom: '12px',
            marginBottom: '24px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* For You - Only show if logged in */}
          {user && (
            <button
              onClick={() => { setShowForYou(!showForYou); setActiveGenre(null) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                borderRadius: '22px',
                border: showForYou ? '2px solid #ab67f7' : '1px solid rgba(255,255,255,0.15)',
                fontSize: '14px',
                fontWeight: showForYou ? 700 : 500,
                cursor: 'pointer',
                background: showForYou ? 'linear-gradient(135deg, #ab67f7, #c490ff)' : 'transparent',
                color: showForYou ? 'white' : '#aaa',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              ✨ For You
            </button>
          )}

          {/* All Events */}
          <button
            onClick={() => { setActiveGenre(null); setShowForYou(false) }}
            style={{
              padding: '10px 18px',
              borderRadius: '22px',
              border: !activeGenre && !showForYou ? '2px solid #ab67f7' : '1px solid rgba(255,255,255,0.15)',
              fontSize: '14px',
              fontWeight: !activeGenre && !showForYou ? 700 : 500,
              cursor: 'pointer',
              background: !activeGenre && !showForYou ? 'linear-gradient(135deg, #ab67f7, #c490ff)' : 'transparent',
              color: !activeGenre && !showForYou ? 'white' : '#aaa',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            All
          </button>

          {/* Genres sorted by count */}
          {sortedGenres.map(({ genre, count }: { genre: string; count: number }) => (
            <button
              key={genre}
              onClick={() => { setActiveGenre(genre); setShowForYou(false) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '22px',
                border: activeGenre === genre ? '2px solid #ab67f7' : '1px solid rgba(255,255,255,0.15)',
                fontSize: '14px',
                fontWeight: activeGenre === genre ? 700 : 500,
                cursor: 'pointer',
                background: activeGenre === genre ? 'rgba(171,103,247,0.2)' : 'transparent',
                color: activeGenre === genre ? '#ab67f7' : '#aaa',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {genre}
              <span style={{ 
                fontSize: '11px', 
                color: activeGenre === genre ? '#ab67f7' : '#666',
                fontWeight: 400,
              }}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Events Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ color: '#777' }}>Loading events...</p>
          </div>
        ) : Object.entries(groupedEvents).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>🌙</p>
            <p style={{ fontSize: '16px', color: '#777', marginBottom: '8px' }}>No events found</p>
            <p style={{ fontSize: '14px', color: '#555' }}>Try a different filter</p>
          </div>
        ) : (
          Object.entries(groupedEvents).map(([date, dateEvents]: [string, Event[]]) => (
            <section key={date} style={{ marginBottom: '32px' }}>
              <h2 style={{ 
                fontSize: '12px', 
                fontWeight: 700, 
                color: '#666', 
                textTransform: 'uppercase', 
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                {date}
              </h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '16px' 
              }}>
                {dateEvents.map((event: Event) => (
                  <Link 
                    key={event.id}
                    href={`/event/${event.id}`}
                    style={{
                      display: 'block',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      textDecoration: 'none',
                      color: 'white',
                      transition: 'transform 200ms ease, background 200ms ease',
                    }}
                  >
                    {/* Image */}
                    {event.image_url ? (
                      <div style={{ aspectRatio: '16/9', overflow: 'hidden' }}>
                        <img 
                          src={event.image_url} 
                          alt="" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </div>
                    ) : (
                      <div 
                        style={{ 
                          aspectRatio: '16/9', 
                          background: getGenreStyle(event.genres).gradient,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ fontSize: '36px', opacity: 0.6 }}>
                          {getGenreStyle(event.genres).emoji}
                        </span>
                        <span style={{ 
                          fontSize: '11px', 
                          color: 'rgba(255,255,255,0.4)', 
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                        }}>
                          {event.genres?.split(',')[0]?.trim() || 'Live Event'}
                        </span>
                      </div>
                    )}

                    {/* Content */}
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        {event.so_pick && (
                          <img src="/so-icon.png" alt="Curated" style={{ height: '14px' }} />
                        )}
                        <span style={{ 
                          fontSize: '12px', 
                          color: '#ab67f7', 
                          fontWeight: 700 
                        }}>
                          {formatTime(event.start_time)}
                        </span>
                        {event.sold_out && (
                          <span style={{ 
                            fontSize: '10px', 
                            fontWeight: 700, 
                            color: '#f87171',
                            background: 'rgba(248,113,113,0.15)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}>
                            SOLD OUT
                          </span>
                        )}
                      </div>

                      <h3 style={{ 
                        fontSize: '16px', 
                        fontWeight: 700, 
                        marginBottom: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {event.title}
                      </h3>

                      <p style={{ 
                        fontSize: '13px', 
                        color: '#999', 
                        marginBottom: '8px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {event.venue?.name}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {event.genres && (
                          <span style={{ 
                            fontSize: '11px', 
                            color: '#22d3ee',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '60%',
                          }}>
                          {event.genres.split(',').slice(0, 2).map((g: string) => g.trim()).join(' · ')}
                          </span>
                        )}
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: 600,
                          color: event.price_min === 0 ? '#22c55e' : '#999',
                        }}>
                          {formatPrice(event.price_min, event.price_max)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  )
}
