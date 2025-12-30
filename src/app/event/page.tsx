'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import PageLayout from '../../components/PageLayout'
import { supabase } from '../../lib/supabase'

type Event = {
  id: string
  title: string
  start_time: string
  image_url: string | null
  event_url: string | null
  genres: string | null
  price_min: number | null
  price_max: number | null
  sold_out: boolean
  so_pick: boolean
  venue: {
    id: string
    name: string
  }
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'weekend'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase
      .from('events')
      .select('id, title, start_time, image_url, event_url, genres, price_min, price_max, sold_out, so_pick, venue:venues(id, name)')
      .eq('status', 'published')
      .gte('start_time', new Date().toISOString().split('T')[0])
      .order('start_time')
      .then((response) => {
        if (response.data) setEvents(response.data as any)
        setLoading(false)
      })
  }, [])

  const isToday = (date: string) => new Date(date).toDateString() === new Date().toDateString()
  
  const isTomorrow = (date: string) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return new Date(date).toDateString() === tomorrow.toDateString()
  }
  
  const isWeekend = (date: string) => {
    const d = new Date(date)
    const day = d.getDay()
    return day === 5 || day === 6 || day === 0
  }

  const filtered = useMemo(() => {
    let result = events
    
    if (dateFilter === 'today') result = result.filter(e => isToday(e.start_time))
    if (dateFilter === 'tomorrow') result = result.filter(e => isTomorrow(e.start_time))
    if (dateFilter === 'weekend') result = result.filter(e => isWeekend(e.start_time))
    
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(e => 
        e.title.toLowerCase().includes(q) || 
        e.venue?.name?.toLowerCase().includes(q) ||
        e.genres?.toLowerCase().includes(q)
      )
    }
    
    return result
  }, [events, dateFilter, search])

  const formatDate = (date: string) => {
    const d = new Date(date)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatPrice = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Free'
    if (min === 0) return 'Free'
    if (min && max && min !== max) return `£${min}–£${max}`
    return `£${min || max}`
  }

  const groupByDate = (events: Event[]) => {
    const groups: Record<string, Event[]> = {}
    events.forEach(e => {
      const label = formatDate(e.start_time)
      if (!groups[label]) groups[label] = []
      groups[label].push(e)
    })
    return groups
  }

  const grouped = groupByDate(filtered)

  return (
    <PageLayout maxWidth="900px">
      <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
        Events
      </h1>
      <p style={{ fontSize: '15px', color: '#666', marginBottom: '32px' }}>
        All upcoming events in Newcastle
      </p>

      {/* Search */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events, venues, genres..."
          style={{
            width: '100%',
            padding: '14px 16px',
            background: '#141416',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: 'white',
            fontSize: '15px',
            outline: 'none',
          }}
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {(['all', 'today', 'tomorrow', 'weekend'] as const).map(f => (
          <button
            key={f}
            onClick={() => setDateFilter(f)}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              background: dateFilter === f ? '#ab67f7' : 'rgba(255,255,255,0.08)',
              color: dateFilter === f ? 'white' : '#888',
              fontSize: '14px',
              fontWeight: dateFilter === f ? 600 : 400,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {f === 'all' ? 'All upcoming' : f}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
        {filtered.length} event{filtered.length !== 1 ? 's' : ''}
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
            No events found
          </p>
          <p style={{ fontSize: '14px', color: '#555' }}>
            Try adjusting your filters
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date} style={{ marginBottom: '32px' }}>
            <h2 style={{ 
              fontSize: '13px', 
              fontWeight: 600, 
              color: '#888', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              {date}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {items.map(event => (
                <Link 
                  key={event.id}
                  href={`/event/${event.id}`}
                  style={{
                    display: 'flex',
                    gap: '16px',
                    padding: '16px',
                    background: '#141416',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    color: 'white',
                    transition: 'background 150ms ease',
                  }}
                >
                  {event.image_url ? (
                    <div style={{
                      width: '100px',
                      height: '100px',
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
                      width: '100px',
                      height: '100px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #1e1e24, #252530)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#444',
                      fontSize: '12px',
                    }}>
                      {event.genres?.split(',')[0]?.trim() || 'Event'}
                    </div>
                  )}
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 600, marginBottom: '6px' }}>
                      {formatTime(event.start_time)}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      {event.so_pick && (
                        <img src="/so-icon.png" alt="" style={{ height: '14px', width: 'auto' }} />
                      )}
                      <h3 style={{ 
                        fontSize: '17px', 
                        fontWeight: 600, 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {event.title}
                      </h3>
                    </div>
                    <p style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
                      {event.venue?.name}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {event.sold_out && (
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: 600, 
                          color: '#f87171', 
                          background: 'rgba(248,113,113,0.15)', 
                          padding: '4px 8px', 
                          borderRadius: '4px' 
                        }}>
                          Sold out
                        </span>
                      )}
                      <span style={{ 
                        fontSize: '12px', 
                        color: (event.price_min === 0 || (!event.price_min && !event.price_max)) ? '#22c55e' : '#888',
                        fontWeight: 500,
                      }}>
                        {formatPrice(event.price_min, event.price_max)}
                      </span>
                      {event.genres && (
                        <>
                          <span style={{ color: '#333' }}>·</span>
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {event.genres.split(',')[0]?.trim()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </PageLayout>
  )
}
