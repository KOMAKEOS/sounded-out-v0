'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type Event = {
  id: string
  title: string
  date: string
  start_time: string | null
  image_url: string | null
  ticket_source: string | null
  price_type: string | null
  price_min: number | null
  genres: string | null
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

function formatTime(time: string | null): string {
  if (!time) return ''
  const [h, m] = time.split(':')
  return `${h}:${m}`
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'weekend'>('all')
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [showAllGenres, setShowAllGenres] = useState(false)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Fixed query - removed !inner to include all events
      const { data } = await supabase
        .from('events')
        .select('id, title, date, start_time, image_url, ticket_source, price_type, price_min, genres, venue:venues(id, name)')
        .eq('status', 'published')
        .gte('start_time', new Date().toISOString())
        .order('date')
        .order('start_time')

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

  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.date)
    const today = new Date()
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

  const grouped: { [key: string]: Event[] } = {}
  filteredEvents.forEach(e => {
    if (!grouped[e.date]) grouped[e.date] = []
    grouped[e.date].push(e)
  })

  const visibleGenres = showAllGenres ? ALL_GENRES : ALL_GENRES.slice(0, 6)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: '#fff' }}>
      {/* Navbar - matches venues page */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', paddingTop: 'max(16px, env(safe-area-inset-top))',
        background: '#0a0a0b', borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo.svg" alt="Sounded Out" style={{ height: '24px' }} />
        </Link>
        
        <nav style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '4px' }}>
          <Link href="/events" style={{ padding: '10px 20px', borderRadius: '8px', background: '#AB67F7', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Events</Link>
          <Link href="/venues" style={{ padding: '10px 20px', borderRadius: '8px', color: '#888', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Venues</Link>
          <Link href="/saved" style={{ padding: '10px 20px', borderRadius: '8px', color: '#888', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Saved</Link>
        </nav>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.06)', borderRadius: '20px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#AB67F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '13px', color: '#999', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email?.split('@')[0]}</span>
          </div>
        ) : (
          <Link href="/login" style={{ padding: '10px 20px', background: '#AB67F7', borderRadius: '10px', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Sign In</Link>
        )}
      </header>

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

        <p style={{ color: '#AB67F7', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>{filteredEvents.length} events</p>

        {loading ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '60px 0' }}>Loading...</p>
        ) : Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🌙</div>
            <p style={{ color: '#888' }}>No events found</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, evts]) => (
            <div key={date} style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#666', letterSpacing: '1px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {formatDate(date).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {evts.map(e => (
                  <Link key={e.id} href={`/events/${e.id}`} style={{
                    display: 'flex', gap: '14px', padding: '14px',
                    background: 'rgba(255,255,255,0.03)', borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none',
                  }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '10px', overflow: 'hidden', background: '#1a1a1f', flexShrink: 0 }}>
                      {e.image_url ? (
                        <img src={e.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', opacity: 0.3 }}>♪</div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</h3>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>{e.venue?.name || 'Venue TBA'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#AB67F7', fontWeight: 600 }}>{formatTime(e.start_time)}</span>
                        {e.genres && <span style={{ fontSize: '11px', color: '#666', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>{e.genres.split(',')[0]?.trim()}</span>}
                        {e.ticket_source === 'ra' && <span style={{ fontSize: '10px', color: '#ffcc00', background: 'rgba(255,204,0,0.1)', padding: '2px 5px', borderRadius: '3px', fontWeight: 600 }}>RA</span>}
                        {e.price_type === 'free' && <span style={{ fontSize: '10px', color: '#22c55e', marginLeft: 'auto' }}>FREE</span>}
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
