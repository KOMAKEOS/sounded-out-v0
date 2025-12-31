'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

interface Venue {
  id: string
  name: string
}

interface Event {
  id: string
  title: string
  start_time: string
  image_url: string | null
  genres: string | null
  price_min: number | null
  price_max: number | null
  sold_out: boolean
  so_pick: boolean
  venue: Venue | null
}

const GENRE_OPTIONS = ['techno', 'house', 'dnb', 'disco', 'hip-hop', 'indie', 'live', 'student']

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [activeGenre, setActiveGenre] = useState<string | null>(null)

  useEffect(() => {
    const loadEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, start_time, image_url, genres, price_min, price_max, sold_out, so_pick, venue:venues(id, name)')
        .eq('status', 'published')
        .gte('start_time', new Date().toISOString().split('T')[0])
        .order('start_time')
      
      if (data) {
        setEvents(data as unknown as Event[])
      }
      setLoading(false)
    }
    loadEvents()
  }, [])

  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>()
    for (let i = 0; i < events.length; i++) {
      const e = events[i]
      if (e.genres) {
        const parts = e.genres.split(',')
        for (let j = 0; j < parts.length; j++) {
          const g = parts[j].trim().toLowerCase()
          if (GENRE_OPTIONS.indexOf(g) !== -1) {
            genreSet.add(g)
          }
        }
      }
    }
    const result: string[] = []
    for (let i = 0; i < GENRE_OPTIONS.length; i++) {
      if (genreSet.has(GENRE_OPTIONS[i])) {
        result.push(GENRE_OPTIONS[i])
      }
    }
    return result
  }, [events])

  const filtered = useMemo(() => {
    if (!activeGenre) return events
    const result: Event[] = []
    for (let i = 0; i < events.length; i++) {
      const e = events[i]
      if (e.genres && e.genres.toLowerCase().indexOf(activeGenre.toLowerCase()) !== -1) {
        result.push(e)
      }
    }
    return result
  }, [events, activeGenre])

  const grouped = useMemo(() => {
    const g: Record<string, Event[]> = {}
    for (let i = 0; i < filtered.length; i++) {
      const e = filtered[i]
      const d = new Date(e.start_time)
      const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()
      if (!g[label]) g[label] = []
      g[label].push(e)
    }
    return g
  }, [filtered])

  const formatTime = (date: string): string => {
    return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatPrice = (min: number | null, max: number | null): string | null => {
    if (min === 0 || (!min && !max)) return null
    if (min && max && min !== max) return '£' + min + '–£' + max
    return '£' + (min || max)
  }

  const isFree = (min: number | null, max: number | null): boolean => {
    return min === 0 || (!min && !max)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', paddingBottom: '60px' }}>
      <header style={{
        padding: '16px 20px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        background: '#0a0a0b',
        zIndex: 10,
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <img src="/logo.svg" alt="Sounded Out" style={{ height: '24px' }} />
            </Link>
            <div style={{ display: 'flex', gap: '16px' }}>
              <Link href="/venues" style={{ color: '#888', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Venues</Link>
              <Link href="/saved" style={{ color: '#888', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Saved</Link>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>Events</h1>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
          Upcoming events in Newcastle
        </p>

        {availableGenres.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button
              onClick={() => setActiveGenre(null)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: !activeGenre ? '#ab67f7' : 'rgba(255,255,255,0.06)',
                color: !activeGenre ? 'white' : '#888',
                fontSize: '13px',
                fontWeight: !activeGenre ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              All
            </button>
            {availableGenres.map((genre: string) => (
              <button
                key={genre}
                onClick={() => setActiveGenre(activeGenre === genre ? null : genre)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeGenre === genre ? '#ab67f7' : 'rgba(255,255,255,0.06)',
                  color: activeGenre === genre ? 'white' : '#888',
                  fontSize: '13px',
                  fontWeight: activeGenre === genre ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  textTransform: 'capitalize',
                }}
              >
                {genre}
              </button>
            ))}
            {activeGenre && (
              <button
                onClick={() => setActiveGenre(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(171,103,247,0.3)',
                  background: 'transparent',
                  color: '#ab67f7',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}

        <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>&#127926;</div>
            <p style={{ fontSize: '16px', color: '#888', marginBottom: '8px' }}>No events found</p>
            <p style={{ fontSize: '14px', color: '#666' }}>Try a different filter</p>
          </div>
        ) : (
          Object.keys(grouped).map((label: string) => (
            <div key={label} style={{ marginBottom: '28px' }}>
              <h2 style={{ 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#888', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px',
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                {label}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {grouped[label].map((event: Event) => (
                  <Link 
                    key={event.id}
                    href={'/event/' + event.id}
                    style={{
                      display: 'flex',
                      gap: '14px',
                      padding: '14px',
                      background: '#141416',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      color: 'white',
                    }}
                  >
                    {event.image_url ? (
                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}>
                        <img 
                          src={event.image_url} 
                          alt="" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #1e1e24, #252530)',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#333',
                        fontSize: '24px',
                      }}>
                        &#9835;
                      </div>
                    )}
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        {event.so_pick && (
                          <img src="/so-icon.png" alt="" style={{ height: '12px' }} />
                        )}
                        <p style={{ fontSize: '11px', color: '#ab67f7', fontWeight: 600 }}>
                          {formatTime(event.start_time)}
                        </p>
                      </div>
                      <h3 style={{ 
                        fontSize: '15px', 
                        fontWeight: 600, 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        margin: 0,
                        marginBottom: '4px',
                      }}>
                        {event.title}
                      </h3>
                      <p style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                        {event.venue?.name}
                      </p>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {event.sold_out ? (
                          <span style={{ fontSize: '10px', color: '#f87171', fontWeight: 600 }}>SOLD OUT</span>
                        ) : isFree(event.price_min, event.price_max) ? (
                          <span style={{ 
                            fontSize: '10px', 
                            color: '#22c55e', 
                            fontWeight: 600,
                            background: 'rgba(34,197,94,0.15)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}>FREE</span>
                        ) : formatPrice(event.price_min, event.price_max) ? (
                          <span style={{ fontSize: '11px', color: '#888' }}>
                            {formatPrice(event.price_min, event.price_max)}
                          </span>
                        ) : null}
                        {event.genres && (
                          <span style={{ fontSize: '10px', color: '#666' }}>
                            {event.genres.split(',')[0]?.trim()}
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
