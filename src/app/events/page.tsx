'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

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

interface User {
  id: string
  email?: string
}

interface UserProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
}

const GENRE_OPTIONS = ['All', 'Techno', 'House', 'D&B', 'Disco', 'Hip-Hop', 'R&B', 'Indie', 'Rock', 'Live', 'Student']

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUser(data.user)
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('id, display_name, avatar_url')
          .eq('id', data.user.id)
          .single()
        if (profileData) {
          setProfile(profileData as UserProfile)
        }
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    const loadEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_time, image_url, genres, price_min, price_max, sold_out, so_pick, venue:venues(id, name)')
        .eq('status', 'published')
        .gte('start_time', new Date().toISOString())
        .order('start_time')

      if (!error && data) {
        setEvents(data as unknown as Event[])
      }
      setLoading(false)
    }
    loadEvents()
  }, [])

  const filteredEvents = useMemo(() => {
    if (selectedGenre === 'All') return events
    const filtered: Event[] = []
    for (let i = 0; i < events.length; i++) {
      const event = events[i]
      if (event.genres && event.genres.toLowerCase().includes(selectedGenre.toLowerCase())) {
        filtered.push(event)
      }
    }
    return filtered
  }, [events, selectedGenre])

  const groupedEvents = useMemo(() => {
    const groups: Record<string, Event[]> = {}
    for (let i = 0; i < filteredEvents.length; i++) {
      const event = filteredEvents[i]
      const date = new Date(event.start_time).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })
      if (!groups[date]) groups[date] = []
      groups[date].push(event)
    }
    return groups
  }, [filteredEvents])

  const formatTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatPrice = (min: number | null, max: number | null): string => {
    if (!min && !max) return 'Free'
    if (min === 0) return 'Free'
    if (min && !max) return '£' + min
    if (min && max && min === max) return '£' + min
    return '£' + min + '+'
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setShowUserMenu(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white' }}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10,10,11,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <span style={{ fontSize: '20px' }}>←</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#ab67f7' }}>Sounded Out</span>
          </Link>

          {/* User Section */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: profile?.avatar_url ? 'none' : 'linear-gradient(135deg, #ab67f7, #8b5cf6)',
                  border: '2px solid #ab67f7',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>
                    {profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </button>

              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  top: '44px',
                  right: 0,
                  width: '200px',
                  background: '#1a1a1e',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>{profile?.display_name || 'User'}</p>
                    <p style={{ fontSize: '12px', color: '#888' }}>{user.email}</p>
                  </div>
                  <Link href="/profile" style={{ display: 'block', padding: '12px 16px', color: 'white', textDecoration: 'none', fontSize: '14px' }}>
                    👤 Profile
                  </Link>
                  <Link href="/saved" style={{ display: 'block', padding: '12px 16px', color: 'white', textDecoration: 'none', fontSize: '14px' }}>
                    ♡ Saved
                  </Link>
                  <Link href="/settings" style={{ display: 'block', padding: '12px 16px', color: 'white', textDecoration: 'none', fontSize: '14px' }}>
                    ⚙️ Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'none',
                      border: 'none',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      color: '#f87171',
                      fontSize: '14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              style={{
                padding: '8px 20px',
                background: '#ab67f7',
                borderRadius: '20px',
                color: 'white',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Title */}
        <div style={{ padding: '8px 20px 16px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Events</h1>
          <p style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
            {filteredEvents.length} upcoming events in Newcastle
          </p>
        </div>

        {/* Genre Filters */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '0 20px 16px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          {GENRE_OPTIONS.map((genre: string) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              style={{
                padding: '8px 16px',
                background: selectedGenre === genre ? '#ab67f7' : 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: '20px',
                color: selectedGenre === genre ? 'white' : '#888',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {genre}
            </button>
          ))}
        </div>
      </header>

      {/* Events List */}
      <main style={{ padding: '20px', paddingBottom: '100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading...</div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🎵</p>
            <p style={{ color: '#888' }}>No events found</p>
          </div>
        ) : (
          Object.entries(groupedEvents).map(([date, dateEvents]: [string, Event[]]) => (
            <div key={date} style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#ab67f7',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {date}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dateEvents.map((event: Event) => (
                  <Link
                    key={event.id}
                    href={'/event/' + event.id}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px',
                      background: '#141416',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      color: 'white',
                    }}
                  >
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '8px',
                      background: event.image_url ? `url(${event.image_url}) center/cover` : '#1e1e24',
                      flexShrink: 0,
                      position: 'relative',
                    }}>
                      {event.so_pick && (
                        <div style={{
                          position: 'absolute',
                          top: '4px',
                          left: '4px',
                          padding: '2px 6px',
                          background: '#ab67f7',
                          borderRadius: '4px',
                          fontSize: '9px',
                          fontWeight: 600,
                        }}>
                          ⚡
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 600, marginBottom: '4px' }}>
                        {formatTime(event.start_time)}
                      </p>
                      <h3 style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {event.title}
                      </h3>
                      <p style={{ fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                        {event.venue?.name || 'Venue TBA'}
                      </p>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '12px',
                          color: event.price_min === 0 || !event.price_min ? '#22c55e' : '#888',
                          fontWeight: 500,
                        }}>
                          {formatPrice(event.price_min, event.price_max)}
                        </span>
                        {event.genres && (
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            background: 'rgba(255,255,255,0.06)',
                            borderRadius: '4px',
                            color: '#888',
                          }}>
                            {event.genres.split(',')[0]}
                          </span>
                        )}
                        {event.sold_out && (
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            background: 'rgba(239,68,68,0.15)',
                            borderRadius: '4px',
                            color: '#f87171',
                          }}>
                            Sold out
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

      {/* Sign up CTA for non-logged in users */}
      {!user && !loading && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          background: 'linear-gradient(transparent, rgba(10,10,11,0.95) 20%)',
        }}>
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(171,103,247,0.15), rgba(139,92,246,0.15))',
            borderRadius: '16px',
            border: '1px solid rgba(171,103,247,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>Get personalized picks</p>
              <p style={{ fontSize: '12px', color: '#888' }}>Sign up to save events & get recommendations</p>
            </div>
            <Link
              href="/signup"
              style={{
                padding: '10px 20px',
                background: '#ab67f7',
                borderRadius: '20px',
                color: 'white',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              Sign up free
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
