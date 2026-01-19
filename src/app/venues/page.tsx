'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

type Venue = {
  id: string
  name: string
  address: string
  venue_type: string
  lat: number
  lng: number
  image_url: string | null
  instagram_url: string | null
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('All')

  useEffect(() => {
    const loadVenues = async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('name')

      if (data) {
        setVenues(data)
      }
      setLoading(false)
    }
    loadVenues()
  }, [])

  const types = ['All', ...Array.from(new Set(venues.map(v => v.venue_type)))]
  const filtered = filter === 'All' ? venues : venues.filter(v => v.venue_type === filter)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', paddingBottom: '80px' }}>
      {/* Header with TEXT LOGO */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'rgba(10,10,11,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ padding: '16px 20px' }}>
          {/* TEXT LOGO - Instead of pin */}
          {/* Header - SAME AS SAVED PAGE */}
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
    {/* TEXT LOGO */}
    <img 
      src="/logo.svg" 
      alt="Sounded Out" 
      style={{ height: '22px', width: 'auto', marginBottom: '16px' }} 
    />
    
    {/* Tab Navigation - CONSISTENT */}
    <div style={{ 
      display: 'flex', 
      gap: '8px',
      marginBottom: '16px',
      overflowX: 'auto',
      scrollbarWidth: 'none',
    }}>
      <Link href="/" style={{ padding: '10px 18px', minHeight: '40px', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', color: '#999', textDecoration: 'none', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        Events
      </Link>
      <Link href="/venues" style={{ padding: '10px 18px', minHeight: '40px', background: 'linear-gradient(135deg, #ab67f7, #c490ff)', borderRadius: '20px', color: 'white', textDecoration: 'none', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(171,103,247,0.3)' }}>
        Venues
      </Link>
      <Link href="/saved" style={{ padding: '10px 18px', minHeight: '40px', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', color: '#999', textDecoration: 'none', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        Saved
      </Link>
    </div>
  </div>

        {/* Venue Type Filters */}
        <div style={{ padding: '0 20px 16px', overflowX: 'auto', display: 'flex', gap: '8px' }}>
          {types.map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: filter === type ? '2px solid #ab67f7' : '1px solid rgba(255,255,255,0.15)',
                background: filter === type ? 'rgba(171,103,247,0.2)' : 'transparent',
                color: filter === type ? '#ab67f7' : '#999',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Venues</h1>
        <p style={{ fontSize: '15px', color: '#999', marginBottom: '24px' }}>
          Explore nightlife venues in Newcastle
        </p>

        <p style={{ fontSize: '13px', color: '#ab67f7', fontWeight: 700, marginBottom: '16px' }}>
          {filtered.length} venues
        </p>

        {/* Venue Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(venue => (
            <Link
              key={venue.id}
              href={`/venue/${venue.id}`}
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
              {/* Venue Icon/Image */}
              <div style={{
                width: '64px',
                height: '64px',
                minWidth: '64px',
                borderRadius: '12px',
                background: venue.image_url 
                  ? `url(${venue.image_url})` 
                  : 'linear-gradient(135deg, rgba(171,103,247,0.3), rgba(171,103,247,0.1))',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}>
                {!venue.image_url && '🎵'}
              </div>

              {/* Venue Info */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
                  {venue.name}
                </h3>
                <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>
                  {venue.address}
                </p>
                <span style={{
                  padding: '4px 10px',
                  background: 'rgba(171,103,247,0.15)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#ab67f7',
                  display: 'inline-block',
                }}>
                  {venue.venue_type}
                </span>
              </div>

              {/* Arrow */}
              <div style={{ display: 'flex', alignItems: 'center', color: '#666' }}>
                →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
