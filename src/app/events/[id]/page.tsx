'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import PageLayout from '../../../components/PageLayout'
import { supabase } from '../../../lib/supabase'

type Event = {
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
  venue: {
    id: string
    name: string
    address: string
    lat: number
    lng: number
    instagram_url: string | null
    no_phones: boolean
  }
}

export default function EventPage() {
  const params = useParams()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [user, setUser] = useState<any>(null)

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
      
      if (data) setEvent(data as any)
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
    
    if (saved) {
      await supabase
        .from('saved_events')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', event!.id)
      setSaved(false)
    } else {
      await supabase
        .from('saved_events')
        .insert({ user_id: user.id, event_id: event!.id })
      setSaved(true)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({
        title: event!.title,
        text: `${event!.title} at ${event!.venue?.name}`,
        url,
      })
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copied')
    }
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (d.toDateString() === now.toDateString()) return 'Today'
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatPrice = (min: number | null, max: number | null) => {
    if (!min && !max) return null
    if (min === 0) return null
    if (min && max && min !== max) return `£${min}–£${max}`
    return `£${min || max}`
  }

  const isFree = (min: number | null, max: number | null) => min === 0 || (!min && !max)

  const mapsUrl = (venue: Event['venue']) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`
  }

  const getTicketUrl = (url: string | null) => {
    if (!url) return null
    if (!url.startsWith('http://') && !url.startsWith('https://')) return `https://${url}`
    return url
  }

  if (loading) {
    return (
      <PageLayout maxWidth="700px">
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>
          Loading...
        </div>
      </PageLayout>
    )
  }

  if (!event) {
    return (
      <PageLayout maxWidth="700px">
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
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
      </PageLayout>
    )
  }

  return (
    <PageLayout maxWidth="700px">
      {/* Back link */}
      <Link 
        href="/events" 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '6px', 
          color: '#888', 
          textDecoration: 'none', 
          fontSize: '14px',
          marginBottom: '24px',
        }}
      >
        ← All events
      </Link>

      {/* Image */}
      {event.image_url ? (
        <div style={{ 
          width: '100%', 
          aspectRatio: '16/9', 
          borderRadius: '16px', 
          overflow: 'hidden', 
          marginBottom: '24px',
        }}>
          <img src={event.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <div style={{ 
          width: '100%', 
          aspectRatio: '16/9', 
          borderRadius: '16px', 
          background: 'linear-gradient(135deg, #1e1e24, #252530)', 
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '32px', opacity: 0.4 }}>🎵</span>
          <span style={{ fontSize: '12px', color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {event.genres?.split(',')[0]?.trim() || 'Event'}
          </span>
        </div>
      )}

      {/* Date/Time */}
      <p style={{ 
        fontSize: '14px', 
        color: '#ab67f7', 
        fontWeight: 600, 
        textTransform: 'uppercase',
        marginBottom: '8px',
      }}>
        {formatDate(event.start_time)} · {formatTime(event.start_time)}
        {event.end_time && ` – ${formatTime(event.end_time)}`}
      </p>

      {/* Title */}
      <h1 style={{ 
        fontSize: '32px', 
        fontWeight: 700, 
        lineHeight: 1.2, 
        marginBottom: '12px',
      }}>
        {event.title}
      </h1>

      {/* Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {event.so_pick && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img src="/so-icon.png" alt="" style={{ height: '16px' }} />
            <span style={{ fontSize: '13px', color: '#888' }}>Curated</span>
          </div>
        )}
        {event.is_verified && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ 
              width: '18px', 
              height: '18px', 
              background: '#ab67f7', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: 'white',
            }}>✓</span>
            <span style={{ fontSize: '13px', color: '#ab67f7', fontWeight: 500 }}>Verified</span>
          </div>
        )}
      </div>

      {/* Venue */}
      <Link 
        href={`/venue/${event.venue.id}`}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          marginBottom: '20px',
          textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: '16px', color: '#888' }}>{event.venue.name}</span>
        {event.venue.instagram_url && (
          <span style={{ color: '#666' }}>→</span>
        )}
      </Link>

      {/* No phones */}
      {(event.no_phones || event.venue.no_phones) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 16px',
          background: 'rgba(255,200,50,0.08)',
          border: '1px solid rgba(255,200,50,0.15)',
          borderRadius: '12px',
          marginBottom: '20px',
        }}>
          <span style={{ fontSize: '18px' }}>📵</span>
          <span style={{ fontSize: '14px', color: '#ffc832' }}>No phones policy</span>
        </div>
      )}

      {/* Tags */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {event.sold_out && (
          <span style={{ 
            padding: '8px 14px', 
            background: 'rgba(248,113,113,0.15)', 
            borderRadius: '8px', 
            fontSize: '13px', 
            fontWeight: 600, 
            color: '#f87171' 
          }}>
            Sold out
          </span>
        )}
        {isFree(event.price_min, event.price_max) && (
          <span style={{ 
            padding: '8px 14px', 
            background: 'rgba(34,197,94,0.15)', 
            borderRadius: '8px', 
            fontSize: '13px', 
            fontWeight: 600, 
            color: '#22c55e' 
          }}>
            Free
          </span>
        )}
        {event.genres?.split(',').map((g, i) => (
          <span key={i} style={{ 
            padding: '8px 14px', 
            background: 'rgba(171,103,247,0.12)', 
            borderRadius: '8px', 
            fontSize: '13px', 
            color: '#ab67f7' 
          }}>
            {g.trim()}
          </span>
        ))}
      </div>

      {/* Price */}
      {formatPrice(event.price_min, event.price_max) && (
        <p style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>
          {formatPrice(event.price_min, event.price_max)}
        </p>
      )}

      {/* Description */}
      {event.description && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '15px', color: '#aaa', lineHeight: 1.7 }}>
            {event.description}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
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
            }}
          >
            {event.sold_out ? 'View page (sold out)' : isFree(event.price_min, event.price_max) ? 'View page' : 'Get tickets'}
          </a>
        )}
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '14px',
              background: saved ? 'rgba(171,103,247,0.15)' : 'rgba(255,255,255,0.08)',
              border: saved ? '1px solid rgba(171,103,247,0.3)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: saved ? '#ab67f7' : '#888',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {saved ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#888',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Share
          </button>
        </div>

        <a 
          href={mapsUrl(event.venue)} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            color: '#888',
            fontSize: '14px',
            textDecoration: 'none',
          }}
        >
          Directions to {event.venue.name}
        </a>
      </div>

      {/* Venue card */}
      <div style={{ 
        padding: '20px', 
        background: '#141416', 
        borderRadius: '12px',
        marginBottom: '24px',
      }}>
        <p style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
          Venue
        </p>
        <Link 
          href={`/venue/${event.venue.id}`}
          style={{ 
            fontSize: '17px', 
            fontWeight: 600, 
            color: 'white', 
            textDecoration: 'none',
            display: 'block',
            marginBottom: '4px',
          }}
        >
          {event.venue.name}
        </Link>
        <p style={{ fontSize: '14px', color: '#888' }}>
          {event.venue.address}
        </p>
      </div>
    </PageLayout>
  )
}
