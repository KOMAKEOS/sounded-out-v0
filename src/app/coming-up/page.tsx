'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ============================================================================
// TYPES
// ============================================================================
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
  genres: string | null
  venue: {
    id: string
    name: string
  } | null
  brand: {
    id: string
    slug: string
    name: string
    profile_image_url: string | null
  } | null
}

type EventWithMeta = Event & {
  source: 'interested' | 'going' | 'following' | 'popular'
  interest_status?: 'interested' | 'going'
}

type GroupedEvents = {
  label: string
  events: EventWithMeta[]
}

// ============================================================================
// HELPERS
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
  
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const formatPrice = (min: number | null, max: number | null) => {
  if (min === 0 || (!min && !max)) return 'Free'
  const fmt = (n: number) => n % 1 === 0 ? `£${n}` : `£${n.toFixed(2)}`
  if (min && max && min !== max) return `${fmt(min)}–${fmt(max)}`
  return fmt(min || max || 0)
}

const getWeekLabel = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'Past'
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays < 7) return 'This Week'
  if (diffDays < 14) return 'Next Week'
  if (diffDays < 30) return 'This Month'
  return 'Later'
}

const groupEventsByWeek = (events: EventWithMeta[]): GroupedEvents[] => {
  const groups: Record<string, EventWithMeta[]> = {}
  const order = ['Today', 'Tomorrow', 'This Week', 'Next Week', 'This Month', 'Later']
  
  events.forEach(event => {
    const label = getWeekLabel(event.start_time)
    if (!groups[label]) groups[label] = []
    groups[label].push(event)
  })
  
  return order
    .filter(label => groups[label]?.length > 0)
    .map(label => ({ label, events: groups[label] }))
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ComingUpPage() {
  const [events, setEvents] = useState<EventWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'all' | 'interested' | 'following'>('all')
  const [followedBrandIds, setFollowedBrandIds] = useState<string[]>([])
  
  useEffect(() => {
    loadEvents()
  }, [])
  
  const loadEvents = async () => {
    const userId = getAnonId()
    if (!userId) {
      setLoading(false)
      return
    }
    
    const now = new Date().toISOString()
    const allEvents: EventWithMeta[] = []
    const seenEventIds = new Set<string>()
    
    // 1. Get events user is interested in / going to
    const { data: interests } = await supabase
      .from('event_interests')
      .select(`
        status,
        event:events(
          *,
          venue:venues(id, name),
          brand:brands(id, slug, name, profile_image_url)
        )
      `)
      .eq('user_id', userId)
    
    if (interests) {
      interests.forEach((interest: any) => {
        if (interest.event && new Date(interest.event.start_time) >= new Date(now)) {
          seenEventIds.add(interest.event.id)
          allEvents.push({
            ...interest.event,
            source: interest.status === 'going' ? 'going' : 'interested',
            interest_status: interest.status,
          })
        }
      })
    }
    
    // 2. Get brands user follows
    const { data: follows } = await supabase
      .from('follows')
      .select('brand_id')
      .eq('user_id', userId)
    
    const brandIds = follows?.map((f: any) => f.brand_id) || []
    setFollowedBrandIds(brandIds)
    
    // 3. Get upcoming events from followed brands
    if (brandIds.length > 0) {
      const { data: brandEvents } = await supabase
        .from('events')
        .select(`
          *,
          venue:venues(id, name),
          brand:brands(id, slug, name, profile_image_url)
        `)
        .in('brand_id', brandIds)
        .eq('status', 'published')
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(50)
      
      if (brandEvents) {
        brandEvents.forEach((event: any) => {
          if (!seenEventIds.has(event.id)) {
            seenEventIds.add(event.id)
            allEvents.push({
              ...event,
              source: 'following',
            })
          }
        })
      }
    }
    
    // 4. Get popular events as suggestions
    const { data: popularEvents } = await supabase
      .from('events')
      .select(`
        *,
        venue:venues(id, name),
        brand:brands(id, slug, name, profile_image_url)
      `)
      .eq('status', 'published')
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(20)
    
    if (popularEvents) {
      popularEvents.forEach((event: any) => {
        if (!seenEventIds.has(event.id)) {
          seenEventIds.add(event.id)
          allEvents.push({
            ...event,
            source: 'popular',
          })
        }
      })
    }
    
    // Sort by date
    allEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    
    setEvents(allEvents)
    setLoading(false)
  }
  
  // Filter events based on active filter
  const filteredEvents = events.filter(event => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'interested') return event.source === 'interested' || event.source === 'going'
    if (activeFilter === 'following') return event.source === 'following'
    return true
  })
  
  const groupedEvents = groupEventsByWeek(filteredEvents)
  
  // Stats
  const interestedCount = events.filter(e => e.source === 'interested' || e.source === 'going').length
  const followingCount = events.filter(e => e.source === 'following').length
  
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
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        background: 'rgba(0,0,0,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 100,
        padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <Link href="/" style={{
            color: '#888',
            textDecoration: 'none',
            fontSize: '24px',
          }}>
            ←
          </Link>
          <h1 style={{
            fontSize: '18px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}>
            Coming Up
          </h1>
          <div style={{ width: '24px' }} />
        </div>
        
        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
        }}>
          <button
            onClick={() => setActiveFilter('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: activeFilter === 'all' ? '#ab67f7' : 'rgba(255,255,255,0.08)',
              color: activeFilter === 'all' ? 'white' : '#888',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('interested')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: activeFilter === 'interested' ? '#ab67f7' : 'rgba(255,255,255,0.08)',
              color: activeFilter === 'interested' ? 'white' : '#888',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>♥</span>
            Saved ({interestedCount})
          </button>
          <button
            onClick={() => setActiveFilter('following')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: activeFilter === 'following' ? '#ab67f7' : 'rgba(255,255,255,0.08)',
              color: activeFilter === 'following' ? 'white' : '#888',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Following ({followingCount})
          </button>
        </div>
      </header>
      
      {/* Content */}
      <div style={{ padding: '20px' }}>
        
        {/* Empty State */}
        {filteredEvents.length === 0 && (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
          }}>
            {activeFilter === 'interested' ? (
              <>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>♡</p>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                  No saved events yet
                </h3>
                <p style={{ color: '#666', marginBottom: '24px' }}>
                  Tap the heart on events you&apos;re interested in
                </p>
                <Link href="/" style={{
                  padding: '12px 24px',
                  background: '#ab67f7',
                  borderRadius: '24px',
                  color: 'white',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                }}>
                  Explore Events
                </Link>
              </>
            ) : activeFilter === 'following' ? (
              <>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>👤</p>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                  Not following any brands yet
                </h3>
                <p style={{ color: '#666', marginBottom: '24px' }}>
                  Follow promoters to see their events here
                </p>
                <Link href="/" style={{
                  padding: '12px 24px',
                  background: '#ab67f7',
                  borderRadius: '24px',
                  color: 'white',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                }}>
                  Discover Brands
                </Link>
              </>
            ) : (
              <>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>📅</p>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                  Nothing coming up
                </h3>
                <p style={{ color: '#666' }}>
                  Check back soon for new events
                </p>
              </>
            )}
          </div>
        )}
        
        {/* Event Groups */}
        {groupedEvents.map(group => (
          <div key={group.label} style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#ab67f7',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '14px',
              paddingBottom: '8px',
              borderBottom: '1px solid rgba(171,103,247,0.2)',
            }}>
              {group.label}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {group.events.map(event => (
                <EventCard key={event.id} event={event} onUpdate={loadEvents} />
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Bottom Navigation */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(0,0,0,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 20px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        display: 'flex',
        justifyContent: 'space-around',
      }}>
        <Link href="/" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          color: '#666',
          textDecoration: 'none',
          fontSize: '10px',
        }}>
          <span style={{ fontSize: '20px' }}>🗺</span>
          Explore
        </Link>
        <Link href="/coming-up" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          color: '#ab67f7',
          textDecoration: 'none',
          fontSize: '10px',
        }}>
          <span style={{ fontSize: '20px' }}>📅</span>
          Coming Up
        </Link>
      </nav>
      
      {/* Bottom padding for nav */}
      <div style={{ height: '100px' }} />
      
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; color: white; }
      `}</style>
    </div>
  )
}

// ============================================================================
// EVENT CARD COMPONENT
// ============================================================================
function EventCard({ event, onUpdate }: { event: EventWithMeta; onUpdate: () => void }) {
  const [interestStatus, setInterestStatus] = useState<'interested' | 'going' | null>(
    event.interest_status || null
  )
  
  const toggleInterest = async (status: 'interested' | 'going') => {
    const userId = getAnonId()
    const isCurrentStatus = interestStatus === status
    
    if (isCurrentStatus) {
      await supabase
        .from('event_interests')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', event.id)
      setInterestStatus(null)
    } else {
      await supabase
        .from('event_interests')
        .upsert({
          user_id: userId,
          event_id: event.id,
          status,
        }, { onConflict: 'user_id,event_id' })
      setInterestStatus(status)
    }
    
    onUpdate()
  }
  
  return (
    <div style={{
      display: 'flex',
      gap: '14px',
      padding: '14px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '14px',
      position: 'relative',
    }}>
      {/* Source Badge */}
      {event.source === 'following' && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          padding: '3px 8px',
          background: 'rgba(171,103,247,0.2)',
          borderRadius: '10px',
          fontSize: '10px',
          color: '#ab67f7',
          fontWeight: 600,
        }}>
          Following
        </div>
      )}
      {(event.source === 'interested' || event.source === 'going') && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          padding: '3px 8px',
          background: event.source === 'going' ? 'rgba(34,197,94,0.2)' : 'rgba(171,103,247,0.2)',
          borderRadius: '10px',
          fontSize: '10px',
          color: event.source === 'going' ? '#22c55e' : '#ab67f7',
          fontWeight: 600,
        }}>
          {event.source === 'going' ? '✓ Going' : '♥ Saved'}
        </div>
      )}
      
      {/* Event Image */}
      <Link href={`/?event=${event.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '10px',
          overflow: 'hidden',
          background: '#1a1a1f',
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
      </Link>
      
      {/* Event Details */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: '60px' }}>
        <p style={{
          fontSize: '12px',
          color: '#ab67f7',
          fontWeight: 600,
          marginBottom: '4px',
        }}>
          {formatDate(event.start_time)} · {formatTime(event.start_time)}
        </p>
        <Link href={`/?event=${event.id}`} style={{ textDecoration: 'none', color: 'white' }}>
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
        </Link>
        <p style={{
          fontSize: '13px',
          color: '#888',
          marginBottom: '6px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {event.venue?.name}
          {event.brand && (
            <Link 
              href={`/brand/${event.brand.slug}`}
              style={{ color: '#ab67f7', textDecoration: 'none', marginLeft: '6px' }}
            >
              · {event.brand.name}
            </Link>
          )}
        </p>
        
        {/* Price */}
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
      </div>
      
      {/* Action Buttons */}
      <div style={{
        position: 'absolute',
        bottom: '14px',
        right: '14px',
        display: 'flex',
        gap: '6px',
      }}>
        <button
          onClick={() => toggleInterest('interested')}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            border: interestStatus === 'interested' ? '2px solid #ab67f7' : '1px solid rgba(255,255,255,0.15)',
            background: interestStatus === 'interested' ? 'rgba(171,103,247,0.2)' : 'transparent',
            color: interestStatus === 'interested' ? '#ab67f7' : '#666',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Interested"
        >
          {interestStatus === 'interested' ? '♥' : '♡'}
        </button>
        <button
          onClick={() => toggleInterest('going')}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            border: interestStatus === 'going' ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.15)',
            background: interestStatus === 'going' ? 'rgba(34,197,94,0.2)' : 'transparent',
            color: interestStatus === 'going' ? '#22c55e' : '#666',
            fontSize: '12px',
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
    </div>
  )
}
