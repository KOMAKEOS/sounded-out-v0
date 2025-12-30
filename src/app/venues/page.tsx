'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PageLayout from '../../components/PageLayout'
import { supabase } from '../../lib/supabase'

type Venue = {
  id: string
  name: string
  address: string
  venue_type: string
  instagram_url: string | null
  is_claimed: boolean
  is_verified: boolean
  event_count?: number
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    // Get venues with event counts
    supabase
      .from('venues')
      .select('*')
      .order('name')
      .then(async ({ data: venueData }) => {
        if (venueData) {
          // Get event counts for each venue
          const { data: eventCounts } = await supabase
            .from('events')
            .select('venue_id')
            .eq('status', 'published')
            .gte('start_time', new Date().toISOString().split('T')[0])
          
          const countMap = new Map<string, number>()
          eventCounts?.forEach(e => {
            countMap.set(e.venue_id, (countMap.get(e.venue_id) || 0) + 1)
          })
          
          const venuesWithCounts = venueData.map(v => ({
            ...v,
            event_count: countMap.get(v.id) || 0,
          }))
          
          // Sort by event count (venues with events first)
          venuesWithCounts.sort((a, b) => b.event_count - a.event_count)
          
          setVenues(venuesWithCounts)
        }
        setLoading(false)
      })
  }, [])

  const venueTypes = [...new Set(venues.map(v => v.venue_type).filter(Boolean))]

  const filtered = venues.filter(v => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter !== 'all' && v.venue_type !== typeFilter) return false
    return true
  })

  return (
    <PageLayout maxWidth="900px">
      <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
        Venues
      </h1>
      <p style={{ fontSize: '15px', color: '#666', marginBottom: '32px' }}>
        Clubs, bars, and live music venues in Newcastle
      </p>

      {/* Search */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search venues..."
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

      {/* Type filters */}
      {venueTypes.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setTypeFilter('all')}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              background: typeFilter === 'all' ? '#ab67f7' : 'rgba(255,255,255,0.08)',
              color: typeFilter === 'all' ? 'white' : '#888',
              fontSize: '14px',
              fontWeight: typeFilter === 'all' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            All
          </button>
          {venueTypes.map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                background: typeFilter === type ? '#ab67f7' : 'rgba(255,255,255,0.08)',
                color: typeFilter === type ? 'white' : '#888',
                fontSize: '14px',
                fontWeight: typeFilter === type ? 600 : 400,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
        {filtered.length} venue{filtered.length !== 1 ? 's' : ''}
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
            No venues found
          </p>
          <p style={{ fontSize: '14px', color: '#555' }}>
            Try adjusting your search
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {filtered.map(venue => (
            <Link
              key={venue.id}
              href={`/venue/${venue.id}`}
              style={{
                padding: '20px',
                background: '#141416',
                borderRadius: '12px',
                textDecoration: 'none',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 600, flex: 1 }}>
                  {venue.name}
                </h3>
                {venue.is_verified && (
                  <span style={{ 
                    width: '18px', 
                    height: '18px', 
                    background: '#ab67f7', 
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: 'white',
                    flexShrink: 0,
                  }}>✓</span>
                )}
              </div>
              
              <p style={{ fontSize: '13px', color: '#888' }}>
                {venue.address}
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                {venue.venue_type && (
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    textTransform: 'capitalize',
                  }}>
                    {venue.venue_type}
                  </span>
                )}
                {venue.event_count > 0 && (
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#ab67f7',
                    fontWeight: 500,
                  }}>
                    {venue.event_count} upcoming
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageLayout>
  )
}
