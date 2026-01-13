'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

interface Brand {
  id: string
  name: string
  slug: string
  tagline: string | null
  bio: string | null
  description: string | null
  logo_url: string | null
  cover_image_url: string | null
  profile_image_url: string | null
  website_url: string | null
  instagram_url: string | null
  spotify_url: string | null
  soundcloud_url: string | null
  email: string | null
  location: string | null
  genres: string[] | null
  founded_year: number | null
  follower_count: number
  event_count: number
  is_verified: boolean
  is_featured: boolean
  owner_user_id: string | null
  created_at: string
}

interface Event {
  id: string
  title: string
  start_time: string
  end_time: string | null
  image_url: string | null
  event_url: string | null
  genres: string | null
  price_min: number | null
  price_max: number | null
  sold_out: boolean
  so_pick: boolean
  status: string
  venue: {
    id: string
    name: string
  } | null
}

interface User {
  id: string
  email?: string
}

const formatGenre = (genre: string): string => {
  return genre.trim().replace(/_/g, ' ')
}

export default function BrandPage() {
  const params = useParams()
  const [brand, setBrand] = useState<Brand | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [pastEvents, setPastEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUser(data.user)
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    if (!params.slug) return

    const loadBrand = async () => {
      const { data: brandData } = await supabase
        .from('brands')
        .select('*')
        .eq('slug', params.slug)
        .single()

      if (brandData) {
        setBrand(brandData as Brand)

        if (user && brandData.owner_user_id === user.id) {
          setIsOwner(true)
        }

        const now = new Date().toISOString()
        
        const { data: upcomingData } = await supabase
          .from('events')
          .select('*, venue:venues(id, name)')
          .eq('brand_id', brandData.id)
          .eq('status', 'published')
          .gte('start_time', now)
          .order('start_time', { ascending: true })
          .limit(20)

        if (upcomingData) {
          setEvents(upcomingData as unknown as Event[])
        }

        const { data: pastData } = await supabase
          .from('events')
          .select('*, venue:venues(id, name)')
          .eq('brand_id', brandData.id)
          .eq('status', 'published')
          .lt('start_time', now)
          .order('start_time', { ascending: false })
          .limit(20)

        if (pastData) {
          setPastEvents(pastData as unknown as Event[])
        }
      }

      setLoading(false)
    }

    loadBrand()
  }, [params.slug, user])

  useEffect(() => {
    if (!user || !brand) return

    const checkFollowing = async () => {
      const { data } = await supabase
        .from('brand_followers')
        .select('id')
        .eq('user_id', user.id)
        .eq('brand_id', brand.id)
        .single()

      if (data) {
        setIsFollowing(true)
      }
    }

    checkFollowing()
  }, [user, brand])

  const handleFollow = async () => {
    if (!user) {
      window.location.href = '/login'
      return
    }

    if (!brand) return

    if (isFollowing) {
      await supabase
        .from('brand_followers')
        .delete()
        .eq('user_id', user.id)
        .eq('brand_id', brand.id)

      setIsFollowing(false)
      setBrand(prev => prev ? { ...prev, follower_count: prev.follower_count - 1 } : null)
    } else {
      await supabase
        .from('brand_followers')
        .insert({ user_id: user.id, brand_id: brand.id })

      setIsFollowing(true)
      setBrand(prev => prev ? { ...prev, follower_count: prev.follower_count + 1 } : null)
    }
  }

  const handleShare = async () => {
    if (!brand) return
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({
        title: brand.name,
        text: brand.tagline || 'Check out ' + brand.name + ' on Sounded Out',
        url: url,
      })
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copied!')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888' }}>Loading...</p>
      </div>
    )
  }

  if (!brand) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', padding: '60px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Brand not found</h1>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
          This promoter profile does not exist or has been removed.
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

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white' }}>
      {/* Cover Image */}
      <div style={{ 
        width: '100%', 
        height: '200px', 
        position: 'relative',
        background: brand.cover_image_url 
          ? 'url(' + brand.cover_image_url + ') center/cover'
          : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0a0a0b 0%, rgba(0,0,0,0.3) 50%, transparent 100%)' }} />
        <Link 
          href="/events" 
          style={{ 
            position: 'absolute', 
            top: '16px', 
            left: '16px', 
            background: 'rgba(0,0,0,0.5)', 
            backdropFilter: 'blur(10px)',
            padding: '8px 12px',
            borderRadius: '8px',
            color: 'white',
            textDecoration: 'none',
            fontSize: '13px',
            zIndex: 10,
          }}
        >
          ← Back
        </Link>
      </div>

      {/* Profile Section */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ marginTop: '-50px', position: 'relative', zIndex: 20 }}>
          {/* Logo and Actions Row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '20px' }}>
            {brand.logo_url ? (
              <img 
                src={brand.logo_url} 
                alt={brand.name}
                style={{ 
                  width: '100px', 
                  height: '100px', 
                  borderRadius: '16px', 
                  objectFit: 'cover',
                  border: '4px solid #0a0a0b',
                  background: '#1a1a1f',
                }} 
              />
            ) : (
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #ab67f7 0%, #8b5cf6 100%)',
                border: '4px solid #0a0a0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
              }}>
                🎵
              </div>
            )}

            <div style={{ flex: 1, display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingBottom: '8px' }}>
              <button
                onClick={handleFollow}
                style={{
                  padding: '10px 20px',
                  background: isFollowing ? 'rgba(171,103,247,0.15)' : '#ab67f7',
                  border: isFollowing ? '1px solid rgba(171,103,247,0.3)' : 'none',
                  borderRadius: '10px',
                  color: isFollowing ? '#ab67f7' : 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isFollowing ? '✓ Following' : 'Follow'}
              </button>
              <button
                onClick={handleShare}
                style={{
                  padding: '10px 16px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#888',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Share
              </button>
            </div>
          </div>

          {/* Name and Badge */}
          <div style={{ marginBottom: '8px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
              {brand.name}
              {brand.is_verified && (
                <span style={{
                  width: '24px',
                  height: '24px',
                  background: '#ab67f7',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                }}>✓</span>
              )}
            </h1>
          </div>

          {/* Tagline */}
          {brand.tagline && (
            <p style={{ fontSize: '16px', color: '#888', marginBottom: '16px' }}>
              {brand.tagline}
            </p>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '20px', fontWeight: 700 }}>{brand.event_count || events.length + pastEvents.length}</span>
              <span style={{ fontSize: '13px', color: '#888', marginLeft: '6px' }}>events</span>
            </div>
            <div>
              <span style={{ fontSize: '20px', fontWeight: 700 }}>{brand.follower_count || 0}</span>
              <span style={{ fontSize: '13px', color: '#888', marginLeft: '6px' }}>followers</span>
            </div>
            {brand.location && (
              <div>
                <span style={{ fontSize: '13px', color: '#888' }}>📍 {brand.location}</span>
              </div>
            )}
          </div>

          {/* Genres */}
          {brand.genres && brand.genres.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {brand.genres.map((genre: string, i: number) => (
                <span key={i} style={{
                  padding: '6px 12px',
                  background: 'rgba(171,103,247,0.12)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#ab67f7',
                  textTransform: 'capitalize',
                }}>
                  {formatGenre(genre)}
                </span>
              ))}
            </div>
          )}

          {/* Bio */}
          {(brand.bio || brand.description) && (
            <p style={{ fontSize: '14px', color: '#aaa', lineHeight: 1.7, marginBottom: '20px', maxWidth: '600px' }}>
              {brand.bio || brand.description}
            </p>
          )}

          {/* Social Links */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
            {brand.instagram_url && (
              <a
                href={brand.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 16px',
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  color: '#888',
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                📸 Instagram
              </a>
            )}
            {brand.website_url && (
              <a
                href={brand.website_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 16px',
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  color: '#888',
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                🌐 Website
              </a>
            )}
            {brand.spotify_url && (
              <a
                href={brand.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 16px',
                  background: 'rgba(30,215,96,0.1)',
                  borderRadius: '10px',
                  color: '#1ed760',
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                🎵 Spotify
              </a>
            )}
            {brand.soundcloud_url && (
              <a
                href={brand.soundcloud_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 16px',
                  background: 'rgba(255,85,0,0.1)',
                  borderRadius: '10px',
                  color: '#ff5500',
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                ☁️ SoundCloud
              </a>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('upcoming')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'upcoming' ? '2px solid #ab67f7' : '2px solid transparent',
              color: activeTab === 'upcoming' ? '#ab67f7' : '#888',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Upcoming ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'past' ? '2px solid #ab67f7' : '2px solid transparent',
              color: activeTab === 'past' ? '#ab67f7' : '#888',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Past ({pastEvents.length})
          </button>
        </div>

        {/* Events List */}
        <div style={{ paddingBottom: '100px' }}>
          {activeTab === 'upcoming' && (
            <>
              {events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <p style={{ fontSize: '48px', marginBottom: '16px' }}>🗓️</p>
                  <p style={{ fontSize: '16px', color: '#888', marginBottom: '8px' }}>No upcoming events</p>
                  <p style={{ fontSize: '14px', color: '#555' }}>Check back soon!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {events.map((event: Event) => (
                    <Link
                      key={event.id}
                      href={'/event/' + event.id}
                      style={{
                        display: 'flex',
                        gap: '16px',
                        padding: '16px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        color: 'white',
                      }}
                    >
                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '10px',
                        background: event.image_url
                          ? 'url(' + event.image_url + ') center/cover'
                          : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {!event.image_url && <span style={{ opacity: 0.4 }}>🎵</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 600 }}>
                            {new Date(event.start_time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {new Date(event.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {event.sold_out && (
                            <span style={{ padding: '2px 6px', background: 'rgba(248,113,113,0.15)', borderRadius: '4px', fontSize: '10px', fontWeight: 600, color: '#f87171' }}>
                              SOLD OUT
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {event.title}
                        </h3>
                        <p style={{ fontSize: '13px', color: '#888' }}>
                          {event.venue?.name || 'TBA'}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: event.price_min === 0 ? '#22c55e' : '#fff' }}>
                          {event.price_min === 0 || (!event.price_min && !event.price_max) ? 'Free' : '£' + event.price_min}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'past' && (
            <>
              {pastEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <p style={{ fontSize: '48px', marginBottom: '16px' }}>📜</p>
                  <p style={{ fontSize: '16px', color: '#888' }}>No past events yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {pastEvents.map((event: Event) => (
                    <Link
                      key={event.id}
                      href={'/event/' + event.id}
                      style={{
                        display: 'flex',
                        gap: '16px',
                        padding: '16px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        color: 'white',
                        opacity: 0.7,
                      }}
                    >
                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '10px',
                        background: event.image_url
                          ? 'url(' + event.image_url + ') center/cover'
                          : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {!event.image_url && <span style={{ opacity: 0.4 }}>🎵</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>
                            {new Date(event.start_time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {event.title}
                        </h3>
                        <p style={{ fontSize: '13px', color: '#888' }}>
                          {event.venue?.name || 'TBA'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
