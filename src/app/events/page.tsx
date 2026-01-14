'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import NavBar from '../../components/NavBar'

type Event = {
  id: string
  title: string
  start_time: string
  end_time: string | null
  image_url: string | null
  ticket_source: string | null
  price_type: string | null
  price_min: number | null
  price_max: number | null
  genres: string | null
  so_pick: boolean
  sold_out: boolean
  venue: { id: string; name: string } | null
}

const ALL_GENRES = ['Techno', 'House', 'DnB', 'Disco', 'Hip Hop', 'R&B', 'Live Music', 'Indie', 'Electronic', 'Garage', 'Jungle', 'Ambient', 'Jazz', 'Soul', 'Funk']

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatGenre(genre: string): string {
  return genre.trim().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getDateKey(dateStr: string): string {
  return new Date(dateStr).toDateString()
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'weekend'>('all')
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [showAllGenres, setShowAllGenres] = useState(false)

  useEffect(() => {
    async function loadData() {
      // Get today's date at midnight for comparison
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { data, error } = await supabase
        .from('events')
        .select('*, venue:venues(id, name)')
        .eq('status', 'published')
        .gte('start_time', today.toISOString())
        .order('start_time')

      if (error) {
        console.error('Error loading events:', error)
      }

      if (data) {
        const transformed: Event[] = data.map((e: any) => ({
          ...e,
          venue: Array.isArray(e.venue) ? e.venue[0] || null : e.venue
        }))
        setEvents(transformed)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  // Filter events
  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.start_time)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (dateFilter === 'today' && eventDate.toDateString() !== today.toDateString()) return false
    if (dateFilter === 'tomorrow' && eventDate.toDateString() !== tomorrow.toDateString()) return false
    if (dateFilter === 'weekend') {
      const day = eventDate.getDay()
      if (day !== 5 && day !== 6 && day !== 0) return false
    }
    if (selectedGenre && !event.genres?.toLowerCase().includes(selectedGenre.toLowerCase())) return false
    return true
  })

  // Group by date
  const grouped: { [key: string]: Event[] } = {}
  filteredEvents.forEach(e => {
    const key = getDateKey(e.start_time)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(e)
  })

  // Sort dates
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

  const visibleGenres = showAllGenres ? ALL_GENRES : ALL_GENRES.slice(0, 6)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: '#fff' }}>
      <NavBar />

      <main style={{ padding: '32px 24px 100px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '4px' }}>Events</h1>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>Discover what&apos;s happening in Newcastle</p>

        {/* Date filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {(['all', 'today', 'tomorrow', 'weekend'] as const).map(f => (
            <button key={f} onClick={() => setDateFilter(f)} style={{
              padding: '10px 18px', borderRadius: '20px',
              border: dateFilter === f ? '2px solid #AB67F7' : '1px solid rgba(255,255,255,0.15)',
              background: dateFilter === f ? 'rgba(171,103,247,0.15)' : 'rgba(255,255,255,0.04)',
              color: dateFilter === f ? '#AB67F7' : '#888', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
            }}>{f === 'all' ? 'All' : f}</button>
          ))}
        </div>

        {/* Genre filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
          {visibleGenres.map(g => (
            <button key={g} onClick={() => setSelectedGenre(selectedGenre === g ? null : g)} style={{
              padding: '8px 14px', borderRadius: '16px',
              border: selectedGenre === g ? '1px solid #AB67F7' : '1px solid rgba(255,255,255,0.12)',
              background: selectedGenre === g ? 'rgba(171,103,247,0.15)' : 'rgba(255,255,255,0.04)',
              color: selectedGenre === g ? '#AB67F7' : '#888', fontSize: '13px', cursor: 'pointer',
            }}>{g}</button>
          ))}
          <button onClick={() => setShowAllGenres(!showAllGenres)} style={{
            padding: '8px 14px', borderRadius: '16px', border: '1px solid rgba(171,103,247,0.3)',
            background: 'transparent', color: '#AB67F7', fontSize: '13px', cursor: 'pointer',
          }}>{showAllGenres ? '− Less' : `+ ${ALL_GENRES.length - 6} more`}</button>
        </div>

        <p style={{ color: '#AB67F7', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              border: '3px solid rgba(171,103,247,0.2)', 
              borderTopColor: '#ab67f7',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: '#888' }}>Loading events...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : sortedDates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>🌙</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#888' }}>No events found</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Try adjusting your filters or check back later</p>
          </div>
        ) : (
          sortedDates.map(dateKey => (
            <div key={dateKey} style={{ marginBottom: '32px' }}>
              <div style={{ 
                fontSize: '12px', fontWeight: 700, color: '#666', letterSpacing: '1px', 
                marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' 
              }}>
                {formatDate(grouped[dateKey][0].start_time).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {grouped[dateKey].map(e => (
                  <Link key={e.id} href={`/events/${e.id}`} style={{
                    display: 'flex', gap: '14px', padding: '14px',
                    background: 'rgba(255,255,255,0.03)', borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none',
                    transition: 'border-color 150ms ease',
                  }}>
                    {/* Thumbnail */}
                    <div style={{ width: '72px', height: '72px', borderRadius: '10px', overflow: 'hidden', background: '#1a1a1f', flexShrink: 0 }}>
                      {e.image_url ? (
                        <img src={e.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ 
                          width: '100%', height: '100%', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontSize: '28px', opacity: 0.3,
                          background: 'linear-gradient(135deg, #1a1a2e, #252530)',
                        }}>🎵</div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        {e.so_pick && (
                          <img src="/so-icon.png" alt="Curated" style={{ height: '12px', width: 'auto' }} />
                        )}
                        <h3 style={{ 
                          fontSize: '15px', fontWeight: 600, color: '#fff', 
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' 
                        }}>
                          {e.title}
                        </h3>
                      </div>
                      
                      {/* Venue */}
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                        {e.venue?.name || 'Venue TBA'}
                      </div>
                      
                      {/* Meta row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: '#AB67F7', fontWeight: 600 }}>
                          {formatTime(e.start_time)}
                        </span>
                        
                        {e.genres && (
                          <span style={{ 
                            fontSize: '11px', color: '#22d3ee', 
                            background: 'rgba(34,211,238,0.1)', 
                            padding: '2px 8px', borderRadius: '4px' 
                          }}>
                            {formatGenre(e.genres.split(',')[0])}
                          </span>
                        )}
                        
                        {e.ticket_source === 'ra' && (
                          <span style={{ 
                            fontSize: '10px', color: '#000', 
                            background: '#ffcc00', 
                            padding: '2px 6px', borderRadius: '3px', fontWeight: 700 
                          }}>RA</span>
                        )}
                        
                        {e.sold_out && (
                          <span style={{ 
                            fontSize: '10px', color: '#f87171', 
                            background: 'rgba(248,113,113,0.15)', 
                            padding: '2px 6px', borderRadius: '3px', fontWeight: 700 
                          }}>SOLD OUT</span>
                        )}
                        
                        {e.price_min === 0 && (
                          <span style={{ 
                            fontSize: '10px', color: '#22c55e', 
                            background: 'rgba(34,197,94,0.15)', 
                            padding: '2px 6px', borderRadius: '3px', fontWeight: 700,
                            marginLeft: 'auto' 
                          }}>FREE</span>
                        )}
                        
                        {e.price_min && e.price_min > 0 && (
                          <span style={{ fontSize: '12px', color: '#888', marginLeft: 'auto' }}>
                            £{e.price_min}{e.price_max && e.price_max !== e.price_min ? `–£${e.price_max}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
