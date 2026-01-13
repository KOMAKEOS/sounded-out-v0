'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import NavBar from '../../components/NavBar'

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
  image_url: string | null
  genres: string | null
  price_min: number | null
  price_max: number | null
  sold_out: boolean
  so_pick: boolean
  venue: Venue | null
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'weekend'>('all')
  const [genreFilter, setGenreFilter] = useState<string | null>(null)

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const { data } = await supabase
          .from('events')
          .select('*, venue:venues(*)')
          .eq('status', 'published')
          .gte('start_time', new Date().toISOString().split('T')[0])
          .order('start_time')

        if (data) setEvents(data as Event[])
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [])

  const formatDate = (date: string): string => {
    const d = new Date(date)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (d.toDateString() === now.toDateString()) return 'Today'
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const formatTime = (date: string): string => {
    return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatPrice = (min: number | null, max: number | null): string | null => {
    if (min === 0) return 'Free'
    if (min == null && max == null) return null
    if (min != null && max != null && min !== max) return `£${min}–£${max}`
    return `£${min ?? max}`
  }

  const formatGenre = (genre: string): string => {
    return genre.trim().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  // Filter logic
  const isToday = (s: string) => new Date(s).toDateString() === new Date().toDateString()
  const isTomorrow = (s: string) => {
    const t = new Date()
    t.setDate(t.getDate() + 1)
    return new Date(s).toDateString() === t.toDateString()
  }
  const isWeekend = (s: string) => {
    const d = new Date(s)
    const day = d.getDay()
    return day === 5 || day === 6 || day === 0
  }

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (dateFilter === 'today' && !isToday(e.start_time)) return false
      if (dateFilter === 'tomorrow' && !isTomorrow(e.start_time)) return false
      if (dateFilter === 'weekend' && !isWeekend(e.start_time)) return false
      if (genreFilter && !e.genres?.toLowerCase().includes(genreFilter.toLowerCase())) return false
      return true
    })
  }, [events, dateFilter, genreFilter])

  // ✅ Get available genres (NO Set iteration → no TS downlevelIteration error)
  const genres = useMemo(() => {
    const seen: Record<string, true> = {}

    for (const e of events) {
      const parts = (e.genres || '')
        .split(',')
        .map((g) => g.trim().toLowerCase())
        .filter(Boolean)

      for (const g of parts) seen[g] = true
    }

    return Object.keys(seen).slice(0, 8)
  }, [events])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white' }}>
      <NavBar />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Events</h1>
        <p style={{ fontSize: '15px', color: '#888', marginBottom: '24px' }}>
          Discover what&apos;s happening in Newcastle
        </p>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {(['all', 'today', 'tomorrow', 'weekend'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: dateFilter === f ? '2px solid #ab67f7' : '1px solid rgba(255,255,255,0.1)',
                background: dateFilter === f ? 'rgba(171,103,247,0.15)' : 'transparent',
                color: dateFilter === f ? '#ab67f7' : '#888',
                fontSize: '14px',
                fontWeight: dateFilter === f ? 600 : 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Genre Filters */}
        {genres.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setGenreFilter(genreFilter === genre ? null : genre)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: genreFilter === genre ? '1px solid #ab67f7' : '1px solid rgba(255,255,255,0.08)',
                  background: genreFilter === genre ? 'rgba(171,103,247,0.15)' : 'rgba(255,255,255,0.04)',
                  color: genreFilter === genre ? '#ab67f7' : '#888',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {genre}
              </button>
            ))}
          </div>
        )}

        {/* Event Count */}
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
          <span style={{ color: '#ab67f7', fontWeight: 700 }}>{filtered.length}</span> events found
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '3px solid rgba(171,103,247,0.2)',
                borderTopColor: '#ab67f7',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <p style={{ color: '#888' }}>Loading events...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>🌙</p>
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>No events found</h3>
            <p style={{ fontSize: '14px', color: '#888' }}>Try adjusting your filters</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px',
            }}
          >
            {filtered.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                style={{
                  display: 'block',
                  background: '#141416',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                  textDecoration: 'none',
                  color: 'white',
                  transition: 'transform 150ms ease, box-shadow 150ms ease',
                }}
              >
                {/* Image */}
                {event.image_url ? (
                  <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
                    <img src={event.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '16/9',
                      background: 'linear-gradient(135deg, #1a1a2e, #252530)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: '36px', opacity: 0.4 }}>🎵</span>
                  </div>
                )}

                {/* Content */}
                <div style={{ padding: '16px' }}>
                  <p style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 700, marginBottom: '6px' }}>
                    {formatDate(event.start_time)} · {formatTime(event.start_time)}
                  </p>

                  <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px', lineHeight: 1.3 }}>
                    {event.title}
                  </h3>

                  <p style={{ fontSize: '14px', color: '#888', marginBottom: '10px' }}>{event.venue?.name}</p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {event.sold_out && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#f87171',
                          background: 'rgba(248,113,113,0.15)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        SOLD OUT
                      </span>
                    )}

                    {formatPrice(event.price_min, event.price_max) && (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: event.price_min === 0 ? 700 : 500,
                          color: event.price_min === 0 ? '#22c55e' : '#888',
                        }}
                      >
                        {formatPrice(event.price_min, event.price_max)}
                      </span>
                    )}

                    {event.genres && (
                      <span style={{ fontSize: '11px', color: '#22d3ee' }}>
                        {formatGenre(event.genres.split(',')[0])}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
