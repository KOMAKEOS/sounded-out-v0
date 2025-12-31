'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

interface Venue {
  id: string
  name: string
  address: string
  venue_type: string | null
  image_url: string | null
  instagram_url: string | null
  website_url: string | null
  description: string | null
  no_phones: boolean
  is_verified: boolean
  lat: number
  lng: number
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
}

interface User {
  id: string
  email?: string
}

export default function VenuePage() {
  const params = useParams()
  const [venue, setVenue] = useState<Venue | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) setUser(data.user)
    }
    loadUser()
  }, [])

  useEffect(() => {
    if (!params.id) return
    
    const loadVenue = async () => {
      const { data: venueData } = await supabase
        .from('venues')
        .select('*')
        .eq('id', params.id)
        .single()
      
      if (venueData) setVenue(venueData as Venue)
      
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, start_time, image_url, genres, price_min, price_max, sold_out, so_pick')
        .eq('venue_id', params.id)
        .eq('status', 'published')
        .gte('start_time', new Date().toISOString().split('T')[0])
        .order('start_time')
        .limit(10)
      
      if (eventsData) setEvents(eventsData as Event[])
      
      setLoading(false)
    }
    loadVenue()
  }, [params.id])

  const handleLike = async () => {
    if (!user) {
      window.location.href = '/login'
      return
    }
    setLiked(!liked)
    setLikeCount(liked ? likeCount - 1 : likeCount + 1)
  }

  const handleShare = async () => {
    if (!venue) return
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({
        title: venue.name,
        text: 'Check out ' + venue.name + ' on Sounded Out',
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
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const formatTime = (date: string): string => {
    return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatPrice = (min: number | null, max: number | null): string => {
    if (!min && !max) return 'Free'
    if (min === 0) return 'Free'
    return '£' + (min || max)
  }

  const getInstagramHandle = (url: string | null): string | null => {
    if (!url) return null
    const match = url.match(/instagram\.com\/([^\/\?]+)/)
    return match ? '@' + match[1] : null
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    )
  }

  if (!venue) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', padding: '60px 20px', textAlign: 'center' }}>
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
    )
  }

  const mapsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + venue.lat + ',' + venue.lng

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', paddingBottom: '60px' }}>
      {venue.image_url ? (
        <div style={{ width: '100%', aspectRatio: '16/9', maxHeight: '300px', overflow: 'hidden', position: 'relative' }}>
          <img src={venue.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0a0a0b 0%, transparent 50%)' }} />
          <Link 
            href="/venues" 
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
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          <span style={{ fontSize: '48px', opacity: 0.3 }}>&#9835;</span>
          <Link 
            href="/venues" 
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
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>{venue.name}</h1>
            {venue.is_verified && (
              <span style={{ 
                width: '22px', 
                height: '22px', 
                background: '#ab67f7', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                color: 'white',
              }}>✓</span>
            )}
          </div>
          
          <p style={{ fontSize: '15px', color: '#888', marginBottom: '12px' }}>{venue.address}</p>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {venue.venue_type && (
              <span style={{ 
                fontSize: '12px', 
                color: '#ab67f7',
                background: 'rgba(171,103,247,0.12)',
                padding: '6px 12px',
                borderRadius: '6px',
                textTransform: 'capitalize',
              }}>
                {venue.venue_type.split(',')[0].trim()}
              </span>
            )}
            {venue.no_phones && (
              <span style={{ 
                fontSize: '12px', 
                color: '#ffc832',
                background: 'rgba(255,200,50,0.1)',
                padding: '6px 12px',
                borderRadius: '6px',
              }}>
                No phones
              </span>
            )}
            {likeCount > 0 && (
              <span style={{ fontSize: '13px', color: '#666' }}>
                {likeCount} like{likeCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={handleLike}
            style={{
              flex: 1,
              padding: '14px',
              background: liked ? 'rgba(171,103,247,0.15)' : 'rgba(255,255,255,0.08)',
              border: liked ? '1px solid rgba(171,103,247,0.3)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: liked ? '#ab67f7' : '#888',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {liked ? '♥ Liked' : '♡ Like'}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
          <a 
            href={mapsUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: '#141416',
              borderRadius: '10px',
              color: 'white',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '14px' }}>Get directions</span>
            <span style={{ color: '#666' }}>→</span>
          </a>
          
          {venue.website_url && (
            <a 
              href={venue.website_url.startsWith('http') ? venue.website_url : 'https://' + venue.website_url} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: '#141416',
                borderRadius: '10px',
                color: 'white',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: '14px' }}>Website</span>
              <span style={{ color: '#666' }}>→</span>
            </a>
          )}
          
          {venue.instagram_url && (
            <a 
              href={venue.instagram_url.startsWith('http') ? venue.instagram_url : 'https://instagram.com/' + venue.instagram_url} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: '#141416',
                borderRadius: '10px',
                color: 'white',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: '14px' }}>Instagram {getInstagramHandle(venue.instagram_url)}</span>
              <span style={{ color: '#666' }}>→</span>
            </a>
          )}
        </div>

        {venue.description && (
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              About
            </h2>
            <p style={{ fontSize: '15px', color: '#ccc', lineHeight: 1.6 }}>
              {venue.description}
            </p>
          </div>
        )}

        {events.length > 0 && (
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
              Upcoming Events
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {events.map((event: Event) => (
                <Link 
                  key={event.id}
                  href={'/event/' + event.id}
                  style={{
                    display: 'flex',
                    gap: '14px',
                    padding: '14px',
                    background: '#141416',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    color: 'white',
                  }}
                >
                  {event.image_url ? (
                    <div style={{
                      width: '60px',
                      height: '60px',
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
                      width: '60px',
                      height: '60px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #1e1e24, #252530)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#333',
                      fontSize: '20px',
                    }}>
                      &#9835;
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {event.sold_out ? (
                        <span style={{ fontSize: '11px', color: '#f87171' }}>Sold out</span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#888' }}>
                          {formatPrice(event.price_min, event.price_max)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {events.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', background: '#141416', borderRadius: '12px' }}>
            <p style={{ fontSize: '14px', color: '#666' }}>No upcoming events</p>
          </div>
        )}
      </main>
    </div>
  )
}
