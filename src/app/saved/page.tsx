'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PageLayout from '../../components/PageLayout'
import { supabase } from '../../lib/supabase'

type SavedEvent = {
  id: string
  event_id: string
  event: {
    id: string
    title: string
    start_time: string
    image_url: string | null
    event_url: string | null
    sold_out: boolean
    venue: {
      name: string
    }
  }
}

export default function SavedPage() {
  const router = useRouter()
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login')
      } else {
        setUser(data.user)
        loadSavedEvents(data.user.id)
      }
    })
  }, [router])

  const loadSavedEvents = async (userId: string) => {
    const { data } = await supabase
      .from('saved_events')
      .select('id, event_id, event:events(id, title, start_time, image_url, event_url, sold_out, venue:venues(name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (data) setSavedEvents(data as any)
    setLoading(false)
  }

  const removeSaved = async (id: string) => {
    await supabase.from('saved_events').delete().eq('id', id)
    setSavedEvents(savedEvents.filter(s => s.id !== id))
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (d.toDateString() === now.toDateString()) return 'Today'
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const isPast = (date: string) => new Date(date) < new Date()

  const groupByDate = (events: SavedEvent[]) => {
    const groups: Record<string, SavedEvent[]> = {}
    events.forEach(item => {
      if (isPast(item.event.start_time)) {
        if (!groups['Past']) groups['Past'] = []
        groups['Past'].push(item)
      } else {
        const label = formatDate(item.event.start_time)
        if (!groups[label]) groups[label] = []
        groups[label].push(item)
      }
    })
    return groups
  }

  const grouped = groupByDate(savedEvents)
  const upcomingCount = savedEvents.filter(s => !isPast(s.event.start_time)).length

  if (!user && !loading) {
    return null // Redirecting
  }

  return (
    <PageLayout maxWidth="600px">
      <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
        Saved
      </h1>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '32px' }}>
        {upcomingCount} upcoming event{upcomingCount !== 1 ? 's' : ''}
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>
          Loading...
        </div>
      ) : savedEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
            No saved events
          </p>
          <p style={{ fontSize: '14px', color: '#555', marginBottom: '24px' }}>
            Events you save will appear here
          </p>
          <Link
            href="/"
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
            Explore events
          </Link>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date} style={{ marginBottom: '32px' }}>
            <h2 style={{ 
              fontSize: '13px', 
              fontWeight: 600, 
              color: date === 'Past' ? '#555' : '#888', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              {date}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {items.map(item => (
                <div 
                  key={item.id}
                  style={{
                    display: 'flex',
                    gap: '16px',
                    padding: '16px',
                    background: '#141416',
                    borderRadius: '12px',
                    opacity: isPast(item.event.start_time) ? 0.5 : 1,
                  }}
                >
                  {item.event.image_url ? (
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      <img 
                        src={item.event.image_url} 
                        alt="" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                  ) : (
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '8px',
                      background: '#1e1e24',
                      flexShrink: 0,
                    }} />
                  )}
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 600, marginBottom: '4px' }}>
                      {formatTime(item.event.start_time)}
                    </p>
                    <Link 
                      href={`/event/${item.event.id}`}
                      style={{ 
                        fontSize: '16px', 
                        fontWeight: 600, 
                        color: 'white', 
                        textDecoration: 'none',
                        display: 'block',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.event.title}
                    </Link>
                    <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
                      {item.event.venue?.name}
                    </p>
                    
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {item.event.event_url && !isPast(item.event.start_time) && (
                        <a
                          href={item.event.event_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '8px 14px',
                            background: item.event.sold_out ? 'rgba(255,255,255,0.1)' : '#ab67f7',
                            borderRadius: '8px',
                            color: item.event.sold_out ? '#888' : 'white',
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          {item.event.sold_out ? 'Sold out' : 'Get tickets'}
                        </a>
                      )}
                      <button
                        onClick={() => removeSaved(item.id)}
                        style={{
                          padding: '8px 14px',
                          background: 'transparent',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          color: '#888',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </PageLayout>
  )
}
