'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { supabase, Event, Venue } from '@/lib/supabase'

type EventWithVenue = Event & { venue: Venue }

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [events, setEvents] = useState<EventWithVenue[]>([])
  const [selectedEvent, setSelectedEvent] = useState<EventWithVenue | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadEvents() {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          venue:venues(*)
        `)
        .eq('status', 'published')
        .gte('start_time', new Date().toISOString().split('T')[0])
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error loading events:', error)
      } else {
        setEvents(data as EventWithVenue[])
      }
      setLoading(false)
    }

    loadEvents()
  }, [])

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-1.6178, 54.9783],
      zoom: 13,
      pitch: 0,
    })

    return () => {
      map.current?.remove()
    }
  }, [])

  useEffect(() => {
    if (!map.current || events.length === 0) return

    const venueEvents = events.reduce((acc, event) => {
      if (!event.venue) return acc
      const venueId = event.venue.id
      if (!acc[venueId]) {
        acc[venueId] = { venue: event.venue, events: [] }
      }
      acc[venueId].events.push(event)
      return acc
    }, {} as Record<string, { venue: Venue; events: EventWithVenue[] }>)

    Object.values(venueEvents).forEach(({ venue, events: venueEventList }) => {
      const el = document.createElement('div')
      el.className = 'custom-marker'
      el.innerHTML = `
        <div style="
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #ff3366 0%, #ff6b35 100%);
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 4px 12px rgba(255, 51, 102, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          font-weight: bold;
          color: white;
          transition: transform 0.2s ease;
        ">${venueEventList.length > 1 ? venueEventList.length : ''}</div>
      `

      el.addEventListener('mouseenter', () => {
        el.querySelector('div')!.style.transform = 'scale(1.2)'
      })
      el.addEventListener('mouseleave', () => {
        el.querySelector('div')!.style.transform = 'scale(1)'
      })

      el.addEventListener('click', () => {
        setSelectedEvent(venueEventList[0])
        map.current?.flyTo({
          center: [venue.lng, venue.lat],
          zoom: 15,
          duration: 500
        })
      })

      new mapboxgl.Marker(el)
        .setLngLat([venue.lng, venue.lat])
        .addTo(map.current!)
    })
  }, [events])

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Tonight'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const formatPrice = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Free / TBC'
    if (min && max && min !== max) return `£${min}–£${max}`
    return `£${min || max}`
  }

  return (
    <main style={{ height: '100vh', width: '100vw', position: 'relative' }}>
      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />

      <header style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '16px 20px',
        background: 'linear-gradient(to bottom, rgba(10,10,11,0.95) 0%, rgba(10,10,11,0) 100%)',
        zIndex: 10,
      }}>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: '24px',
          fontWeight: 800,
          letterSpacing: '-0.5px',
        }}>
          SOUNDED OUT
        </h1>
        <p style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          marginTop: '2px',
        }}>
          Newcastle · {formatDate(new Date().toISOString())}
        </p>
      </header>

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to top, rgba(10,10,11,0.98) 0%, rgba(10,10,11,0.9) 80%, rgba(10,10,11,0) 100%)',
        padding: '60px 16px 24px',
        zIndex: 10,
      }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
            Loading events...
          </p>
        ) : events.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
            No events found
          </p>
        ) : (
          <div style={{
            display: 'flex',
            gap: '12px',
            overflowX: 'auto',
            paddingBottom: '8px',
          }}>
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => {
                  setSelectedEvent(event)
                  if (event.venue) {
                    map.current?.flyTo({
                      center: [event.venue.lng, event.venue.lat],
                      zoom: 15,
                      duration: 500
                    })
                  }
                }}
                style={{
                  flexShrink: 0,
                  width: '200px',
                  padding: '14px',
                  background: selectedEvent?.id === event.id ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                  border: selectedEvent?.id === event.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  color: 'var(--text-primary)',
                }}
              >
                <p style={{
                  fontSize: '10px',
                  color: 'var(--accent)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}>
                  {formatDate(event.start_time)} · {formatTime(event.start_time)}
                </p>
                <p style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: "'Syne', sans-serif",
                  marginBottom: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {event.title}
                </p>
                <p style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {event.venue?.name || 'Venue TBC'}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedEvent && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 20,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              background: 'var(--bg-card)',
              borderRadius: '20px 20px 0 0',
              padding: '24px',
              maxHeight: '70vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '40px',
              height: '4px',
              background: 'var(--border)',
              borderRadius: '2px',
              margin: '0 auto 20px',
            }} />

            <p style={{
              fontSize: '11px',
              color: 'var(--accent)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
            }}>
              {formatDate(selectedEvent.start_time)} · {formatTime(selectedEvent.start_time)}
              {selectedEvent.end_time && ` – ${formatTime(selectedEvent.end_time)}`}
            </p>

            <h2 style={{
              fontSize: '28px',
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              marginBottom: '8px',
              lineHeight: 1.1,
            }}>
              {selectedEvent.title}
            </h2>

            <p style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
            }}>
              {selectedEvent.venue?.name}
              {selectedEvent.venue?.address && (
                <span style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>
                  {selectedEvent.venue.address}
                </span>
              )}
            </p>

            {selectedEvent.genres && (
              <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                marginBottom: '20px',
              }}>
                {selectedEvent.genres.split(',').map((genre, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--genre-bg)',
                      borderRadius: '20px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {genre.trim()}
                  </span>
                ))}
              </div>
            )}

            <p style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '24px',
            }}>
              {formatPrice(selectedEvent.price_min, selectedEvent.price_max)}
            </p>

            {selectedEvent.event_url && (
              
                href={selectedEvent.event_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #ff3366 0%, #ff6b35 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 700,
                  fontFamily: "'Syne', sans-serif",
                  color: 'white',
                  textAlign: 'center',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px var(--accent-glow)',
                }}
              >
                GET TICKETS →
              </a>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
