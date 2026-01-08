'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

// ============================================================================
// TYPES
// ============================================================================
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

interface Analytics {
  totalEvents: number
  upcomingEvents: number
  pastEvents: number
  totalClicks: number
  totalSaves: number
  avgTicketPrice: number
  topEvent: Event | null
}

interface User {
  id: string
  email?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const formatGenre = (genre: string): string => {
  return genre.trim().replace(/_/g, ' ')
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
  if (min === 0 || (!min && !max)) return 'Free'
  if (min && max && min !== max) return `£${min}–£${max}`
  return `£${min || max}`
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function BrandPage() {
  const params = useParams()
  const [brand, setBrand] = useState<Brand | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [pastEvents, setPastEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'analytics'>('upcoming')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Brand>>({})
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState<'logo' | 'cover' | null>(null)

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) setUser(data.user)
    }
    loadUser()
  }, [])

  // Load brand data
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
        setEditForm(brandData)

        // Check if current user is owner
        if (user && brandData.owner_user_id === user.id) {
          setIsOwner(true)
        }

        // Load upcoming events
        const now = new Date().toISOString()
        const { data: upcomingData } = await supabase
          .from('events')
          .select('*, venue:venues(id, name)')
          .eq('brand_id', brandData.id)
          .eq('status', 'published')
          .gte('start_time', now)
          .order('start_time', { ascending: true })
          .limit(20)

        if (upcomingData) setEvents(upcomingData as unknown as Event[])

        // Load past events
        const { data: pastData } = await supabase
          .from('events')
          .select('*, venue:venues(id, name)')
          .eq('brand_id', brandData.id)
          .eq('status', 'published')
          .lt('start_time', now)
          .order('start_time', { ascending: false })
          .limit(20)

        if (pastData) setPastEvents(pastData as unknown as Event[])

        // Load analytics if owner
        if (user && brandData.owner_user_id === user.id) {
          loadAnalytics(brandData.id)
        }
      }

      setLoading(false)
    }

    loadBrand()
  }, [params.slug, user])

  // Check following status
  useEffect(() => {
    if (!user || !brand) return

    const checkFollowing = async () => {
      const { data } = await supabase
        .from('brand_followers')
        .select('id')
        .eq('user_id', user.id)
        .eq('brand_id', brand.id)
        .single()

      if (data) setIsFollowing(true)
    }

    checkFollowing()
  }, [user, brand])

  const loadAnalytics = async (brandId: string) => {
    // Get event stats
    const { data: allEvents } = await supabase
      .from('events')
      .select('id, title, start_time, price_min, price_max, image_url, venue:venues(id, name)')
      .eq('brand_id', brandId)

    if (!allEvents) return

    const now = new Date()
    let upcoming = 0
    let past = 0
    let totalPrice = 0
    let priceCount = 0

    for (let i = 0; i < allEvents.length; i++) {
      const e = allEvents[i]
      if (new Date(e.start_time) > now) {
        upcoming++
      } else {
        past++
      }
      if (e.price_min) {
        totalPrice += e.price_min
        priceCount++
      }
    }

    // Get click stats (from link_clicks or similar table if you have it)
    // For now, we'll simulate with event saves
    const { count: saveCount } = await supabase
      .from('saved_events')
      .select('id', { count: 'exact', head: true })
      .in('event_id', allEvents.map(e => e.id))

    setAnalytics({
      totalEvents: allEvents.length,
      upcomingEvents: upcoming,
      pastEvents: past,
      totalClicks: saveCount || 0, // Would be actual clicks if tracked
      totalSaves: saveCount || 0,
      avgTicketPrice: priceCount > 0 ? Math.round(totalPrice / priceCount) : 0,
      topEvent: allEvents[0] as unknown as Event || null,
    })
  }

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
        text: brand.tagline || `Check out ${brand.name} on Sounded Out`,
        url: url,
      })
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copied!')
    }
  }

  const handleImageUpload = async (type: 'logo' | 'cover', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !brand) return

    setUploadingImage(type)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `brand-${brand.id}-${type}-${Date.now()}.${fileExt}`
      const filePath = `brands/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      const field = type === 'logo' ? 'logo_url' : 'cover_image_url'
      setEditForm(prev => ({ ...prev, [field]: urlData.publicUrl }))
    } catch (error: any) {
      console.error('Upload error:', error)
      alert('Failed to upload image')
    }

    setUploadingImage(null)
  }

  const handleSaveProfile = async () => {
    if (!brand) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('brands')
        .update({
          name: editForm.name,
          tagline: editForm.tagline,
          bio: editForm.bio,
          description: editForm.description,
          logo_url: editForm.logo_url,
          cover_image_url: editForm.cover_image_url,
          website_url: editForm.website_url,
          instagram_url: editForm.instagram_url,
          spotify_url: editForm.spotify_url,
          soundcloud_url: editForm.soundcloud_url,
          location: editForm.location,
          genres: editForm.genres,
        })
        .eq('id', brand.id)

      if (error) throw error

      setBrand(prev => prev ? { ...prev, ...editForm } : null)
      setShowEditModal(false)
    } catch (error: any) {
      console.error('Save error:', error)
      alert('Failed to save profile')
    }

    setSaving(false)
  }

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0a0a0b', 
        color: 'white', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid rgba(171,103,247,0.3)', 
            borderTopColor: '#ab67f7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#888' }}>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ============================================================================
  // NOT FOUND STATE
  // ============================================================================
  if (!brand) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0a0a0b', 
        color: 'white', 
        padding: '60px 20px', 
        textAlign: 'center' 
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Brand not found</h1>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
          This promoter profile doesn't exist or has been removed.
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

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white' }}>
      {/* COVER IMAGE */}
      <div style={{ 
        width: '100%', 
        height: '220px', 
        position: 'relative',
        background: brand.cover_image_url 
          ? `url(${brand.cover_image_url}) center/cover`
          : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      }}>
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'linear-gradient(to top, #0a0a0b 0%, rgba(0,0,0,0.3) 50%, transparent 100%)' 
        }} />
        
        {/* Back Button */}
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
            zIndex: 10,
          }}
        >
          ← Back
        </Link>

        {/* Admin Edit Cover */}
        {isOwner && (
          <label style={{
            position: 'absolute',
            top: 'max(16px, env(safe-area-inset-top))',
            right: '16px',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            padding: '8px 12px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '12px',
            cursor: 'pointer',
            zIndex: 10,
          }}>
            {uploadingImage === 'cover' ? 'Uploading...' : '📷 Edit Cover'}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload('cover', e)}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </div>

      {/* PROFILE SECTION */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ marginTop: '-60px', position: 'relative', zIndex: 20 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', marginBottom: '20px' }}>
            <div style={{ position: 'relative' }}>
              {brand.logo_url ? (
                <img 
                  src={brand.logo_url} 
                  alt={brand.name}
                  style={{ 
                    width: '120px', 
                    height: '120px', 
                    borderRadius: '16px', 
                    objectFit: 'cover',
                    border: '4px solid #0a0a0b',
                    background: '#1a1a1f',
                  }} 
                />
              ) : (
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #ab67f7 0%, #8b5cf6 100%)',
                  border: '4px solid #0a0a0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                }}>
                  🎵
                </div>
              )}
              
              {/* Admin Edit Logo */}
              {isOwner && (
                <label style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#ab67f7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}>
                  {uploadingImage === 'logo' ? '...' : '📷'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload('logo', e)}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ flex: 1, display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingBottom: '10px' }}>
              {isOwner ? (
                <>
                  <button
                    onClick={() => setShowEditModal(true)}
                    style={{
                      padding: '10px 20px',
                      background: 'rgba(171,103,247,0.15)',
                      border: '1px solid rgba(171,103,247,0.3)',
                      borderRadius: '10px',
                      color: '#ab67f7',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ✏️ Edit Profile
                  </button>
                  <Link
                    href="/partner/events/new"
                    style={{
                      padding: '10px 20px',
                      background: '#ab67f7',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    + New Event
                  </Link>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* Name & Verified Badge */}
          <div style={{ marginBottom: '8px' }}>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: 800, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px' 
            }}>
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
              {brand.is_featured && (
                <span style={{
                  padding: '4px 10px',
                  background: 'rgba(251,191,36,0.15)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#fbbf24',
                }}>
                  FEATURED
                </span>
              )}
            </h1>
          </div>

          {/* Tagline */}
          {brand.tagline && (
            <p style={{ fontSize: '16px', color: '#888', marginBottom: '16px' }}>
              {brand.tagline}
            </p>
          )}

          {/* Stats Row */}
          <div style={{ 
            display: 'flex', 
            gap: '24px', 
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}>
            <div>
              <span style={{ fontSize: '20px', fontWeight: 700 }}>{brand.event_count || events.length + pastEvents.length}</span>
              <span style={{ fontSize: '13px', color: '#888', marginLeft: '6px' }}>events</span>
            </div>
            <div>
              <span style={{ fontSize: '20px', fontWeight: 700 }}>{brand.follower_count || 0}</span>
              <span style={{ fontSize: '13px', color: '#888', marginLeft: '6px' }}>followers</span>
            </div>
            {brand.founded_year && (
              <div>
                <span style={{ fontSize: '13px', color: '#888' }}>Est. {brand.founded_year}</span>
              </div>
            )}
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
            <p style={{ 
              fontSize: '14px', 
              color: '#aaa', 
              lineHeight: 1.7, 
              marginBottom: '20px',
              maxWidth: '600px',
            }}>
              {brand.bio || brand.description}
            </p>
          )}

          {/* Social Links */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
            {brand.instagram_url && (
              
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                📸 Instagram
              </a>
            )}
            {brand.website_url && (
              
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                🌐 Website
              </a>
            )}
            {brand.spotify_url && (
              
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                🎵 Spotify
              </a>
            )}
            {brand.soundcloud_url && (
              
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ☁️ SoundCloud
              </a>
            )}
          </div>
        </div>

        {/* TABS */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '24px',
        }}>
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
          {isOwner && (
            <button
              onClick={() => setActiveTab('analytics')}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'analytics' ? '2px solid #ab67f7' : '2px solid transparent',
                color: activeTab === 'analytics' ? '#ab67f7' : '#888',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📊 Analytics
            </button>
          )}
        </div>

        {/* TAB CONTENT */}
        <div style={{ paddingBottom: '100px' }}>
          {/* UPCOMING EVENTS */}
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
                    <EventCard key={event.id} event={event} isOwner={isOwner} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* PAST EVENTS */}
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
                    <EventCard key={event.id} event={event} isOwner={isOwner} isPast />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ANALYTICS (Owner Only) */}
          {activeTab === 'analytics' && isOwner && (
            <div>
              {/* Pro Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(171,103,247,0.15) 0%, rgba(59,130,246,0.15) 100%)',
                border: '1px solid rgba(171,103,247,0.2)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                      🚀 Unlock Pro Analytics
                    </h3>
                    <p style={{ fontSize: '14px', color: '#888' }}>
                      Get detailed insights, ticket click tracking, and audience demographics
                    </p>
                  </div>
                  <button style={{
                    padding: '12px 24px',
                    background: '#ab67f7',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}>
                    Upgrade – £9/month
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                gap: '16px',
                marginBottom: '32px',
              }}>
                <StatCard label="Total Events" value={analytics?.totalEvents || 0} icon="🎪" />
                <StatCard label="Upcoming" value={analytics?.upcomingEvents || 0} icon="📅" color="#22c55e" />
                <StatCard label="Past Events" value={analytics?.pastEvents || 0} icon="✅" />
                <StatCard label="Total Saves" value={analytics?.totalSaves || 0} icon="❤️" color="#f87171" />
                <StatCard label="Avg Ticket" value={`£${analytics?.avgTicketPrice || 0}`} icon="🎟️" color="#fbbf24" />
                <StatCard label="Followers" value={brand.follower_count} icon="👥" color="#ab67f7" />
              </div>

              {/* Pro Features Preview (Locked) */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '16px',
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(10,10,11,0.8)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '32px', marginBottom: '12px', display: 'block' }}>🔒</span>
                    <p style={{ fontSize: '14px', color: '#888', marginBottom: '12px' }}>
                      Upgrade to Pro to unlock detailed analytics
                    </p>
                    <button style={{
                      padding: '10px 20px',
                      background: '#ab67f7',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}>
                      Upgrade Now
                    </button>
                  </div>
                </div>
                
                {/* Blurred preview content */}
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Ticket Click Analytics</h3>
                <div style={{ height: '200px', background: 'rgba(171,103,247,0.1)', borderRadius: '12px' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000,
          overflow: 'auto',
        }}>
          <div style={{
            background: '#111',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              background: '#111',
              zIndex: 10,
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Edit Profile</h2>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: '24px',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                  Brand Name
                </label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Tagline */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                  Tagline
                </label>
                <input
                  type="text"
                  value={editForm.tagline || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="A short description of your brand"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Bio */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                  Bio
                </label>
                <textarea
                  value={editForm.bio || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  placeholder="Tell people about your brand..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Location */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                  Location
                </label>
                <input
                  type="text"
                  value={editForm.location || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Newcastle, UK"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Social Links */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                  Instagram URL
                </label>
                <input
                  type="url"
                  value={editForm.instagram_url || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, instagram_url: e.target.value }))}
                  placeholder="https://instagram.com/..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                  Website URL
                </label>
                <input
                  type="url"
                  value={editForm.website_url || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, website_url: e.target.value }))}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                    Spotify URL
                  </label>
                  <input
                    type="url"
                    value={editForm.spotify_url || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, spotify_url: e.target.value }))}
                    placeholder="https://open.spotify.com/..."
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                    SoundCloud URL
                  </label>
                  <input
                    type="url"
                    value={editForm.soundcloud_url || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, soundcloud_url: e.target.value }))}
                    placeholder="https://soundcloud.com/..."
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: saving ? '#444' : '#ab67f7',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// EVENT CARD COMPONENT
// ============================================================================
function EventCard({ event, isOwner, isPast }: { event: Event; isOwner: boolean; isPast?: boolean }) {
  return (
    <Link
      href={`/event/${event.id}`}
      style={{
        display: 'flex',
        gap: '16px',
        padding: '16px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        textDecoration: 'none',
        color: 'white',
        opacity: isPast ? 0.7 : 1,
      }}
    >
      {/* Image */}
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '10px',
        background: event.image_url
          ? `url(${event.image_url}) center/cover`
          : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {!event.image_url && <span style={{ opacity: 0.4 }}>🎵</span>}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 600 }}>
            {new Date(event.start_time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {new Date(event.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {event.sold_out && (
            <span style={{
              padding: '2px 6px',
              background: 'rgba(248,113,113,0.15)',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 600,
              color: '#f87171',
            }}>
              SOLD OUT
            </span>
          )}
          {event.so_pick && (
            <span style={{
              padding: '2px 6px',
              background: 'rgba(251,191,36,0.15)',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 600,
              color: '#fbbf24',
            }}>
              SO PICK
            </span>
          )}
        </div>

        <h3 style={{
          fontSize: '15px',
          fontWeight: 600,
          marginBottom: '4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {event.title}
        </h3>

        <p style={{ fontSize: '13px', color: '#888' }}>
          {event.venue?.name || 'TBA'}
        </p>
      </div>

      {/* Price */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          color: event.price_min === 0 ? '#22c55e' : '#fff',
        }}>
          {event.price_min === 0 || (!event.price_min && !event.price_max) 
            ? 'Free' 
            : `£${event.price_min}${event.price_max && event.price_max !== event.price_min ? `–£${event.price_max}` : ''}`
          }
        </span>
        
        {/* Owner sees stats */}
        {isOwner && (
          <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
            Click for stats →
          </p>
        )}
      </div>
    </Link>
  )
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================
function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color?: string }) {
  return (
    <div style={{
      padding: '20px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '12px',
      textAlign: 'center',
    }}>
      <span style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }}>{icon}</span>
      <p style={{ 
        fontSize: '24px', 
        fontWeight: 700, 
        color: color || 'white',
        marginBottom: '4px',
      }}>
        {value}
      </p>
      <p style={{ fontSize: '12px', color: '#888' }}>{label}</p>
    </div>
  )
}
