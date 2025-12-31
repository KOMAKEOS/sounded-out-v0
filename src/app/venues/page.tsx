'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type Venue = {
  id: string
  name: string
  address: string
  venue_type: string | null
  image_url: string | null
  instagram_url: string | null
  website_url: string | null
  no_phones: boolean
  is_verified: boolean
  event_count?: number
}

const VENUE_TYPES = ['club', 'bar', 'pub', 'rooftop', 'warehouse', 'festival']

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const loadVenues = async () => {
      const { data } = await supabase
        .from('venues')
        .select('id, name, address, venue_type, image_url, instagram_url, website_url, no_phones, is_verified')
        .order('name')
      
      if (data) {
        // Get event counts for each venue
        const venuesWithCounts = await Promise.all(
          data.map(async (venue) => {
            const { count } = await supabase
              .from('events')
              .select('id', { count: 'exact', head: true })
              .eq('venue_id', venue.id)
              .eq('status', 'published')
              .gte('start_time', new Date().toISOString().split('T')[0])
            
            return { ...venue, event_count: count || 0 }
          })
        )
        setVenues(venuesWithCounts)
      }
      setLoading(false)
    }
    loadVenues()
  }, [])

  // Get available venue types (deduplicated and normalized)
  const availableTypes = useMemo(() => {
    const typeSet = new Set<string>()
    venues.forEach(v => {
      if (v.venue_type) {
        // Normalize: lowercase, trim, and take first word if comma-separated
        const normalized = v.venue_type.toLowerCase().trim().split(',')[0].trim()
        if (normalized && VENUE_TYPES.includes(normalized)) {
          typeSet.add(normalized)
        }
      }
    })
    // Return in predefined order
    return VENUE_TYPES.filter(t => typeSet.has(t))
  }, [venues])

  const filtered = useMemo(() => {
    let result = venues
    
    if (typeFilter) {
      result = result.filter(v => 
        v.venue_type?.toLowerCase().includes(typeFilter)
      )
    }
    
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(v => 
        v.name.toLowerCase().includes(q) || 
        v.address?.toLowerCase().includes(q)
      )
    }
    
    // Sort by event count (venues with upcoming events first)
    return result.sort((a, b) => (b.event_count || 0) - (a.event_count || 0))
  }, [venues, typeFilter, search])

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a0b', 
      color: 'white',
      paddingBottom: '60px',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 20px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        background: '#0a0a0b',
        zIndex: 10,
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <img src="/logo.svg" alt="Sounded Out" style={{ height: '24px' }} />
            </Link>
            <div style={{ display: 'flex', gap: '16px' }}>
              <Link href="/events" style={{ color: '#888', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Events</Link>
              <Link href="/saved" style={{ color: '#888', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Saved</Link>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>Venues</h1>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
          Clubs, bars, and spaces in Newcastle
        </p>

        {/* Search */}
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search venues..."
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#141416',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {/* Type Filters */}
        {availableTypes.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button
              onClick={() => setTypeFilter(null)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: !typeFilter ? '#ab67f7' : 'rgba(255,255,255,0.06)',
                color: !typeFilter ? 'white' : '#888',
                fontSize: '13px',
                fontWeight: !typeFilter ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              All
            </button>
            {availableTypes.map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: typeFilter === type ? '#ab67f7' : 'rgba(255,255,255,0.06)',
                  color: typeFilter === type ? 'white' : '#888',
                  fontSize: '13px',
                  fontWeight: typeFilter === type ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  textTransform: 'capitalize',
                }}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {/* Results count */}
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
          {filtered.length} venue{filtered.length !== 1 ? 's' : ''}
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🏢</div>
            <p style={{ fontSize: '16px', color: '#888', marginBottom: '8px' }}>No venues found</p>
            <p style={{ fontSize: '14px', color: '#666' }}>Try adjusting your search</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filtered.map(venue => (
              <Link 
                key={venue.id}
                href={`/venue/${venue.id}`}
                style={{
                  display: 'block',
                  background: '#141416',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  textDecoration: 'none',
                  color: 'white',
                }}
              >
                {/* Image */}
                {venue.image_url ? (
                  <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
                    <img 
                      src={venue.image_url} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                ) : (
                  <div style={{ 
                    width: '100%', 
                    aspectRatio: '16/9', 
                    background: 'linear-gradient(135deg, #1a1a1f 0%, #252530 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#333',
                    fontSize: '32px',
                  }}>
                    ♪
                  </div>
                )}
                
                {/* Content */}
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                      {venue.name}
                    </h3>
                    {venue.is_verified && (
                      <span style={{ 
                        width: '16px', 
                        height: '16px', 
                        background: '#ab67f7', 
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        color: 'white',
                      }}>✓</span>
                    )}
                  </div>
                  
                  <p style={{ fontSize: '13px', color: '#888', marginBottom: '10px' }}>
                    {venue.address}
                  </p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {venue.venue_type && (
                      <span style={{ 
                        fontSize: '11px', 
                        color: '#ab67f7',
                        background: 'rgba(171,103,247,0.12)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        textTransform: 'capitalize',
                      }}>
                        {venue.venue_type.split(',')[0].trim()}
                      </span>
                    )}
                    {venue.no_phones && (
                      <span style={{ fontSize: '12px', color: '#ffc832' }}>
                        No phones
                      </span>
                    )}
                    {(venue.event_count || 0) > 0 && (
                      <span style={{ fontSize: '11px', color: '#666' }}>
                        {venue.event_count} upcoming
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
