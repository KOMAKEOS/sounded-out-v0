'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Head from 'next/head'
import { supabase } from '@/lib/supabase'

// ============================================================================
// TYPES
// ============================================================================
interface Venue {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  instagram_url: string | null
  website_url: string | null
  no_phones: boolean
  image_url: string | null
}

interface Brand {
  id: string
  name: string
  slug: string
  logo_url: string | null
  is_verified: boolean
  tagline: string | null
}

interface Event {
  id: string
  venue_id: string
  brand_id: string | null
  title: string
  description: string | null
  start_time: string
  end_time: string | null
  genres: string | null
  vibe: string | null
  event_url: string | null
  image_url: string | null
  price_min: number | null
  price_max: number | null
  price_type: string | null
  free_before_time: string | null
  ticket_source: string | null
  status: string
  so_pick: boolean
  sold_out: boolean
  no_phones: boolean
  is_verified: boolean
  venue: Venue | null
  brand: Brand | null
}

// ============================================================================
// CONSTANTS
// ============================================================================
const GENRE_STYLES: Record<string, { gradient: string; emoji: string }> = {
  techno: { gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', emoji: '🔊' },
  house: { gradient: 'linear-gradient(135deg, #2d132c 0%, #801336 50%, #c72c41 100%)', emoji: '🎧' },
  dnb: { gradient: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 50%, #2d2d44 100%)', emoji: '⚡' },
  disco: { gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)', emoji: '✨' },
  'hip-hop': { gradient: 'linear-gradient(135deg, #1e1e1e 0%, #3d3d3d 50%, #5a5a5a 100%)', emoji: '🔥' },
  default: { gradient: 'linear-gradient(135deg, #1a1a22 0%, #252530 50%, #1e1e28 100%)', emoji: '🎵' },
}

// Ticket source info with logos/colors
const TICKET_SOURCES: Record<string, { name: string; color: string; shortName: string }> = {
  ra: { name: 'Resident Advisor', color: '#000000', shortName: 'RA' },
  fatsoma: { name: 'Fatsoma', color: '#ff4081', shortName: 'Fatsoma' },
  skiddle: { name: 'Skiddle', color: '#00b4d8', shortName: 'Skiddle' },
  dice: { name: 'DICE', color: '#000000', shortName: 'DICE' },
  eventbrite: { name: 'Eventbrite', color: '#f05537', shortName: 'Eventbrite' },
  fixr: { name: 'FIXR', color: '#6c5ce7', shortName: 'FIXR' },
  venue: { name: 'Venue Website', color: '#ab67f7', shortName: 'Venue' },
  other: { name: 'Get Tickets', color: '#ab67f7', shortName: 'Tickets' },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Format genre: tech_house -> Tech House, club_classics -> Club Classics
const formatGenre = (genre: string): string => {
  return genre
    .trim()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const getGenreStyle = (genres: string | null) => {
  if (!genres) return GENRE_STYLES.default
  const firstGenre = genres.split(',')[0]?.trim().toLowerCase() || ''
  for (const key of Object.keys(GENRE_STYLES)) {
    if (firstGenre.includes(key) || key.includes(firstGenre)) {
      return GENRE_STYLES[key]
    }
  }
  return GENRE_STYLES.default
}

// Auto-detect ticket source from URL
const detectTicketSource = (url: string | null): string => {
  if (!url) return 'other'
  const lower = url.toLowerCase()
  if (lower.includes('ra.co') || lower.includes('residentadvisor')) return 'ra'
  if (lower.includes('fatsoma')) return 'fatsoma'
  if (lower.includes('skiddle')) return 'skiddle'
  if (lower.includes('dice.fm') || lower.includes('dice.')) return 'dice'
  if (lower.includes('eventbrite')) return 'eventbrite'
  if (lower.includes('fixr')) return 'fixr'
  return 'other'
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === now.toDateString()) return 'Tonight'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  
  return date.toLocaleDateString('en-GB', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  })
}

const formatTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// Price display based on price_type
const getPriceDisplay = (event: Event): { text: string; type: 'free' | 'freeBefore' | 'paid' | 'tba' } => {
  const { price_type, price_min, price_max, free_before_time } = event
  
  if (price_type === 'free' || (price_min === 0 && !price_max)) {
    return { text: 'FREE', type: 'free' }
  }
  
  if (price_type === 'free_before' && free_before_time) {
    return { text: `Free before ${free_before_time}`, type: 'freeBefore' }
  }
  
  if (price_type === 'paid' || (price_min && price_min > 0)) {
    if (price_min && price_max && price_min !== price_max) {
      return { text: `£${price_min}–£${price_max}`, type: 'paid' }
    }
    return { text: `£${price_min || price_max}`, type: 'paid' }
  }
  
  // Default: unknown/TBA
  return { text: 'Price TBA', type: 'tba' }
}

// Clean and validate ticket URL
const getTicketUrl = (url: string | null): string | null => {
  if (!url) return null
  let cleaned = url.trim()
  
  // Add protocol if missing
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned
  }
  
  // Fix URL encoded spaces
  cleaned = cleaned.replace(/%20/g, '-').replace(/\s+/g, '-')
  
  try {
    return new URL(cleaned).toString()
  } catch {
    return null
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function EventPage() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [relatedEvents, setRelatedEvents] = useState<Event[]>([])
  const [showFullDescription, setShowFullDescription] = useState(false)

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) setUser({ id: data.user.id })
    }
    loadUser()
  }, [])

  // Load event
  useEffect(() => {
    if (!params.id) return

    const loadEvent = async () => {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('events')
        .select(`
          *,
          venue:venues(*),
          brand:brands(id, name, slug, logo_url, is_verified, tagline)
        `)
        .eq('id', params.id)
        .single()

      if (fetchError) {
        console.error('Event fetch error:', fetchError)
        setError('Event not found')
        setLoading(false)
        return
      }

      if (data) {
        setEvent(data as Event)
        
        // Track view
        await supabase.from('analytics_events').insert({
          event_type: 'event_view',
          event_id: data.id,
          venue_id: data.venue_id,
          brand_id: data.brand_id,
        }).then(() => {})
        
        // Load related events at same venue
        if (data.venue_id) {
          const { data: related } = await supabase
            .from('events')
            .select('*, venue:venues(name)')
            .eq('venue_id', data.venue_id)
            .neq('id', data.id)
            .eq('status', 'published')
            .gte('start_time', new Date().toISOString())
            .order('start_time')
            .limit(4)
          
          if (related) setRelatedEvents(related as Event[])
        }
      }

      setLoading(false)
    }

    loadEvent()
  }, [params.id])

  // Check if saved
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

  // Handlers
  const handleSave = async () => {
    if (!user) {
      router.push('/login?redirect=/event/' + params.id)
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

  const handleShare = async () => {
    if (!event) return
    
    const shareUrl = `https://soundedout.com/event/${event.id}`
    const shareText = `Check out ${event.title}${event.venue ? ` at ${event.venue.name}` : ''}! 🎵`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: shareUrl,
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
      alert('Link copied to clipboard!')
    }
  }

  const handleDirections = () => {
    if (!event?.venue) return
    const url = `https://www.google.com/maps/dir/?api=1&destination=${event.venue.lat},${event.venue.lng}`
    window.open(url, '_blank')
  }

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0b',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(171,103,247,0.3)',
            borderTopColor: '#ab67f7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#888' }}>Loading event...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Error state
  if (error || !event) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0b',
        color: 'white',
        padding: '60px 20px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(248,113,113,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '36px',
          }}>
            😢
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
            Event not found
          </h1>
          <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px' }}>
            This event may have been removed or the link is incorrect.
          </p>
          <Link
            href="/"
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
            Browse Events
          </Link>
        </div>
      </div>
    )
  }

  // Get computed values
  const ticketSource = event.ticket_source || detectTicketSource(event.event_url)
  const ticketSourceInfo = TICKET_SOURCES[ticketSource] || TICKET_SOURCES.other
  const ticketUrl = getTicketUrl(event.event_url)
  const genreStyle = getGenreStyle(event.genres)
  const priceDisplay = getPriceDisplay(event)

  return (
    <>
      {/* SEO Meta Tags */}
      <head>
        <title>{event.title} | Sounded Out</title>
        <meta name="description" content={`${event.title} at ${event.venue?.name} - ${formatDate(event.start_time)}`} />
        <meta property="og:title" content={event.title} />
        <meta property="og:description" content={`${formatDate(event.start_time)} at ${event.venue?.name}`} />
        {event.image_url && <meta property="og:image" content={event.image_url} />}
        <meta property="og:url" content={`https://soundedout.com/event/${event.id}`} />
      </head>

      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white' }}>
        {/* Hero Image */}
        {event.image_url ? (
          <div style={{
            width: '100%',
            aspectRatio: '16/9',
            maxHeight: '400px',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <img 
              src={event.image_url} 
              alt={event.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, #0a0a0b 0%, transparent 60%)',
            }} />
            {/* Back button */}
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
            {/* Ticket source badge on image */}
            {ticketUrl && (
              <div style={{
                position: 'absolute',
                top: 'max(16px, env(safe-area-inset-top))',
                right: '16px',
                background: ticketSourceInfo.color,
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                color: 'white',
              }}>
                🎫 {ticketSourceInfo.shortName}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            width: '100%',
            aspectRatio: '16/9',
            maxHeight: '300px',
            background: genreStyle.gradient,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            position: 'relative',
          }}>
            <span style={{ fontSize: '56px', opacity: 0.6 }}>{genreStyle.emoji}</span>
            <span style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '2px',
            }}>
              {formatGenre(event.genres?.split(',')[0] || 'Event')}
            </span>
            <Link
              href="/"
              style={{
                position: 'absolute',
                top: 'max(16px, env(safe-area-inset-top))',
                left: '16px',
                background: 'rgba(0,0,0,0.5)',
                padding: '10px 16px',
                borderRadius: '10px',
                color: 'white',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              ← Back
            </Link>
          </div>
        )}

        {/* Content */}
        <main style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 20px 140px' }}>
          {/* Date & Time - Prominent */}
          <p style={{
            fontSize: '14px',
            color: '#ab67f7',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '10px',
          }}>
            {formatDate(event.start_time)} · {formatTime(event.start_time)}
            {event.end_time && ` – ${formatTime(event.end_time)}`}
          </p>

          {/* Title */}
          <h1 style={{
            fontSize: '32px',
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: '16px',
            letterSpacing: '-0.5px',
          }}>
            {event.title}
          </h1>

          {/* ============================================ */}
          {/* BRAND ATTRIBUTION - THE KEY FEATURE */}
          {/* ============================================ */}
          {event.brand && (
            <Link
              href={`/brand/${event.brand.slug}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
                padding: '14px 18px',
                background: 'rgba(171,103,247,0.08)',
                border: '1px solid rgba(171,103,247,0.2)',
                borderRadius: '14px',
                textDecoration: 'none',
              }}
            >
              {event.brand.logo_url ? (
                <img
                  src={event.brand.logo_url}
                  alt=""
                  style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}>
                  🎵
                </div>
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '11px', color: '#888', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Presented by
                </p>
                <p style={{
                  fontSize: '16px',
                  color: 'white',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  {event.brand.name}
                  {event.brand.is_verified && (
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
                  )}
                </p>
              </div>
              <span style={{ color: '#666', fontSize: '20px' }}>→</span>
            </Link>
          )}

          {/* Badges Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {event.so_pick && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                padding: '6px 12px',
                background: 'rgba(171,103,247,0.1)',
                borderRadius: '8px',
              }}>
                <img src="/so-icon.png" alt="" style={{ height: '14px' }} />
                <span style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 600 }}>SO Pick</span>
              </div>
            )}
            {event.is_verified && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'rgba(34,197,94,0.15)',
                borderRadius: '8px',
              }}>
                <span style={{
                  width: '16px',
                  height: '16px',
                  background: '#22c55e',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  color: 'white',
                }}>✓</span>
                <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>Verified</span>
              </div>
            )}
          </div>

          {/* Venue Link */}
          {event.venue && (
            <Link
              href={`/venue/${event.venue.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
                textDecoration: 'none',
                padding: '12px 0',
              }}
            >
              <span style={{ fontSize: '18px' }}>📍</span>
              <span style={{ fontSize: '16px', color: '#ccc', fontWeight: 500 }}>{event.venue.name}</span>
              <span style={{ color: '#666' }}>→</span>
            </Link>
          )}

          {/* No Phones Policy */}
          {(event.no_phones || event.venue?.no_phones) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 18px',
              background: 'rgba(255,200,50,0.1)',
              border: '1px solid rgba(255,200,50,0.2)',
              borderRadius: '14px',
              marginBottom: '20px',
            }}>
              <span style={{ fontSize: '20px' }}>📵</span>
              <div>
                <span style={{ fontSize: '14px', color: '#ffc832', fontWeight: 600 }}>No cameras / phones policy</span>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>Enjoy the moment, stay present</p>
              </div>
            </div>
          )}

          {/* Tags - Genres & Vibes */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {/* Status Tags */}
            {event.sold_out && (
              <span style={{
                padding: '10px 16px',
                background: 'rgba(248,113,113,0.15)',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#f87171',
              }}>
                SOLD OUT
              </span>
            )}
            
            {/* Price Tag */}
            <span style={{
              padding: '10px 16px',
              background: priceDisplay.type === 'free' ? 'rgba(34,197,94,0.15)' 
                : priceDisplay.type === 'freeBefore' ? 'rgba(34,197,94,0.1)'
                : priceDisplay.type === 'paid' ? 'rgba(255,255,255,0.1)'
                : 'rgba(255,255,255,0.06)',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: priceDisplay.type === 'tba' ? 500 : 700,
              color: priceDisplay.type === 'free' || priceDisplay.type === 'freeBefore' ? '#22c55e' 
                : priceDisplay.type === 'tba' ? '#888' 
                : 'white',
            }}>
              {priceDisplay.text}
            </span>
            
            {/* Genre Tags */}
            {event.genres?.split(',').map((genre, i) => (
              <span
                key={i}
                style={{
                  padding: '10px 16px',
                  background: 'rgba(171,103,247,0.12)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  color: '#ab67f7',
                }}
              >
                {formatGenre(genre)}
              </span>
            ))}
            
            {/* Vibe Tags */}
            {event.vibe?.split(',').map((vibe, i) => (
              <span
                key={`vibe-${i}`}
                style={{
                  padding: '10px 16px',
                  background: 'rgba(59,130,246,0.12)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  color: '#3b82f6',
                }}
              >
                {vibe.trim().replace(/-/g, ' ')}
              </span>
            ))}
          </div>

          {/* Description */}
          {event.description && (
            <div style={{ marginBottom: '24px' }}>
              <p style={{
                fontSize: '15px',
                color: '#aaa',
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
              }}>
                {showFullDescription || event.description.length < 300 
                  ? event.description 
                  : event.description.slice(0, 300) + '...'}
              </p>
              {event.description.length >= 300 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#ab67f7',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {showFullDescription ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* PRIMARY CTA - GET TICKETS */}
          {/* ============================================ */}
          {ticketUrl && (
            <a
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                supabase.from('analytics_events').insert({
                  event_type: 'ticket_click',
                  event_id: event.id,
                  venue_id: event.venue_id,
                  brand_id: event.brand_id,
                }).then(() => {})
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%',
                padding: '20px',
                background: event.sold_out 
                  ? 'rgba(255,255,255,0.1)' 
                  : 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                borderRadius: '16px',
                color: event.sold_out ? '#888' : 'white',
                textDecoration: 'none',
                fontSize: '17px',
                fontWeight: 700,
                marginBottom: '14px',
                boxShadow: event.sold_out ? 'none' : '0 8px 32px rgba(171,103,247,0.3)',
              }}
            >
              {event.sold_out ? 'View Page (Sold Out)' : (
                <>
                  {priceDisplay.type === 'free' ? 'Get Free Entry' : 'Get Tickets'}
                  <span style={{
                    padding: '6px 12px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    via {ticketSourceInfo.shortName}
                  </span>
                </>
              )}
            </a>
          )}

          {/* Secondary Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={handleSave}
              style={{
                padding: '16px',
                background: saved ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.06)',
                border: saved ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px',
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
              {saved ? '❤️ Saved' : '🤍 Save'}
            </button>
            <button
              onClick={handleShare}
              style={{
                padding: '16px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px',
                color: '#888',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📤 Share
            </button>
            <button
              onClick={handleDirections}
              style={{
                padding: '16px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px',
                color: '#888',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🗺️ Directions
            </button>
          </div>

          {/* Venue Card with Mini Map */}
          {event.venue && (
            <div style={{
              padding: '20px',
              background: '#141416',
              borderRadius: '16px',
              marginBottom: '24px',
            }}>
              <p style={{
                fontSize: '11px',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '12px',
              }}>
                Venue
              </p>
              <Link
                href={`/venue/${event.venue.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  textDecoration: 'none',
                  marginBottom: '14px',
                }}
              >
                {event.venue.image_url ? (
                  <img
                    src={event.venue.image_url}
                    alt=""
                    style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: 'rgba(171,103,247,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                  }}>
                    📍
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '17px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
                    {event.venue.name}
                  </p>
                  <p style={{ fontSize: '13px', color: '#888' }}>
                    {event.venue.address}
                  </p>
                </div>
                <span style={{ color: '#666', fontSize: '20px' }}>→</span>
              </Link>
              
              {/* Mini Map */}
              <div 
                onClick={handleDirections}
                style={{ 
                  width: '100%', 
                  height: '120px', 
                  borderRadius: '12px', 
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: '#1e1e24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img 
                  src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+ab67f7(${event.venue.lng},${event.venue.lat})/${event.venue.lng},${event.venue.lat},14,0/400x120@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
                  alt="Map"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>
          )}

          {/* Claim CTA */}
          <div style={{
            padding: '20px',
            background: 'rgba(171,103,247,0.08)',
            border: '1px solid rgba(171,103,247,0.15)',
            borderRadius: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ fontSize: '15px', color: '#ab67f7', fontWeight: 700, marginBottom: '6px' }}>
              Are you the organizer?
            </p>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '14px', lineHeight: 1.5 }}>
              Verify & manage this event to edit details and get a Verified badge.
            </p>
            <button
              onClick={() => setShowClaimModal(true)}
              style={{
                padding: '14px 24px',
                background: 'transparent',
                border: '1px solid rgba(171,103,247,0.4)',
                borderRadius: '12px',
                color: '#ab67f7',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Verify & Manage →
            </button>
          </div>

          {/* Related Events */}
          {relatedEvents.length > 0 && (
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '16px',
              }}>
                More at {event.venue?.name}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {relatedEvents.map((related) => (
                  <Link
                    key={related.id}
                    href={`/event/${related.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '16px',
                      background: '#141416',
                      borderRadius: '14px',
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{
                      minWidth: '50px',
                      textAlign: 'center',
                    }}>
                      <p style={{ fontSize: '14px', color: '#ab67f7', fontWeight: 700 }}>
                        {formatTime(related.start_time)}
                      </p>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: 'white',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '2px',
                      }}>
                        {related.title}
                      </p>
                      <p style={{ fontSize: '12px', color: '#888' }}>
                        {formatDate(related.start_time)}
                      </p>
                    </div>
                    <span style={{ color: '#666' }}>→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Claim Modal */}
        {showClaimModal && (
          <ClaimModal
            event={event}
            onClose={() => setShowClaimModal(false)}
          />
        )}
      </div>
    </>
  )
}

// ============================================================================
// CLAIM MODAL COMPONENT
// ============================================================================
function ClaimModal({ event, onClose }: { event: Event; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'promoter', proofUrl: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const { error: insertError } = await supabase
        .from('claim_requests')
        .insert({
          claim_type: 'event',
          event_id: event.id,
          venue_id: event.venue_id,
          brand_id: event.brand_id,
          claimer_name: form.name,
          claimer_email: form.email,
          claimer_role: form.role,
          proof_url: form.proofUrl || null,
          status: 'pending',
        })

      if (insertError) throw insertError
      setSubmitted(true)
    } catch (err: any) {
      console.error('Claim submit error:', err)
      setError(err.message || 'Something went wrong')
    }

    setSubmitting(false)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#1a1a1f',
          borderRadius: '20px',
          padding: '24px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Verify & Manage</h3>
          <button
            onClick={onClose}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.1)',
              color: '#888',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(34,197,94,0.15)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '28px',
            }}>
              ✓
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e', marginBottom: '8px' }}>
              Request Submitted!
            </h4>
            <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, marginBottom: '8px' }}>
              We'll review your request within 24-48 hours.
            </p>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
              DM <strong style={{ color: '#ab67f7' }}>@SoundedOut</strong> on Instagram with your email for faster verification.
            </p>
            <button
              onClick={onClose}
              style={{
                padding: '14px 28px',
                background: '#ab67f7',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{
              padding: '14px',
              background: 'rgba(171,103,247,0.1)',
              borderRadius: '12px',
              marginBottom: '20px',
            }}>
              <p style={{ fontSize: '14px', color: '#ab67f7', fontWeight: 600, marginBottom: '4px' }}>
                {event.title}
              </p>
              <p style={{ fontSize: '12px', color: '#888' }}>
                Once verified, you can edit event details and receive a Verified badge.
              </p>
            </div>

            {error && (
              <div style={{
                padding: '12px',
                background: 'rgba(248,113,113,0.15)',
                borderRadius: '10px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#f87171',
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                Your Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#141416',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                Your Email *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#141416',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                Your Role *
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#141416',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '14px',
                }}
              >
                <option value="promoter">Promoter</option>
                <option value="owner">Venue Owner</option>
                <option value="manager">Manager</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                Proof Link (Instagram, website, etc.)
              </label>
              <input
                type="url"
                value={form.proofUrl}
                onChange={(e) => setForm({ ...form, proofUrl: e.target.value })}
                placeholder="https://instagram.com/..."
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#141416',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '14px',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '16px',
                background: submitting ? '#666' : 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '15px',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
