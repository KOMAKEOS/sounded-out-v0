'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type SavedEvent = {
  id: string
  event: {
    id: string
    title: string
    start_time: string
    image_url: string | null
    genres: string | null
    price_min: number | null
    price_max: number | null
    sold_out: boolean
    venue: {
      id: string
      name: string
    }
  }
}

export default function SavedPage() {
  const [saved, setSaved] = useState<SavedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUser(data.user)
      } else {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    if (!user) return
    
    const loadSaved = async () => {
      const { data } = await supabase
        .from('saved_events')
        .select(`
          id,
          event:events(
            id, title, start_time, image_url, genres, price_min, price_max, sold_out,
            venue:venues(id, name)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (data) {
        // Filter out any null events (deleted events)
        const valid = data.filter(s => s.event !== null) as SavedEvent[]
        setSaved(valid)
      }
      setLoading(false)
    }
    loadSaved()
  }, [user])

  const handleRemove = async (savedId: string) => {
    await supabase
      .from('saved_events')
      .delete()
      .eq('id', savedId)
    
    setSaved(saved.filter(s => s.id !== savedId))
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (d.toDateString() === now.toDateString()) return 'Today'
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const isPast = (date: string) => new Date(date) < new Date()

  // Separate upcoming and past
  const upcoming = saved.filter(s => !isPast(s.event.start_time))
  const past = saved.filter(s => isPast(s.event.start_time))

  if (!user && !loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', paddingBottom: '60px' }}>
        <header style={{
          padding: '16px 20px',
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <img src="/logo.svg" alt="Sounded Out" style={{ height: '24px' }} />
          </Link>
        </header>
        
        <main style={{ maxWidth: '500px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.5 }}>♡</div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>Save events you love</h1>
          <p style={{ fontSize: '15px', color: '#888', marginBottom: '32px', lineHeight: 1.6 }}>
            Sign in to save events and access them from any device.
          </p>
          <Link
            href="/login"
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              background: '#ab67f7',
              borderRadius: '10px',
              color: 'white',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            Sign in
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', paddingBottom: '60px' }}>
      {/* Header */}
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
              <Link href="/events" style={{ color: '#888', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Events</Link>
              <Link href="/venues" style={{ color: '#888', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Venues</Link>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>Saved</h1>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
          Events you've saved
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>
            Loading...
          </div>
        ) : saved.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>♡</div>
            <p style={{ fontSize: '16px', color: '#888', marginBottom: '8px' }}>No saved events</p>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
              Tap the save button on any event to add it here
            </p>
            <Link
              href="/events"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: '#ab67f7',
                borderRadius: '10px',
                color: 'white',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Browse events
            </Link>
          </div>
        ) : (
          <>
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#888', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px',
                  marginBottom: '16px',
                }}>
                  Upcoming ({upcoming.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {upcoming.map(({ id, event }) => (
                    <div 
                      key={id}
                      style={{
                        display: 'flex',
                        gap: '14px',
                        padding: '14px',
                        background: '#141416',
                        borderRadius: '12px',
                        position: 'relative',
                      }}
                    >
                      <Link 
                        href={`/event/${event.id}`}
                        style={{
                          display: 'flex',
                          gap: '14px',
                          flex: 1,
                          textDecoration: 'none',
                          color: 'white',
                        }}
                      >
                        {event.image_url ? (
                          <div style={{
                            width: '70px',
                            height: '70px',
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
                            width: '70px',
                            height: '70px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #1e1e24, #252530)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#333',
                            fontSize: '20px',
                          }}>
                            ♪
                          </div>
                        )}
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '11px', color: '#ab67f7', fontWeight: 600, marginBottom: '4px' }}>
                            {formatDate(event.start_time)} · {formatTime(event.start_time)}
                          </p>
                          <h3 style={{ 
                            fontSize: '14px', 
                            fontWeight: 600, 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            margin: 0,
                            marginBottom: '4px',
                          }}>
                            {event.title}
                          </h3>
                          <p style={{ fontSize: '12px', color: '#888' }}>
                            {event.venue?.name}
                          </p>
                        </div>
                      </Link>
                      
                      <button
                        onClick={() => handleRemove(id)}
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          width: '28px',
                          height: '28px',
                          background: 'rgba(255,255,255,0.06)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#666',
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past */}
            {past.length > 0 && (
              <div>
                <h2 style={{ 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#666', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px',
                  marginBottom: '16px',
                }}>
                  Past ({past.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', opacity: 0.6 }}>
                  {past.map(({ id, event }) => (
                    <div 
                      key={id}
                      style={{
                        display: 'flex',
                        gap: '14px',
                        padding: '14px',
                        background: '#141416',
                        borderRadius: '12px',
                        position: 'relative',
                      }}
                    >
                      <Link 
                        href={`/event/${event.id}`}
                        style={{
                          display: 'flex',
                          gap: '14px',
                          flex: 1,
                          textDecoration: 'none',
                          color: 'white',
                        }}
                      >
                        <div style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '8px',
                          background: '#1e1e24',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#333',
                          fontSize: '16px',
                        }}>
                          ♪
                        </div>
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                            {formatDate(event.start_time)}
                          </p>
                          <h3 style={{ 
                            fontSize: '13px', 
                            fontWeight: 500, 
                            margin: 0,
                            color: '#888',
                          }}>
                            {event.title}
                          </h3>
                        </div>
                      </Link>
                      
                      <button
                        onClick={() => handleRemove(id)}
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          width: '24px',
                          height: '24px',
                          background: 'transparent',
                          border: 'none',
                          color: '#444',
                          fontSize: '14px',
                          cursor: 'pointer',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
