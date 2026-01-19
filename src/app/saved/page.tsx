'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

type SavedEvent = {
  id: string
  event_id: string
  event: {
    id: string
    title: string
    start_time: string
    venue: { name: string }
    image_url: string | null
    genres: string | null
  }
}

export default function SavedPage() {
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      
      if (data.user) {
        // Load saved events from database
        const { data: saved } = await supabase
          .from('saved_events')
          .select('id, event_id, event:events(id, title, start_time, venue:venues(name), image_url, genres)')
          .eq('user_id', data.user.id)
          .order('created_at', { ascending: false })
        
        if (saved) setSavedEvents(saved as any)
      }
      setLoading(false)
    }
    loadUser()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'rgba(10,10,11,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
      }}>
        <div style={{ padding: '12px 20px 16px' }}>
          <img src="/logo.svg" alt="Sounded Out" style={{ height: '22px', width: 'auto', marginBottom: '16px' }} />
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            <Link href="/" style={{ padding: '10px 18px', minHeight: '40px', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', color: '#999', textDecoration: 'none', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              Events
            </Link>
            <Link href="/venues" style={{ padding: '10px 18px', minHeight: '40px', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', color: '#999', textDecoration: 'none', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              Venues
            </Link>
            <Link href="/saved" style={{ padding: '10px 18px', minHeight: '40px', background: 'linear-gradient(135deg, #ab67f7, #c490ff)', borderRadius: '20px', color: 'white', textDecoration: 'none', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(171,103,247,0.3)' }}>
              Saved
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>💜 Saved Events</h1>
        
        {!user ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
              Sign in to save events
            </p>
            <Link href="/login" style={{ padding: '14px 28px', background: '#ab67f7', borderRadius: '12px', color: 'white', textDecoration: 'none', fontSize: '15px', fontWeight: 700, display: 'inline-block' }}>
              Sign In
            </Link>
          </div>
        ) : savedEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.3 }}>💜</div>
            <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
              No saved events yet
            </p>
            <Link href="/" style={{ padding: '14px 28px', background: '#ab67f7', borderRadius: '12px', color: 'white', textDecoration: 'none', fontSize: '15px', fontWeight: 700, display: 'inline-block' }}>
              Browse Events
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {savedEvents.map(saved => (
              <Link
                key={saved.id}
                href={`/event/${saved.event.id}`}
                style={{
                  display: 'flex',
                  gap: '14px',
                  padding: '14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  color: 'white',
                }}
              >
                <div style={{ width: '64px', height: '64px', minWidth: '64px', borderRadius: '12px', background: saved.event.image_url ? `url(${saved.event.image_url})` : 'linear-gradient(135deg, rgba(171,103,247,0.3), rgba(171,103,247,0.1))', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{saved.event.title}</h3>
                  <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>{saved.event.venue.name}</p>
                  <p style={{ fontSize: '12px', color: '#ab67f7' }}>
                    {new Date(saved.event.start_time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
