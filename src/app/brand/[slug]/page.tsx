'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ============================================================================
// TYPES
// ============================================================================
type Brand = {
  id: string
  slug: string
  name: string
  tagline: string | null
  bio: string | null
  cover_image_url: string | null
  profile_image_url: string | null
  genres: string[]
  instagram_url: string | null
  soundcloud_url: string | null
  spotify_url: string | null
  website_url: string | null
  location: string
  is_verified: boolean
  follower_count: number
  event_count: number
  founded_year: number | null
}

type Event = {
  id: string
  title: string
  start_time: string
  end_time: string | null
  image_url: string | null
  price_min: number | null
  price_max: number | null
  event_url: string | null
  sold_out: boolean
  venue: {
    id: string
    name: string
  } | null
  interested_count?: number
  going_count?: number
}

type Person = {
  id: string
  slug: string
  name: string
  role: string | null
  profile_image_url: string | null
  is_verified: boolean
}

type BrandMember = {
  id: string
  role: string | null
  person: Person
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const getAnonId = (): string => {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('so_anon_id')
  if (!id) {
    id = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2)
    localStorage.setItem('so_anon_id', id)
  }
  return id
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === now.toDateString()) return 'Tonight'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  
  return date.toLocaleDateString('en-GB', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  })
}

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const formatPrice = (min: number | null, max: number | null) => {
  if (min === 0 || (!min && !max)) return 'Free'
  const fmt = (n: number) => n % 1 === 0 ? `£${n}` : `£${n.toFixed(2)}`
  if (min && max && min !== max) return `${fmt(min)}–${fmt(max)}`
  return fmt(min || max || 0)
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function BrandProfilePage() {
  const params = useParams()
const slug = params.id as string  // Still treating it as a slug, just different param name
  
  const [brand, setBrand] = useState<Brand | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [pastEvents, setPastEvents] = useState<Event[]>([])
  const [members, setMembers] = useState<BrandMember[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'about'>('upcoming')
  const [scrolled, setScrolled] = useState(false)
  
  // Load brand data
  useEffect(() => {
    const loadBrand = async () => {
      // Fetch brand
      const { data: brandData } = await supabase
        .from('brands')
        .select('*')
        .eq('slug', slug)
        .single()
      
      if (!brandData) {
        setLoading(false)
        return
      }
      
      setBrand(brandData)
      
      // Fetch events
      const now = new Date().toISOString()
      
      const { data: upcoming } = await supabase
        .from('events')
        .select('*, venue:venues(id, name)')
        .eq('brand_id', brandData.id)
        .eq('status', 'published')
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(10)
      
      const { data: past } = await supabase
        .from('events')
        .select('*, venue:venues(id, name)')
        .eq('brand_id', brandData.id)
        .eq('status', 'published')
        .lt('start_time', now)
        .order('start_time', { ascending: false })
        .limit(20)
      
      setUpcomingEvents(upcoming || [])
      setPastEvents(past || [])
      
      // Fetch team members
      const { data: memberData } = await supabase
        .from('brand_members')
        .select('*, person:people(*)')
        .eq('brand_id', brandData.id)
        .order('display_order', { ascending: true })
      
      setMembers(memberData || [])
      
      // Check if following
      const userId = getAnonId()
      if (userId) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('user_id', userId)
          .eq('brand_id', brandData.id)
          .single()
        
        setIsFollowing(!!followData)
      }
      
      setLoading(false)
    }
    
    loadBrand()
  }, [slug])
  
  // Scroll handler for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 280)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  // Follow/unfollow handler
  const toggleFollow = useCallback(async () => {
    if (!brand || followLoading) return
    
    setFollowLoading(true)
    const userId = getAnonId()
    
    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('user_id', userId)
        .eq('brand_id', brand.id)
      
      setIsFollowing(false)
      setBrand(prev => prev ? { ...prev, follower_count: prev.follower_count - 1 } : null)
    } else {
      await supabase
        .from('follows')
        .insert({ user_id: userId, brand_id: brand.id })
      
      setIsFollowing(true)
      setBrand(prev => prev ? { ...prev, follower_count: prev.follower_count + 1 } : null)
    }
    
    setFollowLoading(false)
  }, [brand, isFollowing, followLoading])
  
  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(171,103,247,0.2)',
          borderTopColor: '#ab67f7',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      </div>
    )
  }
  
  // Not found state
  if (!brand) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>404</h1>
        <p style={{ color: '#666', marginBottom: '32px' }}>Brand not found</p>
        <Link href="/" style={{
          padding: '12px 24px',
          background: '#ab67f7',
          borderRadius: '8px',
          color: 'white',
          textDecoration: 'none',
          fontWeight: 600,
        }}>
          Back to Map
        </Link>
      </div>
    )
  }
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      
      {/* Sticky Header (appears on scroll) */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: scrolled ? 'rgba(0,0,0,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.1)' : 'none',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        transition: 'all 300ms ease',
        opacity: scrolled ? 1 : 0,
        pointerEvents: scrolled ? 'auto' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ color: '#888', fontSize: '24px', textDecoration: 'none' }}>←</Link>
          <span style={{ fontWeight: 700, fontSize: '16px' }}>{brand.name}</span>
          {brand.is_verified && (
            <span style={{
              width: '18px',
              height: '18px',
              background: '#ab67f7',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
            }}>✓</span>
          )}
        </div>
        <button
          onClick={toggleFollow}
          disabled={followLoading}
          style={{
            padding: '8px 20px',
            background: isFollowing ? 'transparent' : '#ab67f7',
            border: isFollowing ? '1px solid #ab67f7' : 'none',
            borderRadius: '20px',
            color: isFollowing ? '#ab67f7' : 'white',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 200ms ease',
          }}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      </header>
      
      {/* Hero Section with Cover Image */}
      <div style={{
        position: 'relative',
        height: '340px',
        overflow: 'hidden',
      }}>
        {/* Cover Image or Gradient */}
        {brand.cover_image_url ? (
          <img
            src={brand.cover_image_url}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
          }} />
        )}
        
        {/* Gradient Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 60%, #000 100%)',
        }} />
        
        {/* Back Button */}
        <Link href="/" style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          width: '40px',
          height: '40px',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          textDecoration: 'none',
          fontSize: '20px',
          zIndex: 10,
        }}>
          ←
        </Link>
        
        {/* Share Button */}
        <button
          onClick={async () => {
            const url = window.location.href
            if (navigator.share) {
              await navigator.share({ title: brand.name, url })
            } else {
              await navigator.clipboard.writeText(url)
              alert('Link copied!')
            }
          }}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '40px',
            height: '40px',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            borderRadius: '50%',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          ↗
        </button>
        
        {/* Profile Content */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0 20px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
            {/* Profile Image */}
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#1a1a1f',
              border: '4px solid #000',
              flexShrink: 0,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>
              {brand.profile_image_url ? (
                <img
                  src={brand.profile_image_url}
                  alt={brand.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  fontWeight: 800,
                  color: 'white',
                }}>
                  {brand.name.charAt(0)}
                </div>
              )}
            </div>
            
            {/* Name and Meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <h1 style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  margin: 0,
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                }}>
                  {brand.name}
                </h1>
                {brand.is_verified && (
                  <span style={{
                    width: '22px',
                    height: '22px',
                    background: '#ab67f7',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    flexShrink: 0,
                  }}>✓</span>
                )}
              </div>
              
              {brand.tagline && (
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.8)',
                  margin: '0 0 8px 0',
                  lineHeight: 1.4,
                }}>
                  {brand.tagline}
                </p>
              )}
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.6)',
              }}>
                <span>{brand.location}</span>
                <span>·</span>
                <span>{brand.follower_count.toLocaleString()} followers</span>
                <span>·</span>
                <span>{brand.event_count} events</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Bar */}
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        gap: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button
          onClick={toggleFollow}
          disabled={followLoading}
          style={{
            flex: 1,
            padding: '14px',
            background: isFollowing ? 'transparent' : '#ab67f7',
            border: isFollowing ? '2px solid #ab67f7' : 'none',
            borderRadius: '28px',
            color: isFollowing ? '#ab67f7' : 'white',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 200ms ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {isFollowing ? (
            <>
              <span style={{ fontSize: '16px' }}>♥</span>
              Following
            </>
          ) : (
            <>
              <span style={{ fontSize: '16px' }}>♡</span>
              Follow
            </>
          )}
        </button>
        
        {/* Social Links */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {brand.instagram_url && (
            <a
              href={brand.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '48px',
                height: '48px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '20px',
                textDecoration: 'none',
                transition: 'background 200ms ease',
              }}
            >
              📸
            </a>
          )}
          {brand.soundcloud_url && (
            <a
              href={brand.soundcloud_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '48px',
                height: '48px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '20px',
                textDecoration: 'none',
              }}
            >
              ☁️
            </a>
          )}
          {brand.spotify_url && (
            <a
              href={brand.spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '48px',
                height: '48px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '20px',
                textDecoration: 'none',
              }}
            >
              🎵
            </a>
          )}
        </div>
      </div>
      
      {/* Genre Tags */}
      {brand.genres && brand.genres.length > 0 && (
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          {brand.genres.map((genre, i) => (
            <span
              key={i}
              style={{
                padding: '6px 14px',
                background: 'rgba(171,103,247,0.15)',
                border: '1px solid rgba(171,103,247,0.3)',
                borderRadius: '16px',
                fontSize: '13px',
                color: '#ab67f7',
                textTransform: 'capitalize',
              }}
            >
              {genre}
            </span>
          ))}
        </div>
      )}
      
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'sticky',
        top: '64px',
        background: '#000',
        zIndex: 50,
      }}>
        {(['upcoming', 'past', 'about'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #ab67f7' : '2px solid transparent',
              color: activeTab === tab ? 'white' : '#666',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 200ms ease',
            }}
          >
            {tab === 'upcoming' ? `Upcoming (${upcomingEvents.length})` : 
             tab === 'past' ? `Past (${pastEvents.length})` : 'About'}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div style={{ padding: '20px' }}>
        
        {/* Upcoming Events Tab */}
        {activeTab === 'upcoming' && (
          <div>
            {upcomingEvents.length === 0 ? (
              <div style={{
                padding: '60px 20px',
                textAlign: 'center',
              }}>
                <p style={{ color: '#666', fontSize: '15px' }}>No upcoming events</p>
                <p style={{ color: '#444', fontSize: '13px', marginTop: '8px' }}>
                  Follow to get notified when they announce something
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Past Events Tab */}
        {activeTab === 'past' && (
          <div>
            {pastEvents.length === 0 ? (
              <div style={{
                padding: '60px 20px',
                textAlign: 'center',
              }}>
                <p style={{ color: '#666', fontSize: '15px' }}>No past events yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pastEvents.map(event => (
                  <EventCard key={event.id} event={event} isPast />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* About Tab */}
        {activeTab === 'about' && (
          <div>
            {/* Bio */}
            {brand.bio && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#666',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '12px',
                }}>
                  About
                </h3>
                <p style={{
                  fontSize: '15px',
                  color: 'rgba(255,255,255,0.85)',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                }}>
                  {brand.bio}
                </p>
              </div>
            )}
            
            {/* Team Members */}
            {members.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#666',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '16px',
                }}>
                  The Team
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '16px',
                }}>
                  {members.map(member => (
                    <Link
                      key={member.id}
                      href={`/person/${member.person.slug}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        padding: '16px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        color: 'white',
                        transition: 'background 200ms ease',
                      }}
                    >
                      <div style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        marginBottom: '12px',
                        background: '#1a1a1f',
                      }}>
                        {member.person.profile_image_url ? (
                          <img
                            src={member.person.profile_image_url}
                            alt={member.person.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(135deg, #333, #222)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            fontWeight: 700,
                            color: '#666',
                          }}>
                            {member.person.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <p style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        marginBottom: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        {member.person.name}
                        {member.person.is_verified && (
                          <span style={{
                            width: '14px',
                            height: '14px',
                            background: '#ab67f7',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '8px',
                          }}>✓</span>
                        )}
                      </p>
                      <p style={{ fontSize: '12px', color: '#888' }}>
                        {member.role || member.person.role}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Info */}
            <div>
              <h3 style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '16px',
              }}>
                Info
              </h3>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                overflow: 'hidden',
              }}>
                {brand.location && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ color: '#888', fontSize: '14px' }}>Location</span>
                    <span style={{ fontSize: '14px' }}>{brand.location}</span>
                  </div>
                )}
                {brand.founded_year && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ color: '#888', fontSize: '14px' }}>Founded</span>
                    <span style={{ fontSize: '14px' }}>{brand.founded_year}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{ color: '#888', fontSize: '14px' }}>Total Events</span>
                  <span style={{ fontSize: '14px' }}>{brand.event_count}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                }}>
                  <span style={{ color: '#888', fontSize: '14px' }}>Followers</span>
                  <span style={{ fontSize: '14px' }}>{brand.follower_count.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <img src="/logo.svg" alt="Sounded Out" style={{ height: '20px', opacity: 0.4 }} />
        </Link>
        <p style={{ fontSize: '12px', color: '#444', marginTop: '12px' }}>
          The home of nightlife
        </p>
      </div>
      
      {/* Global Styles */}
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          background: #000;
          color: white;
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// EVENT CARD COMPONENT
// ============================================================================
function EventCard({ event, isPast = false }: { event: Event; isPast?: boolean }) {
  const [interested, setInterested] = useState(false)
  const [going, setGoing] = useState(false)
  
  // Check if user is interested/going
  useEffect(() => {
    const checkInterest = async () => {
      const userId = getAnonId()
      if (!userId) return
      
      const { data } = await supabase
        .from('event_interests')
        .select('status')
        .eq('user_id', userId)
        .eq('event_id', event.id)
        .single()
      
      if (data) {
        setInterested(data.status === 'interested')
        setGoing(data.status === 'going')
      }
    }
    
    if (!isPast) checkInterest()
  }, [event.id, isPast])
  
  const toggleInterest = async (status: 'interested' | 'going') => {
    const userId = getAnonId()
    const isCurrentStatus = status === 'interested' ? interested : going
    
    if (isCurrentStatus) {
      // Remove interest
      await supabase
        .from('event_interests')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', event.id)
      
      setInterested(false)
      setGoing(false)
    } else {
      // Add/update interest
      await supabase
        .from('event_interests')
        .upsert({
          user_id: userId,
          event_id: event.id,
          status,
        }, { onConflict: 'user_id,event_id' })
      
      setInterested(status === 'interested')
      setGoing(status === 'going')
    }
  }
  
  return (
    <Link
      href={`/?event=${event.id}`}
      style={{
        display: 'flex',
        gap: '14px',
        padding: '14px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '14px',
        textDecoration: 'none',
        color: 'white',
        opacity: isPast ? 0.6 : 1,
        transition: 'background 200ms ease',
      }}
    >
      {/* Event Image */}
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '10px',
        overflow: 'hidden',
        background: '#1a1a1f',
        flexShrink: 0,
      }}>
        {event.image_url ? (
          <img
            src={event.image_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#333',
            fontSize: '24px',
          }}>
            🎵
          </div>
        )}
      </div>
      
      {/* Event Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: '12px',
          color: '#ab67f7',
          fontWeight: 600,
          marginBottom: '4px',
        }}>
          {formatDate(event.start_time)} · {formatTime(event.start_time)}
        </p>
        <h4 style={{
          fontSize: '15px',
          fontWeight: 700,
          marginBottom: '4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {event.title}
        </h4>
        <p style={{
          fontSize: '13px',
          color: '#888',
          marginBottom: '8px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {event.venue?.name}
        </p>
        
        {/* Price and Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {event.sold_out ? (
            <span style={{
              padding: '4px 8px',
              background: 'rgba(248,113,113,0.15)',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#f87171',
            }}>
              SOLD OUT
            </span>
          ) : (
            <span style={{
              padding: '4px 8px',
              background: event.price_min === 0 ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              color: event.price_min === 0 ? '#22c55e' : '#888',
            }}>
              {formatPrice(event.price_min, event.price_max)}
            </span>
          )}
        </div>
      </div>
      
      {/* Interest Buttons (only for upcoming) */}
      {!isPast && (
        <div 
          style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
          onClick={e => e.preventDefault()}
        >
          <button
            onClick={() => toggleInterest('interested')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: interested ? '2px solid #ab67f7' : '1px solid rgba(255,255,255,0.15)',
              background: interested ? 'rgba(171,103,247,0.2)' : 'transparent',
              color: interested ? '#ab67f7' : '#666',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Interested"
          >
            {interested ? '♥' : '♡'}
          </button>
          <button
            onClick={() => toggleInterest('going')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: going ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.15)',
              background: going ? 'rgba(34,197,94,0.2)' : 'transparent',
              color: going ? '#22c55e' : '#666',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Going"
          >
            ✓
          </button>
        </div>
      )}
    </Link>
  )
}
