'use client'

import { useState, useEffect } from 'react'
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
  venue: Venue | null
}

interface User {
  id: string
  email?: string
}

// ✅ Deduplicate without Set iteration (works even with old TS target)
function uniqueStrings(arr: string[]): string[] {
  const seen: Record<string, true> = {}
  const out: string[] = []
  for (const v of arr) {
    if (!v) continue
    if (!seen[v]) {
      seen[v] = true
      out.push(v)
    }
  }
  return out
}

export default function SavedPage() {
  const [user, setUser] = useState<User | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) setUser({ id: data.user.id, email: data.user.email })
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) setUser({ id: session.user.id, email: session.user.email })
      else setUser(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load saved events
  useEffect(() => {
    const loadSavedEvents = async () => {
      setLoading(true)

      // Get IDs from localStorage
      const savedStr = typeof window !== 'undefined' ? localStorage.getItem('so_saved_events') : null
      const localIds: string[] = savedStr ? JSON.parse(savedStr) : []

      // If logged in, also get from database and merge
      let allIds = [...localIds]

      if (user) {
        const { data: dbSaved } = await supabase
          .from('saved_events')
          .select('event_id')
          .eq('user_id', user.id)

        if (dbSaved) {
          const dbIds = dbSaved.map((s: { event_id: string }) => s.event_id)

          // ✅ Merge unique IDs WITHOUT Set
          allIds = uniqueStrings([...localIds, ...dbIds])

          // Sync localStorage IDs to database (only missing ones)
          for (const id of localIds) {
            if (!dbIds.includes(id)) {
              await supabase
                .from('saved_events')
                .upsert({ user_id: user.id, event_id: id }, { onConflict: 'user_id,event_id' })
            }
          }

          // Update localStorage with merged list
          if (typeof window !== 'undefined') {
            localStorage.setItem('so_saved_events', JSON.stringify(allIds))
          }
        }
      }

      if (allIds.length > 0) {
        const { data: eventsData } = await supabase
          .from('events')
          .select('*, venue:venues(*)')
          .in('id', allIds)
          .order('start_time')

        if (eventsData) setEvents(eventsData as Event[])
        else setEvents([])
      } else {
        setEvents([])
      }

      setLoading(false)
    }

    loadSavedEvents()
  }, [user])

  const handleRemove = async (eventId: string) => {
    // Remove from localStorage
    const savedStr = localStorage.getItem('so_saved_events')
    let ids: string[] = savedStr ? JSON.parse(savedStr) : []
    ids = ids.filter((id) => id !== eventId)
    localStorage.setItem('so_saved_events', JSON.stringify(ids))

    // If logged in, also remove from database
    if (user) {
      await supabase.from('saved_events').delete().eq('user_id', user.id).eq('event_id', eventId)
    }

    // Update UI
    setEvents(events.filter((e) => e.id !== eventId))
  }

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

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white' }}>
      <NavBar />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Saved Events</h1>
          <p style={{ fontSize: '15px', color: '#888' }}>
            {user ? 'Your saved events are synced across devices.' : 'Sign in to sync your saved events across all your devices.'}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
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
            <p style={{ color: '#888' }}>Loading saved events...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(171,103,247,0.1), rgba(171,103,247,0.05))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ab67f7" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>No saved events yet</h3>
            <p
              style={{
                fontSize: '15px',
                color: '#888',
                marginBottom: '28px',
                maxWidth: '320px',
                margin: '0 auto 28px',
              }}
            >
              When you find events you&apos;re interested in, tap the heart icon to save them here.
            </p>
            <Link
              href="/"
              style={{
                display: 'inline-block',
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                borderRadius: '14px',
                color: 'white',
                textDecoration: 'none',
                fontSize: '16px',
                fontWeight: 700,
                boxShadow: '0 8px 32px rgba(171,103,247,0.3)',
              }}
            >
              Explore Events
            </Link>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px',
              }}
            >
              {events.map((event) => (
                <div
                  key={event.id}
                  style={{
                    background: '#141416',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                    transition: 'transform 150ms ease, box-shadow 150ms ease',
                  }}
                >
                  {/* Image */}
                  <Link href={`/events/${event.id}`}>
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
                        <span style={{ fontSize: '40px', opacity: 0.4 }}>🎵</span>
                      </div>
                    )}
                  </Link>

                  {/* Content */}
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <Link href={`/events/${event.id}`} style={{ textDecoration: 'none', color: 'white', flex: 1 }}>
                        <p style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 700, marginBottom: '6px' }}>
                          {formatDate(event.start_time)} · {formatTime(event.start_time)}
                        </p>
                        <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px', lineHeight: 1.3 }}>
                          {event.title}
                        </h3>
                        <p style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>{event.venue?.name}</p>
                      </Link>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemove(event.id)}
                        title="Remove from saved"
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          border: 'none',
                          background: 'rgba(248,113,113,0.15)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#f87171" stroke="#f87171" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>
                    </div>

                    {/* Tags */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {event.sold_out && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#f87171',
                            background: 'rgba(248,113,113,0.15)',
                            padding: '4px 10px',
                            borderRadius: '6px',
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
                            background: event.price_min === 0 ? 'rgba(34,197,94,0.15)' : 'transparent',
                            padding: event.price_min === 0 ? '4px 10px' : '0',
                            borderRadius: '6px',
                          }}
                        >
                          {formatPrice(event.price_min, event.price_max)}
                        </span>
                      )}

                      {event.genres && <span style={{ fontSize: '11px', color: '#ab67f7' }}>{formatGenre(event.genres.split(',')[0])}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sync Prompt for non-logged in users */}
            {!user && (
              <div
                style={{
                  marginTop: '40px',
                  padding: '24px',
                  background: 'rgba(171,103,247,0.08)',
                  border: '1px solid rgba(171,103,247,0.2)',
                  borderRadius: '16px',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '15px', color: '#ab67f7', marginBottom: '16px', fontWeight: 600 }}>
                  ✨ Sign in to sync your saved events across all your devices
                </p>
                <Link
                  href="/login"
                  style={{
                    display: 'inline-block',
                    padding: '14px 28px',
                    background: '#ab67f7',
                    borderRadius: '12px',
                    color: 'white',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: 600,
                  }}
                >
                  Sign In
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
