'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

interface Venue {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  instagram_url: string | null
  no_phones: boolean
}

interface Event {
  id: string
  title: string
  start_time: string
  end_time: string | null
  image_url: string | null
  event_url: string | null
  genres: string | null
  vibe: string | null
  description: string | null
  price_min: number | null
  price_max: number | null
  sold_out: boolean
  so_pick: boolean
  no_phones: boolean
  is_verified: boolean
  venue: Venue | null
}

interface User {
  id: string
  email?: string
}

export default function EventPage() {
  const params = useParams()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [interested, setInterested] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) setUser(data.user)
    }
    loadUser()
  }, [])

  useEffect(() => {
    if (!params.id) return
    
    const loadEvent = async () => {
      const { data } = await supabase
        .from('events')
        .select('*, venue:venues(*)')
        .eq('id', params.id)
        .single()
      
      if (data) setEvent(data as unknown as Event)
      setLoading(false)
    }
    loadEvent()
  }, [params.id])

  useEffect(() => {
    if (!user || !event) return
    
    const checkSaved = async () => {
      const { data } = await supabase
        .from('saved_events')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', event.id)
        .single()
      
      if (data) setSaved(true)
    }
    checkSaved()
  }, [user, event])

  const handleSave = async () => {
    if (!user) {
      window.location.href = '/login'
      return
    }
    
    if (!event) return
    
    if (saved) {
      await supabase
        .from('saved_events')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', event.id)
      setSaved(false)
    } else {
      await supabase
        .from('saved_events')
        .insert({ user_id: user.id, event_id: event.id })
      setSaved(true)
    }
  }

  const handleInterested = async () => {
    if (!user) {
      window.location.href = '/login'
      return
    }
    setInterested(!interested)
  }

  const handleShare = async () => {
    if (!event) return
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({
        title: event.title,
        text: event.title + ' at ' + (event.venue?.name || ''),
        url: url,
      })
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copied!')
    }
  }

  const formatDate = (date: string): string => {
    const d = new Date(date)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (d.toDateString() === now.toDateString()) return 'Today'
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const formatTime = (date: string): string => {
    return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatPrice = (min: number | null, max: number | null): string | null => {
    if (!min && !max) return null
    if (min === 0) return null
    if (min && max && min !== max) return '£' + min + '–£' + max
    return '£' + (min || max)
  }

  const isFree = (min: number | null, max: number | null): boolean => {
    return min === 0 || (!min && !max)
  }

  const getTicketUrl = (url: string | null): string | null => {
    if (!url) return null
    if (!url.startsWith('http://') && !url.startsWith('https://')) return 'https://' + url
    return url
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    )
  }

  if (!event) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', padding: '60px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Event not found</h1>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
          This event may have been removed or the link is incorrect.
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
    )
  }

  const mapsUrl = event.venue ? 'https://www.google.com/maps/dir/?api=1&destination=' + event.venue.lat + ',' + event.venue.lng : '#'

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', paddingBottom: '100px' }}>
      {event.image_url ? (
        <div style={{ width: '100%', aspectRatio: '16/9', maxHeight: '300px', overflow: 'hidden', position: 'relative' }}>
          <img src={event.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0a0a0b 0%, transparent 50%)' }} />
          <Link 
            href="/events" 
            style={{ 
              position: 'absolute', 
              top: 'max(16px, env(safe-area-inset-top))', 
              left: '16px', 
              background: 'rgba(0,0,0,0.5)', 
              backdropFilter: 'blur(10px)',
              padding: '8px 12px',
              borderRadius: '8px',
              color: 'white',
              textDecoration: 'none',
              fontSize: '13px',
            }}
          >
            ← Back
          </Link>
        </div>
      ) : (
        <div style={{ 
          width: '100%', 
          aspectRatio: '16/9', 
          maxHeight: '200px',
          background: 'linear-gradient(135deg, #1a1a1f 0%, #252530 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          position: 'relative',
        }}>
          <span style={{ fontSize: '32px', opacity: 0.4 }}>&#9835;</span>
          <span style={{ fontSize: '12px', color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {event.genres?.split(',')[0]?.trim() || 'Event'}
          </span>
          <Link 
            href="/events" 
            style={{ 
              position: 'absolute', 
              top: 'max(16px, env(safe-area-inset-top))', 
              left: '16px', 
              background: 'rgba(0,0,0,0.5)', 
              padding: '8px 12px',
              borderRadius: '8px',
              color: 'white',
              textDecoration: 'none',
              fontSize: '13px',
            }}
          >
            ← Back
          </Link>
        </div>
      )}

      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 20px' }}>
        <p style={{ 
          fontSize: '14px', 
          color: '#ab67f7', 
          fontWeight: 600, 
          textTransform: 'uppercase',
          marginBottom: '8px',
        }}>
          {formatDate(event.start_time)} · {formatTime(event.start_time)}
          {event.end_time && ' – ' + formatTime(event.end_time)}
        </p>

        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 700, 
          lineHeight: 1.2, 
          marginBottom: '12px',
        }}>
          {event.title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {event.so_pick && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <img src="/so-icon.png" alt="" style={{ height: '14px' }} />
              <span style={{ fontSize: '12px', color: '#888' }}>Curated</span>
            </div>
          )}
          {event.is_verified && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ 
                width: '16px', height: '16px', background: '#ab67f7', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'white'
              }}>✓</span>
              <span style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 500 }}>Verified</span>
            </div>
          )}
        </div>

        {event.venue && (
          <Link 
            href={'/venue/' + event.venue.id}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '20px',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '15px', color: '#888' }}>{event.venue.name}</span>
            <span style={{ color: '#666' }}>→</span>
          </Link>
        )}

        {(event.no_phones || event.venue?.no_phones) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            background: 'rgba(255,200,50,0.08)',
            border: '1px solid rgba(255,200,50,0.15)',
            borderRadius: '10px',
            marginBottom: '20px',
          }}>
            <span style={{ fontSize: '14px', color: '#ffc832' }}>No phones policy</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {event.sold_out && (
            <span style={{ 
              padding: '6px 12px', 
              background: 'rgba(248,113,113,0.15)', 
              borderRadius: '6px', 
              fontSize: '12px', 
              fontWeight: 600, 
              color: '#f87171' 
            }}>
              Sold out
            </span>
          )}
          {isFree(event.price_min, event.price_max) && (
            <span style={{ 
              padding: '6px 12px', 
              background: 'rgba(34,197,94,0.15)', 
              borderRadius: '6px', 
              fontSize: '12px', 
              fontWeight: 600, 
              color: '#22c55e' 
            }}>
              Free
            </span>
          )}
          {event.genres && event.genres.split(',').map((g: string, i: number) => (
            <span key={i} style={{ 
              padding: '6px 12px', 
              background: 'rgba(171,103,247,0.12)', 
              borderRadius: '6px', 
              fontSize: '12px', 
              color: '#ab67f7' 
            }}>
              {g.trim()}
            </span>
          ))}
        </div>

        {formatPrice(event.price_min, event.price_max) && (
          <p style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
            {formatPrice(event.price_min, event.price_max)}
          </p>
        )}

        {event.description && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '14px', color: '#aaa', lineHeight: 1.7 }}>
              {event.description}
            </p>
          </div>
        )}

        {getTicketUrl(event.event_url) && (
          <a 
            href={getTicketUrl(event.event_url)!} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'block',
              padding: '16px',
              background: event.sold_out ? 'rgba(255,255,255,0.1)' : '#ab67f7',
              borderRadius: '12px',
              textAlign: 'center',
              fontWeight: 600,
              fontSize: '15px',
              color: event.sold_out ? '#888' : 'white',
              textDecoration: 'none',
              marginBottom: '12px',
            }}
          >
            {event.sold_out ? 'View page (sold out)' : isFree(event.price_min, event.price_max) ? 'View page' : 'Get tickets'}
          </a>
        )}

        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '12px',
              background: saved ? 'rgba(171,103,247,0.15)' : 'rgba(255,255,255,0.06)',
              border: saved ? '1px solid rgba(171,103,247,0.3)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: saved ? '#ab67f7' : '#888',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {saved ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={handleInterested}
            style={{
              flex: 1,
              padding: '12px',
              background: interested ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
              border: interested ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: interested ? '#22c55e' : '#888',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {interested ? 'Interested' : 'Interested?'}
          </button>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              padding: '12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#888',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Share
          </button>
        </div>

        <a 
          href={mapsUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            color: '#888',
            fontSize: '13px',
            textDecoration: 'none',
            marginBottom: '28px',
          }}
        >
          Directions to {event.venue?.name}
        </a>

        {event.venue && (
          <Link 
            href={'/venue/' + event.venue.id}
            style={{ 
              display: 'block',
              padding: '16px', 
              background: '#141416', 
              borderRadius: '12px',
              textDecoration: 'none',
              color: 'white',
            }}
          >
            <p style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Venue
            </p>
            <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
              {event.venue.name}
            </p>
            <p style={{ fontSize: '13px', color: '#888' }}>
              {event.venue.address}
            </p>
          </Link>
        )}
      </main>
    </div>
  )
}
