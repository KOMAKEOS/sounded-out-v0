'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import PageLayout from '../../../components/PageLayout'
import { supabase } from '../../../lib/supabase'

type Venue = {
  id: string
  name: string
  address: string
  venue_type: string
  instagram_url: string | null
  website_url: string | null
  phone: string | null
  no_phones: boolean
  is_claimed: boolean
  is_verified: boolean
  lat: number
  lng: number
}

type Event = {
  id: string
  title: string
  start_time: string
  image_url: string | null
  genres: string | null
  price_min: number | null
  price_max: number | null
  sold_out: boolean
  so_pick: boolean
}

export default function VenuePage() {
  const params = useParams()
  const [venue, setVenue] = useState<Venue | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params.id) return
    
    Promise.all([
      supabase.from('venues').select('*').eq('id', params.id).single(),
      supabase
        .from('events')
        .select('id, title, start_time, image_url, genres, price_min, price_max, sold_out, so_pick')
        .eq('venue_id', params.id)
        .eq('status', 'published')
        .gte('start_time', new Date().toISOString().split('T')[0])
        .order('start_time')
    ]).then((responses: any[]) => {
      const venueRes = responses[0]
      const eventsRes = responses[1]
      if (venueRes.data) setVenue(venueRes.data)
      if (eventsRes.data) setEvents(eventsRes.data)
      setLoading(false)
    })
  }, [params.id])

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

  const formatPrice = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Free'
    if (min === 0) return 'Free'
    if (min && max && min !== max) return `£${min}–£${max}`
    return `£${min || max}`
  }

  const mapsUrl = (venue: Venue) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`
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

  if (!venue) {
    return (
      <PageLayout maxWidth="700px">
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Venue not found</h1>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
            This venue may have been removed or the link is incorrect.
          </p>
          <Link
            href="/venues"
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
            Browse venues
          </Link>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout maxWidth="700px">
      {/* Back link */}
      <Link 
        href="/venues" 
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
        ← All venues
      </Link>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700 }}>
            {venue.name}
          </h1>
          {venue.is_verified && (
            <span style={{ 
              width: '24px', 
              height: '24px', 
              background: '#ab67f7', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: 'white',
            }}>✓</span>
          )}
        </div>
        
        {venue.venue_type && (
          <p style={{ fontSize: '15px', color: '#888', textTransform: 'capitalize', marginBottom: '8px' }}>
            {venue.venue_type}
          </p>
        )}
        
        <p style={{ fontSize: '15px', color: '#666' }}>
          {venue.address}
        </p>
      </div>

      {/* No phones */}
      {venue.no_phones && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 16px',
          background: 'rgba(255,200,50,0.08)',
          border: '1px solid rgba(255,200,50,0.15)',
          borderRadius: '12px',
          marginBottom: '24px',
        }}>
          <span style={{ fontSize: '18px' }}>📵</span>
          <span style={{ fontSize: '14px', color: '#ffc832' }}>No phones policy at this venue</span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <a 
          href={mapsUrl(venue)} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            padding: '12px 20px',
            background: '#ab67f7',
            borderRadius: '10px',
            color: 'white',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Directions
        </a>
        
        {venue.instagram_url && (
          <a 
            href={venue.instagram_url} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              padding: '12px 20px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#888',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Instagram
          </a>
        )}
        
        {venue.website_url && (
          <a 
            href={venue.website_url} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              padding: '12px 20px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#888',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Website
          </a>
        )}
      </div>

      {/* Upcoming events */}
      <div>
        <h2 style={{ 
          fontSize: '13px', 
          fontWeight: 600, 
          color: '#888', 
          textTransform: 'uppercase', 
          letterSpacing: '0.5px',
          marginBottom: '16px',
        }}>
          Upcoming events ({events.length})
        </h2>

        {events.length === 0 ? (
          <div style={{ 
            padding: '40px 20px', 
            background: '#141416', 
            borderRadius: '12px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '15px', color: '#666' }}>
              No upcoming events
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {events.map(event => (
              <Link 
                key={event.id}
                href={`/event/${event.id}`}
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '16px',
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
                    <img src={event.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #1e1e24, #252530)',
                    flexShrink: 0,
                  }} />
                )}
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 600, marginBottom: '4px' }}>
                    {formatDate(event.start_time)} · {formatTime(event.start_time)}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    {event.so_pick && (
                      <img src="/so-icon.png" alt="" style={{ height: '12px' }} />
                    )}
                    <h3 style={{ 
                      fontSize: '16px', 
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {event.title}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {event.sold_out && (
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#f87171' }}>Sold out</span>
                    )}
                    <span style={{ fontSize: '12px', color: '#888' }}>
                      {formatPrice(event.price_min, event.price_max)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
