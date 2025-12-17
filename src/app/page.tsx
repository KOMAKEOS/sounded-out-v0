'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import { supabase } from '../lib/supabase'

type Venue = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  venue_type: string
  instagram_url: string | null
}

type Event = {
  id: string
  venue_id: string
  title: string
  start_time: string
  end_time: string | null
  genres: string | null
  vibe: string | null
  event_url: string | null
  image_url: string | null
  price_min: number | null
  price_max: number | null
  venue?: Venue
}

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showList, setShowList] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedEventIndex, setSelectedEventIndex] = useState(0)

  // Date helpers
  const isTonight = (dateStr: string) => {
    const eventDate = new Date(dateStr).toDateString()
    const today = new Date().toDateString()
    return eventDate === today
  }

  const isTomorrow = (dateStr: string) => {
    const eventDate = new Date(dateStr).toDateString()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return eventDate === tomorrow.toDateString()
  }

  const getDateLabel = (dateStr: string) => {
    if (isTonight(dateStr)) return 'Tonight'
    if (isTomorrow(dateStr)) return 'Tomorrow'
    return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  // Filter events for tonight only (for pins and count)
  const tonightEvents = useMemo(() => {
    return events.filter(e => isTonight(e.start_time))
  }, [events])

  // Group events by date for the list
  const groupedEvents = useMemo(() => {
    const groups: { [key: string]: Event[] } = {}
    events.forEach(event => {
      const label = getDateLabel(event.start_time)
      if (!groups[label]) groups[label] = []
      groups[label].push(event)
    })
    return groups
  }, [events])

  // Load events from Supabase
  useEffect(() => {
    async function loadEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('*, venue:venues(*)')
        .eq('status', 'published')
        .gte('start_time', new Date().toISOString().split('T')[0])
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error loading events:', error)
      } else {
        setEvents(data as Event[])
      }
      setLoading(false)
    }
    loadEvents()
  }, [])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-1.6178, 54.9783],
      zoom: 14
    })

    return () => {
      if (map.current) map.current.remove()
    }
  }, [])

  // Add markers - ONLY tonight's events
  useEffect(() => {
    if (!map.current || tonightEvents.length === 0) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    tonightEvents.forEach((event, index) => {
      if (!event.venue) return

      const el = document.createElement('div')
      el.style.cursor = 'pointer'
      el.style.width = '32px'
      el.style.height = '42px'
      
      el.innerHTML = `
        <svg viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 8px rgba(171, 103, 247, 0.6));">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="url(#grad${index})"/>
          <circle cx="12" cy="12" r="5" fill="white"/>
          <defs>
            <linearGradient id="grad${index}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#ab67f7"/>
              <stop offset="100%" style="stop-color:#d7b3ff"/>
            </linearGradient>
          </defs>
        </svg>
      `

      el.onclick = () => {
        const eventIndex = events.findIndex(e => e.id === event.id)
        setSelectedEventIndex(eventIndex)
        setSelectedEvent(event)
        setShowList(false)
        if (map.current && event.venue) {
          map.current.flyTo({
            center: [event.venue.lng, event.venue.lat],
            zoom: 15,
            duration: 800
          })
        }
      }

      const marker = new mapboxgl.Marker(el)
        .setLngLat([event.venue.lng, event.venue.lat])
        .addTo(map.current as mapboxgl.Map)
      
      markersRef.current.push(marker)
    })
  }, [tonightEvents, events])

  // Navigation between events
  const goToPrevEvent = () => {
    if (selectedEventIndex > 0) {
      const newIndex = selectedEventIndex - 1
      setSelectedEventIndex(newIndex)
      setSelectedEvent(events[newIndex])
      if (map.current && events[newIndex].venue) {
        map.current.flyTo({
          center: [events[newIndex].venue!.lng, events[newIndex].venue!.lat],
          zoom: 15,
          duration: 500
        })
      }
    }
  }

  const goToNextEvent = () => {
    if (selectedEventIndex < events.length - 1) {
      const newIndex = selectedEventIndex + 1
      setSelectedEventIndex(newIndex)
      setSelectedEvent(events[newIndex])
      if (map.current && events[newIndex].venue) {
        map.current.flyTo({
          center: [events[newIndex].venue!.lng, events[newIndex].venue!.lat],
          zoom: 15,
          duration: 500
        })
      }
    }
  }

  // Format helpers
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Free / TBC'
    if (min === 0 && !max) return 'Free'
    if (min && max && min !== max) return `£${min} – £${max}`
    return `£${min || max}`
  }

  const getGoogleMapsUrl = (venue: Venue) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`
  }

  return (
    // Outer container - centers content on desktop
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a0b',
      display: 'flex',
      justifyContent: 'center'
    }}>
      {/* App container - max width for desktop, full width for mobile */}
      <main style={{ 
        height: '100vh', 
        width: '100%',
        maxWidth: '480px',
        position: 'relative', 
        overflow: 'hidden', 
        background: '#0a0a0b'
      }}>
        {/* Full screen map */}
        <div ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

        {/* Floating header */}
        <header style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '50px 20px 24px',
          background: 'linear-gradient(to bottom, rgba(10,10,11,0.95) 0%, rgba(10,10,11,0.8) 60%, transparent 100%)',
          zIndex: 10,
          pointerEvents: 'none'
        }}>
          <h1 style={{ 
            fontFamily: 'system-ui, -apple-system, sans-serif', 
            fontSize: '22px', 
            fontWeight: 800,
            letterSpacing: '-0.5px',
            pointerEvents: 'auto'
          }}>
            SOUNDED OUT
          </h1>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>Newcastle</p>
        </header>

        {/* Bottom bar - tap to expand */}
        {!showList && !selectedEvent && (
          <div 
            onClick={() => setShowList(true)}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '30px 20px 34px',
              background: 'linear-gradient(to top, rgba(10,10,11,1) 0%, rgba(10,10,11,0.95) 70%, transparent 100%)',
              zIndex: 10,
              cursor: 'pointer'
            }}
          >
            <div style={{
              background: '#1e1e24',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '15px', fontWeight: 500 }}>
                <span style={{ color: '#ab67f7', fontWeight: 700 }}>{loading ? '...' : tonightEvents.length}</span>
                {' '}{tonightEvents.length === 1 ? 'event' : 'events'} tonight
              </span>
              <span style={{ color: '#ab67f7', fontSize: '18px' }}>↑</span>
            </div>
          </div>
        )}

        {/* Bottom sheet - event list with date headers */}
        {showList && !selectedEvent && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#141416',
            borderRadius: '24px 24px 0 0',
            padding: '12px 16px 34px',
            zIndex: 20,
            maxHeight: '70vh',
            overflowY: 'auto',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            {/* Handle */}
            <div 
              onClick={() => setShowList(false)}
              style={{ 
                width: '36px', 
                height: '4px', 
                background: '#444', 
                borderRadius: '2px', 
                margin: '0 auto 20px',
                cursor: 'pointer'
              }} 
            />

            {/* Event list grouped by date */}
            {Object.entries(groupedEvents).map(([dateLabel, dateEvents]) => (
              <div key={dateLabel} style={{ marginBottom: '20px' }}>
                {/* Date header */}
                <h3 style={{ 
                  fontSize: '14px', 
                  fontWeight: 700, 
                  color: dateLabel === 'Tonight' ? '#ab67f7' : '#666',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {dateLabel}
                </h3>
                
                {/* Events for this date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {dateEvents.map((event) => {
                    const eventIndex = events.findIndex(e => e.id === event.id)
                    return (
                      <div
                        key={event.id}
                        onClick={() => {
                          setSelectedEventIndex(eventIndex)
                          setSelectedEvent(event)
                          setShowList(false)
                          if (map.current && event.venue) {
                            map.current.flyTo({
                              center: [event.venue.lng, event.venue.lat],
                              zoom: 15,
                              duration: 800
                            })
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          padding: '14px',
                          background: '#1e1e24',
                          borderRadius: '14px',
                          cursor: 'pointer',
                          border: '1px solid rgba(255,255,255,0.05)'
                        }}
                      >
                        <span style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 700, minWidth: '50px' }}>
                          {formatTime(event.start_time)}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '3px' }}>{event.title}</div>
                          <div style={{ fontSize: '12px', color: '#888' }}>{event.venue?.name}</div>
                        </div>
                        <span style={{ color: '#555', fontSize: '18px' }}>›</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Event detail modal */}
        {selectedEvent && (
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 20,
              display: 'flex',
              alignItems: 'flex-end'
            }}
            onClick={() => setSelectedEvent(null)}
          >
            <div 
              style={{
                width: '100%',
                background: '#141416',
                borderRadius: '24px 24px 0 0',
                padding: '12px 20px 40px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                maxHeight: '85vh',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle */}
              <div 
                onClick={() => setSelectedEvent(null)}
                style={{ 
                  width: '36px', 
                  height: '4px', 
                  background: '#444', 
                  borderRadius: '2px', 
                  margin: '0 auto 12px',
                  cursor: 'pointer'
                }} 
              />

              {/* Event image - proper aspect ratio */}
              {selectedEvent.image_url ? (
                <div style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  borderRadius: '14px',
                  marginBottom: '16px',
                  overflow: 'hidden',
                  background: '#1a1a2e'
                }}>
                  <img 
                    src={selectedEvent.image_url} 
                    alt={selectedEvent.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              ) : (
                <div style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  background: 'linear-gradient(135deg, #2a2a3e 0%, #1a1a2e 100%)',
                  borderRadius: '14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#444',
                  fontSize: '12px'
                }}>
                  No image
                </div>
              )}

              {/* Date & time */}
              <p style={{ 
                fontSize: '11px', 
                color: '#ab67f7', 
                fontWeight: 700, 
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '6px' 
              }}>
                {getDateLabel(selectedEvent.start_time)} · {formatTime(selectedEvent.start_time)}
                {selectedEvent.end_time && ` – ${formatTime(selectedEvent.end_time)}`}
              </p>

              {/* Title */}
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: 800, 
                marginBottom: '4px',
                lineHeight: 1.2
              }}>
                {selectedEvent.title}
              </h2>

              {/* Venue with Instagram */}
              <p style={{ fontSize: '14px', color: '#888', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>{selectedEvent.venue?.name}</span>
                {selectedEvent.venue?.instagram_url && (
                  <a 
                    href={selectedEvent.venue.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                      opacity: 0.7, 
                      fontSize: '16px',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    📸
                  </a>
                )}
              </p>

              {/* Tags */}
              {(selectedEvent.genres || selectedEvent.vibe) && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {selectedEvent.genres?.split(',').map((genre, i) => (
                    <span key={i} style={{ 
                      padding: '6px 12px', 
                      background: 'rgba(171, 103, 247, 0.15)', 
                      borderRadius: '10px', 
                      fontSize: '12px', 
                      color: '#ab67f7' 
                    }}>
                      {genre.trim()}
                    </span>
                  ))}
                  {selectedEvent.vibe && (
                    <span style={{ 
                      padding: '6px 12px', 
                      background: 'rgba(255,255,255,0.08)', 
                      borderRadius: '10px', 
                      fontSize: '12px', 
                      color: '#888' 
                    }}>
                      {selectedEvent.vibe}
                    </span>
                  )}
                </div>
              )}

              {/* Price */}
              <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
                {formatPrice(selectedEvent.price_min, selectedEvent.price_max)}
              </p>

              {/* Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedEvent.event_url && (
                  <a 
                    href={selectedEvent.event_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      background: 'linear-gradient(135deg, #ab67f7 0%, #d7b3ff 100%)',
                      color: 'white',
                      padding: '16px',
                      borderRadius: '14px',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '15px',
                      textDecoration: 'none'
                    }}
                  >
                    GET TICKETS
                  </a>
                )}
                
                {selectedEvent.venue && (
                  <a 
                    href={getGoogleMapsUrl(selectedEvent.venue)}
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      color: '#888',
                      fontSize: '14px',
                      padding: '10px',
                      textDecoration: 'none'
                    }}
                  >
                    <span>📍</span>
                    <span>Take me there</span>
                  </a>
                )}
              </div>

              {/* Navigation */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255,255,255,0.05)'
              }}>
                <button 
                  onClick={goToPrevEvent}
                  disabled={selectedEventIndex === 0}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: selectedEventIndex === 0 ? '#333' : '#666',
                    fontSize: '13px',
                    cursor: selectedEventIndex === 0 ? 'default' : 'pointer',
                    padding: '8px 0'
                  }}
                >
                  ← Previous
                </button>
                <button 
                  onClick={goToNextEvent}
                  disabled={selectedEventIndex === events.length - 1}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: selectedEventIndex === events.length - 1 ? '#333' : '#666',
                    fontSize: '13px',
                    cursor: selectedEventIndex === events.length - 1 ? 'default' : 'pointer',
                    padding: '8px 0'
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
