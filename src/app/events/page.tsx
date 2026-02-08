'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { formatUKTime, isUKToday, isUKTomorrow, isUKWeekend, getUKDateString } from '../../lib/ukTime'

type Event = {
  id: string
  title: string
  start_time: string
  end_time: string | null
  image_url: string | null
  price_min: number | null
  price_max: number | null
  genres: string | null
  so_pick: boolean
  sold_out: boolean
  status: string
  venue?: { id: string; name: string; address: string | null } | null
  brand?: { id: string; name: string; slug: string; is_verified: boolean } | null
}

type DateFilter = 'all' | 'today' | 'tomorrow' | 'weekend'

const formatGenre = (g: string): string => g.trim().replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

const formatPrice = (min: number | null, max: number | null): string => {
  if (min === null && max === null) return ''
  if (min === 0 && (max === null || max === 0)) return 'Free'
  if (min !== null && max !== null && min === max) return '\u00A3' + min
  if (min !== null && max !== null) return '\u00A3' + min + '\u2013\u00A3' + max
  if (min !== null) return 'From \u00A3' + min
  return ''
}

const formatDateHeading = (dateStr: string): string => {
  if (isUKToday(dateStr)) return 'Today'
  if (isUKTomorrow(dateStr)) return 'Tomorrow'
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' })
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [activeGenre, setActiveGenre] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { data, error } = await supabase
        .from('events')
        .select('*, venue:venues(id, name, address), brand:brands(id, name, slug, is_verified)')
        .eq('status', 'published')
        .gte('start_time', today.toISOString())
        .order('start_time', { ascending: true })
        .limit(200)
      if (error) { /* ignored */ }
      if (data) {
        const cleaned: Event[] = []
        for (let i = 0; i < data.length; i++) {
          const e = data[i] as any
          cleaned.push({ ...e, venue: Array.isArray(e.venue) ? e.venue[0] || null : e.venue, brand: Array.isArray(e.brand) ? e.brand[0] || null : e.brand })
        }
        setEvents(cleaned)
      }
      setLoading(false)
    }
    load()
  }, [])

  const dateFiltered = useMemo(() => {
    if (dateFilter === 'all') return events
    const result: Event[] = []
    for (let i = 0; i < events.length; i++) {
      const e: Event = events[i]
      if (dateFilter === 'today' && isUKToday(e.start_time)) result.push(e)
      else if (dateFilter === 'tomorrow' && isUKTomorrow(e.start_time)) result.push(e)
      else if (dateFilter === 'weekend' && isUKWeekend(e.start_time)) result.push(e)
    }
    return result
  }, [events, dateFilter])

  const availableGenres = useMemo(() => {
    const counts = new Map<string, number>()
    for (let i = 0; i < dateFiltered.length; i++) {
      const e: Event = dateFiltered[i]
      if (e.genres) {
        const parts: string[] = e.genres.split(',')
        for (let j = 0; j < parts.length; j++) {
          const g: string = parts[j].trim().toLowerCase()
          if (g) counts.set(g, (counts.get(g) || 0) + 1)
        }
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([g]) => g).slice(0, 8)
  }, [dateFiltered])

  const filtered = useMemo(() => {
    if (!activeGenre) return dateFiltered
    const result: Event[] = []
    for (let i = 0; i < dateFiltered.length; i++) {
      const e: Event = dateFiltered[i]
      if (e.genres && e.genres.toLowerCase().includes(activeGenre.toLowerCase())) result.push(e)
    }
    return result
  }, [dateFiltered, activeGenre])

  const grouped = useMemo(() => {
    const g: Record<string, Event[]> = {}
    for (let i = 0; i < filtered.length; i++) {
      const e: Event = filtered[i]
      const key: string = getUKDateString(new Date(e.start_time))
      if (!g[key]) g[key] = []
      g[key].push(e)
    }
    return g
  }, [filtered])

  const dateKeys = Object.keys(grouped).sort()
  const filterLabel = dateFilter === 'today' ? 'today' : dateFilter === 'tomorrow' ? 'tomorrow' : dateFilter === 'weekend' ? 'this weekend' : 'upcoming'

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: '#e5e7eb' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, padding: '16px 20px', background: 'rgba(10,10,11,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <Link href="/" style={{ color: '#ab67f7', textDecoration: 'none', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            Map
          </Link>
          <h1 style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px', color: '#fff' }}>Events</h1>
          <div style={{ width: '50px' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', overflowX: 'auto' }}>
          {([['all', 'All'], ['today', 'Tonight'], ['tomorrow', 'Tomorrow'], ['weekend', 'Weekend']] as [DateFilter, string][]).map(([key, label]) => (
            <button key={key} onClick={() => { setDateFilter(key); setActiveGenre(null) }} style={{ padding: '7px 14px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', background: dateFilter === key ? '#ab67f7' : 'rgba(255,255,255,0.08)', color: dateFilter === key ? '#fff' : '#9ca3af' }}>
              {label}
            </button>
          ))}
        </div>
        {availableGenres.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {availableGenres.map((g: string) => (
              <button key={g} onClick={() => setActiveGenre(activeGenre === g ? null : g)} style={{ padding: '5px 12px', borderRadius: '16px', border: activeGenre === g ? '1px solid #ab67f7' : '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', background: activeGenre === g ? 'rgba(171,103,247,0.15)' : 'transparent', color: activeGenre === g ? '#ab67f7' : '#6b7280' }}>
                {formatGenre(g)}
              </button>
            ))}
          </div>
        )}
      </header>
      <main style={{ padding: '16px 20px 100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
            <p style={{ fontSize: '14px' }}>Loading events...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
            <p style={{ fontSize: '14px' }}>No events found {filterLabel}.</p>
            <button onClick={() => { setDateFilter('all'); setActiveGenre(null) }} style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#ab67f7', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Show all events
            </button>
          </div>
        ) : (
          dateKeys.map((dk: string) => (
            <div key={dk} style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{formatDateHeading(grouped[dk][0].start_time)}</h2>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>{grouped[dk].length} events</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {grouped[dk].map((event: Event) => (
                  <Link key={event.id} href={'/event/' + event.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                      <div style={{ width: '72px', height: '72px', borderRadius: '10px', flexShrink: 0, background: event.image_url ? 'url(' + event.image_url + ') center/cover' : 'rgba(171,103,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {!event.image_url && <span style={{ fontSize: '24px', opacity: 0.5 }}>🎵</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 600 }}>{formatUKTime(event.start_time)}</span>
                          {event.so_pick && <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: 600 }}>SO PICK</span>}
                          {event.sold_out && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>SOLD OUT</span>}
                        </div>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</h3>
                        {event.brand && <p style={{ fontSize: '11px', color: '#ab67f7', margin: 0 }}>by {event.brand.name}</p>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.venue?.name || 'Venue TBC'}</span>
                          {formatPrice(event.price_min, event.price_max) && <span style={{ fontSize: '12px', color: '#6b7280' }}>{formatPrice(event.price_min, event.price_max)}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
      <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', borderRadius: '24px', background: 'rgba(10,10,11,0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', zIndex: 40 }}>
        <span style={{ fontSize: '13px', color: '#9ca3af' }}>
          <span style={{ color: '#ab67f7', fontWeight: 700 }}>{filtered.length}</span>
          {' '}events {filterLabel}
        </span>
      </div>
    </div>
  )
}
