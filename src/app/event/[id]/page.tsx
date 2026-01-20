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

interface Brand {
  id: string
  name: string
  slug: string
  logo_url: string | null
  is_verified: boolean
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
  brand: Brand | null
}

interface User {
  id: string
  email?: string
}

const formatGenre = (genre: string): string => {
  return genre
    .trim()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const detectTicketSource = (url: string | null): { name: string; shortName: string } => {
  if (!url) return { name: 'Tickets', shortName: 'Tickets' }
  const lower = url.toLowerCase()
  if (lower.includes('ra.co') || lower.includes('residentadvisor')) return { name: 'Resident Advisor', shortName: 'RA' }
  if (lower.includes('fatsoma')) return { name: 'Fatsoma', shortName: 'Fatsoma' }
  if (lower.includes('skiddle')) return { name: 'Skiddle', shortName: 'Skiddle' }
  if (lower.includes('dice.fm')) return { name: 'DICE', shortName: 'DICE' }
  if (lower.includes('eventbrite')) return { name: 'Eventbrite', shortName: 'Eventbrite' }
  if (lower.includes('fixr')) return { name: 'FIXR', shortName: 'FIXR' }
  return { name: 'Tickets', shortName: 'Tickets' }
}

export default function EventPage() {
  const params = useParams()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
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
        .select('*, venue:venues(*), brand:brands(id, name, slug, logo_url, is_verified)')
        .eq('id', params.id)
        .single()
      
      if (data) setEvent(data as unknown as Event)
      setLoading(false)
    }
    loadEvent()
  }, [params.id])

  useEffect(() => {
    if (!event) return
    
    // Check localStorage for saved status
    const savedEvents = localStorage.getItem('so_saved_events')
    if (savedEvents) {
      const ids = JSON.parse(savedEvents) as string[]
      setSaved(ids.includes(event.id))
    }

    // If logged in, also check database
    if (user) {
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
    }
  }, [user, event])

  const handleSave = async () => {
    if (!event) return
    
    // Update localStorage
    const savedEvents = localStorage.getItem('so_saved_events')
    let ids: string[] = savedEvents ? JSON.parse(savedEvents) : []
    
    if (saved) {
      ids = ids.filter(id => id !== event.id)
      if (user) {
        await supabase
          .from('saved_events')
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', event.id)
      }
    } else {
      ids.push(event.id)
      if (user) {
        await supabase
          .from('saved_events')
          .insert({ user_id: user.id, event_id: event.id })
      }
    }
    
    localStorage.setItem('so_saved_events', JSON.stringify(ids))
    setSaved(!saved)
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
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '3px solid rgba(171,103,247,0.2)', 
            borderTopColor: '#ab67f7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#888' }}>Loading event...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!event) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(248,113,113,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '36px',
        }}>
          😕
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Event not found</h1>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px' }}>
          This event may have been removed or the link is incorrect.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '14px 28px',
            background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
            borderRadius: '12px',
            color: 'white',
            textDecoration: 'none',
            fontSize: '15px',
            fontWeight: 600,
          }}
        >
          Explore Events
        </Link>
      </div>
    )
  }

  const mapsUrl = event.venue ? 'https://www.google.com/maps/dir/?api=1&destination=' + event.venue.lat + ',' + event.venue.lng : '#'
  const ticketSource = detectTicketSource(event.event_url)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', paddingBottom: '100px' }}>
      {/* Hero Image */}
      {event.image_url ? (
        <div style={{ width: '100%', aspectRatio: '16/9', maxHeight: '300px', overflow: 'hidden', position: 'relative' }}>
          <img src={event.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0a0a0b 0%, transparent 50%)' }} />
          <Link 
            href="/" 
            style={{ 
              position: 'absolute', 
              top: 'max(16px, env(safe-area-inset-top))', 
              left: '16px', 
              background: 'rgba(0,0,0,0.6)', 
              backdropFilter: 'blur(10px)',
              padding: '10px 16px',
              borderRadius: '10px',
              color: 'white',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
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
          background: 'linear-gradient(135deg, #1a1a2e 0%, #252530 50%, #1e1e28 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          position: 'relative',
        }}>
          <span style={{ fontSize: '48px', opacity: 0.4 }}>🎵</span>
          <span style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {formatGenre(event.genres?.split(',')[0] || 'Event')}
          </span>
          <Link 
            href="/" 
            style={{ 
              position: 'absolute', 
              top: 'max(16px, env(safe-area-inset-top))', 
              left: '16px', 
              background: 'rgba(0,0,0,0.6)', 
              padding: '10px 16px',
              borderRadius: '10px',
              color: 'white',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            ← Back
          </Link>
        </div>
      )}

      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 20px' }}>
        {/* Date & Time */}
        <p style={{ 
          fontSize: '14px', 
          color: '#ab67f7', 
          fontWeight: 700, 
          textTransform: 'uppercase',
          marginBottom: '8px',
        }}>
          {formatDate(event.start_time)} · {formatTime(event.start_time)}
          {event.end_time && ' – ' + formatTime(event.end_time)}
        </p>

        {/* Title */}
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 800, 
          lineHeight: 1.2, 
          marginBottom: '12px',
        }}>
          {event.title}
        </h1>

        {/* Badges */}
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

        {/* Brand / Promoter */}
        {event.brand && (
          <Link 
            href={'/brand/' + event.brand.slug}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              marginBottom: '20px',
              padding: '14px 16px',
              background: 'rgba(171,103,247,0.08)',
              border: '1px solid rgba(171,103,247,0.15)',
              borderRadius: '12px',
              textDecoration: 'none',
            }}
          >
            {event.brand.logo_url ? (
              <img 
                src={event.brand.logo_url} 
                alt="" 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '8px', 
                  objectFit: 'cover' 
                }} 
              />
            ) : (
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}>
                🎵
              </div>
            )}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>Presented by</p>
              <p style={{ 
                fontSize: '15px', 
                color: '#ab67f7', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px' 
              }}>
                {event.brand.name}
                {event.brand.is_verified && (
                  <span style={{
                    width: '14px',
                    height: '14px',
                    background: '#ab67f7',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8px',
                    color: 'white',
                  }}>✓</span>
                )}
              </p>
            </div>
            <span style={{ color: '#666', fontSize: '18px' }}>→</span>
          </Link>
        )}

        {/* Venue */}
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
            <span style={{ fontSize: '15px', color: '#888' }}>📍 {event.venue.name}</span>
            <span style={{ color: '#666' }}>→</span>
          </Link>
        )}

        {/* No Phones Policy */}
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
            <span style={{ fontSize: '16px' }}>📵</span>
            <span style={{ fontSize: '14px', color: '#ffc832' }}>No phones policy — enjoy the moment</span>
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
              fontWeight: 700, 
              color: '#f87171' 
            }}>
              Sold Out
            </span>
          )}
          {isFree(event.price_min, event.price_max) && (
            <span style={{ 
              padding: '8px 14px', 
              background: 'rgba(34,197,94,0.15)', 
              borderRadius: '8px', 
              fontSize: '13px', 
              fontWeight: 700, 
              color: '#22c55e' 
            }}>
              Free Entry
            </span>
          )}
          {event.genres && event.genres.split(',').map((g: string, i: number) => (
            <span key={i} style={{ 
              padding: '8px 14px', 
              background: 'rgba(171,103,247,0.12)', 
              borderRadius: '8px', 
              fontSize: '13px', 
              color: '#ab67f7',
            }}>
              {formatGenre(g)}
            </span>
          ))}
          {event.vibe && event.vibe.split(',').map((v: string, i: number) => (
            <span key={'vibe-' + i} style={{ 
              padding: '8px 14px', 
              background: 'rgba(59,130,246,0.12)', 
              borderRadius: '8px', 
              fontSize: '13px', 
              color: '#3b82f6',
            }}>
              {v.trim().replace(/-/g, ' ')}
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
            <p style={{ fontSize: '15px', color: '#bbb', lineHeight: 1.7 }}>
              {event.description}
            </p>
          </div>
        )}



        {/* Primary CTA - Tickets */}
        {getTicketUrl(event.event_url) && (
         <a 
  href={getTicketUrl(event.event_url)!} 
  target="_blank" 
  rel="noopener noreferrer"
  onClick={() => trackTicketClick(
    event.id,
    event.title,
    event.venue?.name || 'Unknown',
    event.event_url || ''
  )}
  style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '18px',
              background: event.sold_out ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
              borderRadius: '14px',
              fontWeight: 700,
              fontSize: '16px',
              color: event.sold_out ? '#888' : 'white',
              textDecoration: 'none',
              marginBottom: '12px',
              boxShadow: event.sold_out ? 'none' : '0 8px 32px rgba(171,103,247,0.3)',
            }}
          >
            {event.sold_out ? 'View Page (Sold Out)' : isFree(event.price_min, event.price_max) ? 'Get Free Entry' : 'Get Tickets'}
            <span style={{
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
            }}>
              via {ticketSource.shortName}
            </span>
          </a>
        )}

        {/* Secondary Actions */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '14px',
              background: saved ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.06)',
              border: saved ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: saved ? '#f87171' : '#888',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? '#f87171' : 'none'} stroke={saved ? '#f87171' : 'currentColor'} strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {saved ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#888',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            📤 Share
          </button>
        </div>

        {/* Directions */}
        <a 
          href={mapsUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px',
            color: '#888',
            fontSize: '14px',
            textDecoration: 'none',
            marginBottom: '28px',
          }}
        >
          🗺️ Get Directions to {event.venue?.name}
        </a>

        {/* Venue Card */}
        {event.venue && (
          <Link 
            href={'/venue/' + event.venue.id}
            style={{ 
              display: 'block',
              padding: '18px', 
              background: '#141416', 
              borderRadius: '14px',
              textDecoration: 'none',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <p style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Venue
            </p>
            <p style={{ fontSize: '17px', fontWeight: 600, marginBottom: '4px' }}>
              {event.venue.name}
            </p>
            <p style={{ fontSize: '14px', color: '#888' }}>
              {event.venue.address}
            </p>
          </Link>
        )}
      </main>
    </div>
  )
}
