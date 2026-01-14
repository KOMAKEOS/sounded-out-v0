'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

// ============================================================================
// EVENT DETAIL PAGE - /events/[id]/page.tsx
// 
// FIXES:
// 1. Hero image max-height capped at 280px (no more crazy stretching)
// 2. Back button uses router.back() to go to previous page
// 3. RA badge in top right corner
// 4. TypeScript types fixed
// ============================================================================

type Event = {
  id: string
  title: string
  description: string | null
  date: string
  start_time: string | null
  end_time: string | null
  image_url: string | null
  ticket_url: string | null
  ticket_source: string | null
  price_type: string | null
  price_min: number | null
  price_max: number | null
  genres: string | null
  status: string
  venue: {
    id: string
    name: string
    address: string
    lat: number
    lng: number
  } | null
  brand: {
    id: string
    name: string
    slug: string
  } | null
}

// Simplified type for related events list
type RelatedEvent = {
  id: string
  title: string
  date: string
  start_time: string | null
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) return 'TODAY'
  if (date.toDateString() === tomorrow.toDateString()) return 'TOMORROW'
  
  return date.toLocaleDateString('en-GB', { 
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).toUpperCase()
}

function formatTime(time: string | null): string {
  if (!time) return ''
  const [h, m] = time.split(':')
  return `${h}:${m}`
}

function formatPrice(event: Event): string {
  if (event.price_type === 'free') return 'FREE'
  if (event.price_min && event.price_max && event.price_min !== event.price_max) {
    return `£${event.price_min} - £${event.price_max}`
  }
  if (event.price_min) return `£${event.price_min}`
  return 'Price TBA'
}

function formatGenre(genre: string): string {
  return genre
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function EventPage() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [moreEvents, setMoreEvents] = useState<RelatedEvent[]>([])

  useEffect(() => {
    async function loadEvent() {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          venue:venues(*),
          brand:brands(id, name, slug)
        `)
        .eq('id', params.id)
        .single()

      if (data) {
        setEvent(data)
        
        // Load more events at same venue
        if (data.venue?.id) {
          const { data: venueEvents } = await supabase
            .from('events')
            .select('id, title, date, start_time')
            .eq('venue_id', data.venue.id)
            .neq('id', data.id)
            .gte('date', new Date().toISOString().split('T')[0])
            .order('date', { ascending: true })
            .limit(5)
          
          if (venueEvents) setMoreEvents(venueEvents as RelatedEvent[])
        }

        // Check if saved
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: savedData } = await supabase
            .from('saved_events')
            .select('id')
            .eq('user_id', user.id)
            .eq('event_id', data.id)
            .single()
          setSaved(!!savedData)
        }
      }
      
      setLoading(false)
    }

    if (params.id) loadEvent()
  }, [params.id])

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    if (saved) {
      await supabase
        .from('saved_events')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', event?.id)
      setSaved(false)
    } else {
      await supabase
        .from('saved_events')
        .insert({ user_id: user.id, event_id: event?.id })
      setSaved(true)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({
        title: event?.title,
        text: `${event?.title} at ${event?.venue?.name}`,
        url,
      })
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copied!')
    }
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0a0a0b', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#888',
      }}>
        Loading...
      </div>
    )
  }

  if (!event) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0a0a0b', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#fff',
        padding: '20px',
      }}>
        <p style={{ fontSize: '18px', marginBottom: '16px' }}>Event not found</p>
        <button
          onClick={() => router.back()}
          style={{
            padding: '12px 24px',
            background: '#AB67F7',
            borderRadius: '8px',
            border: 'none',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Go Back
        </button>
      </div>
    )
  }

  const directionsUrl = event.venue 
    ? `https://www.google.com/maps/dir/?api=1&destination=${event.venue.lat},${event.venue.lng}`
    : '#'

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: '#fff' }}>
      
      {/* Hero Image - FIXED: max-height capped */}
      {event.image_url ? (
        <div 
          style={{ 
            width: '100%', 
            height: '280px',  // Fixed height instead of aspect ratio
            maxHeight: '35vh', // Never more than 35% of viewport
            overflow: 'hidden', 
            position: 'relative',
          }}
        >
          <img 
            src={event.image_url} 
            alt="" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              objectPosition: 'center top', // Focus on top of image (usually face/main content)
            }} 
          />
          <div 
            style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'linear-gradient(to top, #0a0a0b 0%, rgba(10,10,11,0.3) 40%, transparent 100%)' 
            }} 
          />
          
          {/* Back button - FIXED: uses router.back() */}
          <button
            onClick={() => router.back()}
            style={{ 
              position: 'absolute', 
              top: 'max(16px, env(safe-area-inset-top))', 
              left: '16px', 
              background: 'rgba(0,0,0,0.5)', 
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              padding: '8px 14px',
              borderRadius: '20px',
              border: 'none',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ← Back
          </button>

          {/* RA badge if from Resident Advisor */}
          {event.ticket_source === 'ra' && (
            <div
              style={{
                position: 'absolute',
                top: 'max(16px, env(safe-area-inset-top))',
                right: '16px',
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                padding: '6px 10px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#fff',
              }}
            >
              <span style={{ color: '#ffcc00' }}>●</span> RA
            </div>
          )}
        </div>
      ) : (
        // Placeholder when no image
        <div 
          style={{ 
            width: '100%', 
            height: '180px',
            background: 'linear-gradient(135deg, #1a1a1f 0%, #252530 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            position: 'relative',
          }}
        >
          <span style={{ fontSize: '32px', opacity: 0.4 }}>♪</span>
          <span style={{ fontSize: '12px', color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {formatGenre(event.genres?.split(',')[0]?.trim() || 'Event')}
          </span>
          
          <button
            onClick={() => router.back()}
            style={{ 
              position: 'absolute', 
              top: 'max(16px, env(safe-area-inset-top))', 
              left: '16px', 
              background: 'rgba(255,255,255,0.1)', 
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              padding: '8px 14px',
              borderRadius: '20px',
              border: 'none',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        </div>
      )}

      {/* Event Content */}
      <main style={{ padding: '24px 20px 120px', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Date & Time */}
        <div style={{ 
          color: '#AB67F7', 
          fontSize: '13px', 
          fontWeight: 600, 
          marginBottom: '8px',
          letterSpacing: '0.5px',
        }}>
          {formatDate(event.date)}
          {event.start_time && ` · ${formatTime(event.start_time)}`}
          {event.end_time && ` - ${formatTime(event.end_time)}`}
        </div>

        {/* Title */}
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 700, 
          marginBottom: '16px',
          lineHeight: 1.2,
          letterSpacing: '-0.5px',
        }}>
          {event.title}
        </h1>

        {/* Venue */}
        {event.venue && (
          <Link
            href={`/venues/${event.venue.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#888',
              fontSize: '15px',
              textDecoration: 'none',
              marginBottom: '16px',
            }}
          >
            <span style={{ color: '#AB67F7' }}>📍</span>
            {event.venue.name}
            <span style={{ color: '#666' }}>→</span>
          </Link>
        )}

        {/* Price badge */}
        <div
          style={{
            display: 'inline-block',
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#888',
            marginBottom: '20px',
          }}
        >
          {formatPrice(event)}
        </div>

        {/* Description */}
        {event.description && (
          <p style={{ 
            fontSize: '15px', 
            color: '#aaa', 
            lineHeight: 1.6,
            marginBottom: '24px',
          }}>
            {event.description}
          </p>
        )}

        {/* Get Tickets CTA */}
        {event.ticket_url && (
          <a
            href={event.ticket_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '16px',
              background: '#AB67F7',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              textDecoration: 'none',
              marginBottom: '16px',
            }}
          >
            Get Tickets
            {event.ticket_source === 'ra' && (
              <span style={{ 
                fontSize: '11px', 
                background: 'rgba(255,204,0,0.2)', 
                color: '#ffcc00',
                padding: '2px 6px',
                borderRadius: '4px',
              }}>
                via RA
              </span>
            )}
          </a>
        )}

        {/* Action buttons row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: saved ? '#AB67F7' : '#fff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {saved ? '♥' : '♡'} Save
          </button>
          
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            📤 Share
          </button>
          
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            🗺️ Directions
          </a>
        </div>

        {/* Venue card with mini map */}
        {event.venue && (
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden',
              marginBottom: '32px',
            }}
          >
            <div style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px', fontWeight: 600, letterSpacing: '1px' }}>
                VENUE
              </div>
              <Link
                href={`/venues/${event.venue.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textDecoration: 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                    {event.venue.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#888' }}>
                    {event.venue.address}
                  </div>
                </div>
                <span style={{ color: '#666', fontSize: '18px' }}>→</span>
              </Link>
            </div>
            
            {/* Static map image */}
            <div style={{ height: '120px', background: '#1a1a1f', position: 'relative' }}>
              <img
                src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+ab67f7(${event.venue.lng},${event.venue.lat})/${event.venue.lng},${event.venue.lat},14,0/400x120@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
                alt="Venue location"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
        )}

        {/* Claim CTA for promoters */}
        <div
          style={{
            background: 'rgba(171,103,247,0.08)',
            borderRadius: '16px',
            border: '1px solid rgba(171,103,247,0.15)',
            padding: '20px',
            marginBottom: '32px',
          }}
        >
          <div style={{ color: '#AB67F7', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
            Are you the organizer?
          </div>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>
            Verify & manage this event to edit details and get a Verified badge.
          </p>
          <Link
            href={`/claim?type=event&id=${event.id}`}
            style={{
              display: 'inline-block',
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid rgba(171,103,247,0.4)',
              borderRadius: '8px',
              color: '#AB67F7',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Verify & Manage →
          </Link>
        </div>

        {/* More events at this venue */}
        {moreEvents.length > 0 && (
          <div>
            <h2 style={{ 
              fontSize: '12px', 
              color: '#666', 
              fontWeight: 600, 
              letterSpacing: '1px',
              marginBottom: '16px',
            }}>
              MORE AT {event.venue?.name?.toUpperCase()}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {moreEvents.map((e) => (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ 
                    color: '#AB67F7', 
                    fontSize: '13px', 
                    fontWeight: 600,
                    minWidth: '45px',
                  }}>
                    {formatTime(e.start_time)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>
                      {e.title}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>
                      {new Date(e.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                  </div>
                  <span style={{ color: '#444' }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
