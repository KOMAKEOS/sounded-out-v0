'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import NavBar from '../../components/NavBar'

interface Venue {
  id: string
  name: string
  address: string
  venue_type: string | null
  instagram_url: string | null
  is_verified: boolean
  is_claimed: boolean
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  useEffect(() => {
    const loadVenues = async () => {
      const { data } = await supabase
        .from('venues')
        .select('*')
        .order('name')

      if (data) {
        setVenues(data as Venue[])
      }
      setLoading(false)
    }
    loadVenues()
  }, [])

  // Get venue types
  const types = [...new Set(venues.map(v => v.venue_type).filter(Boolean))] as string[]

  const filtered = typeFilter 
    ? venues.filter(v => v.venue_type === typeFilter)
    : venues

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white' }}>
      <NavBar />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Venues</h1>
        <p style={{ fontSize: '15px', color: '#888', marginBottom: '24px' }}>
          Explore nightlife venues in Newcastle
        </p>

        {/* Type Filters */}
        {types.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
            <button
              onClick={() => setTypeFilter(null)}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: !typeFilter ? '2px solid #ab67f7' : '1px solid rgba(255,255,255,0.1)',
                background: !typeFilter ? 'rgba(171,103,247,0.15)' : 'transparent',
                color: !typeFilter ? '#ab67f7' : '#888',
                fontSize: '14px',
                fontWeight: !typeFilter ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              All
            </button>
            {types.map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: typeFilter === type ? '2px solid #ab67f7' : '1px solid rgba(255,255,255,0.1)',
                  background: typeFilter === type ? 'rgba(171,103,247,0.15)' : 'transparent',
                  color: typeFilter === type ? '#ab67f7' : '#888',
                  fontSize: '14px',
                  fontWeight: typeFilter === type ? 600 : 500,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {/* Venue Count */}
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
          <span style={{ color: '#ab67f7', fontWeight: 700 }}>{filtered.length}</span> venues
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
            <p style={{ color: '#888' }}>Loading venues...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px' 
          }}>
            {filtered.map((venue) => (
              <Link
                key={venue.id}
                href={`/venue/${venue.id}`}
                style={{
                  display: 'block',
                  padding: '20px',
                  background: '#141416',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  textDecoration: 'none',
                  color: 'white',
                  transition: 'border-color 150ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(171,103,247,0.2), rgba(171,103,247,0.1))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                  }}>
                    🎵
                  </div>
                  {venue.is_verified && (
                    <span style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#ab67f7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: 'white',
                    }}>
                      ✓
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>
                  {venue.name}
                </h3>
                <p style={{ fontSize: '14px', color: '#888', marginBottom: '10px' }}>
                  {venue.address}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {venue.venue_type && (
                    <span style={{
                      fontSize: '11px',
                      color: '#ab67f7',
                      background: 'rgba(171,103,247,0.1)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      textTransform: 'capitalize',
                    }}>
                      {venue.venue_type}
                    </span>
                  )}
                  {venue.instagram_url && (
                    <span style={{ fontSize: '14px' }}>📸</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
