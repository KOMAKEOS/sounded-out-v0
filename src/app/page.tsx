'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { supabase } from '../lib/supabase'

// Apple's default easing curve
const APPLE_EASE = 'cubic-bezier(0.25, 0.1, 0.25, 1)'
const ANIMATION_DURATION = 400

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

type DateFilter = 'tonight' | 'tomorrow' | 'weekend' | 'all' | string
type ViewMode = 'map' | 'preview' | 'detail' | 'list' | 'cluster-select'

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<{ marker: mapboxgl.Marker; element: HTMLDivElement; eventIds: string[] }[]>([])
  
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilter>('tonight')
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [selectedEventIndex, setSelectedEventIndex] = useState(0)
  const [clusterEvents, setClusterEvents] = useState<Event[]>([])
  
  // Swipe state
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchStartY, setTouchStartY] = useState(0)
  const [dragOffsetX, setDragOffsetX] = useState(0)
  const [dragOffsetY, setDragOffsetY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Date helpers
  const getDateString = (date: Date) => date.toDateString()
  const isTonight = (dateStr: string) => getDateString(new Date(dateStr)) === getDateString(new Date())
  const isTomorrow = (dateStr: string) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return getDateString(new Date(dateStr)) === getDateString(tomorrow)
  }
  const isWeekend = (dateStr: string) => {
    const eventDate = new Date(dateStr)
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7
    const friday = new Date(today)
    friday.setDate(today.getDate() + (daysUntilFriday === 0 && dayOfWeek !== 5 ? 7 : daysUntilFriday))
    friday.setHours(0, 0, 0, 0)
    if (dayOfWeek >= 5) friday.setDate(today.getDate())
    const sunday = new Date(friday)
    sunday.setDate(friday.getDate() + (dayOfWeek === 0 ? 0 : 7 - friday.getDay()))
    sunday.setHours(23, 59, 59, 999)
    return eventDate >= friday && eventDate <= sunday
  }
  const getDateLabel = (dateStr: string) => {
    if (isTonight(dateStr)) return 'Tonight'
    if (isTomorrow(dateStr)) return 'Tomorrow'
    return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }
  const getNext7Days = () => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      days.push({ dateString: getDateString(date), dayName: date.toLocaleDateString('en-GB', { weekday: 'short' }), dayNum: date.getDate() })
    }
    return days
  }

  // Filter events
  const filteredEvents = useMemo(() => {
    switch (dateFilter) {
      case 'tonight': return events.filter(e => isTonight(e.start_time))
      case 'tomorrow': return events.filter(e => isTomorrow(e.start_time))
      case 'weekend': return events.filter(e => isWeekend(e.start_time))
      case 'all': return events
      default: return events.filter(e => getDateString(new Date(e.start_time)) === dateFilter)
    }
  }, [events, dateFilter])

  const selectedEvent = filteredEvents[selectedEventIndex] || null

  const groupedEvents = useMemo(() => {
    const groups: { [key: string]: Event[] } = {}
    filteredEvents.forEach(event => {
      const label = getDateLabel(event.start_time)
      if (!groups[label]) groups[label] = []
      groups[label].push(event)
    })
    return groups
  }, [filteredEvents])

  const getFilterLabel = () => {
    switch (dateFilter) {
      case 'tonight': return 'tonight'
      case 'tomorrow': return 'tomorrow'
      case 'weekend': return 'this weekend'
      default: return new Date(dateFilter).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
    }
  }

  // Format helpers
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const formatPrice = (min: number | null, max: number | null) => {
    if (min === 0 || (!min && !max)) return null
    if (min && max && min !== max) return `£${min}–${max}`
    return `£${min || max}`
  }
  const isFree = (min: number | null, max: number | null) => min === 0 || (!min && !max)
  const getCompactGenres = (genres: string | null) => genres ? genres.split(',').map(g => g.trim()).slice(0, 2).join(' · ') : null
  const getGoogleMapsUrl = (venue: Venue) => `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`

  // Calculate spread
  const calculateSpread = (events: Event[]) => {
    if (events.length <= 1) return 0
    const venues = events.filter(e => e.venue).map(e => e.venue!)
    if (venues.length <= 1) return 0
    let maxDist = 0
    for (let i = 0; i < venues.length; i++) {
      for (let j = i + 1; j < venues.length; j++) {
        const d = Math.sqrt(Math.pow((venues[j].lat - venues[i].lat) * 111000, 2) + Math.pow((venues[j].lng - venues[i].lng) * 111000 * Math.cos(venues[i].lat * Math.PI / 180), 2))
        maxDist = Math.max(maxDist, d)
      }
    }
    return maxDist
  }

  // Load events
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('events').select('*, venue:venues(*)').eq('status', 'published').gte('start_time', new Date().toISOString().split('T')[0]).order('start_time', { ascending: true })
      if (!error) setEvents(data as Event[])
      setLoading(false)
    }
    load()
  }, [])

  // Initialize map with stable settings
  useEffect(() => {
    if (!mapContainer.current || map.current) return
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-1.6131, 54.9695],
      zoom: 15,
      pitch: 0,
      bearing: 0,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false
    })
    return () => { map.current?.remove() }
  }, [])

  // Smooth fly to event
  const flyToEvent = useCallback((event: Event, zoom = 16) => {
    if (!map.current || !event.venue) return
    map.current.flyTo({
      center: [event.venue.lng, event.venue.lat],
      zoom,
      duration: ANIMATION_DURATION * 2,
      essential: true
    })
  }, [])

  // Fit all markers in view
  const fitAllMarkers = useCallback(() => {
    if (!map.current || filteredEvents.length === 0) return
    const bounds = new mapboxgl.LngLatBounds()
    filteredEvents.forEach(e => { if (e.venue) bounds.extend([e.venue.lng, e.venue.lat]) })
    map.current.fitBounds(bounds, { padding: { top: 150, bottom: 300, left: 40, right: 40 }, duration: ANIMATION_DURATION * 2 })
  }, [filteredEvents])

  // Update selected marker visuals
  const updateMarkerSelection = useCallback((selectedId: string | null) => {
    markersRef.current.forEach(({ element, eventIds }) => {
      const isSelected = selectedId && eventIds.includes(selectedId)
      element.style.transform = isSelected ? 'scale(1.3)' : 'scale(1)'
      element.style.zIndex = isSelected ? '100' : '1'
      element.style.filter = isSelected ? 'drop-shadow(0 0 12px rgba(171, 103, 247, 0.9))' : ''
    })
  }, [])

  // Update markers
  useEffect(() => {
    if (!map.current) return
    markersRef.current.forEach(m => m.marker.remove())
    markersRef.current = []
    if (filteredEvents.length === 0) {
      map.current.flyTo({ center: [-1.6131, 54.9695], zoom: 15, duration: ANIMATION_DURATION * 2 })
      return
    }

    // Group by venue
    const venueGroups: { [key: string]: Event[] } = {}
    filteredEvents.forEach(event => {
      if (event.venue) {
        const key = `${event.venue.lat.toFixed(5)},${event.venue.lng.toFixed(5)}`
        if (!venueGroups[key]) venueGroups[key] = []
        venueGroups[key].push(event)
      }
    })

    Object.values(venueGroups).forEach(eventsAtVenue => {
      const venue = eventsAtVenue[0].venue!
      const count = eventsAtVenue.length
      const eventIds = eventsAtVenue.map(e => e.id)

      const el = document.createElement('div')
      el.style.cursor = 'pointer'
      el.style.transition = `transform ${ANIMATION_DURATION}ms ${APPLE_EASE}, filter ${ANIMATION_DURATION}ms ${APPLE_EASE}`

      if (count > 1) {
        el.style.width = '44px'
        el.style.height = '44px'
        el.innerHTML = `<div style="width:44px;height:44px;background:linear-gradient(135deg,#ab67f7,#d7b3ff);border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:white;box-shadow:0 4px 12px rgba(171,103,247,0.4);">${count}</div>`
      } else {
        el.style.width = '32px'
        el.style.height = '42px'
        el.innerHTML = `<svg viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="url(#g)"/><circle cx="12" cy="12" r="5" fill="white"/><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ab67f7"/><stop offset="100%" stop-color="#d7b3ff"/></linearGradient></defs></svg>`
      }

      el.onclick = () => {
        if (count > 1) {
          setClusterEvents(eventsAtVenue)
          setViewMode('cluster-select')
          map.current?.flyTo({ center: [venue.lng, venue.lat], zoom: 17, duration: ANIMATION_DURATION * 2 })
        } else {
          const idx = filteredEvents.findIndex(e => e.id === eventsAtVenue[0].id)
          setSelectedEventIndex(idx)
          setViewMode('preview')
          updateMarkerSelection(eventsAtVenue[0].id)
          flyToEvent(eventsAtVenue[0])
        }
      }

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([venue.lng, venue.lat])
        .addTo(map.current!)
      
      markersRef.current.push({ marker, element: el, eventIds })
    })

    // Smart zoom on load
    if (viewMode === 'map') {
      const spread = calculateSpread(filteredEvents)
      if (filteredEvents.length === 1 || spread < 500) {
        const first = filteredEvents.find(e => e.venue)
        if (first?.venue) map.current.flyTo({ center: [first.venue.lng, first.venue.lat], zoom: 16, duration: ANIMATION_DURATION * 2 })
      } else {
        fitAllMarkers()
      }
    }
  }, [filteredEvents, flyToEvent, fitAllMarkers, updateMarkerSelection, viewMode])

  // Navigate with animation
  const navigateTo = useCallback((direction: 'prev' | 'next') => {
    if (isTransitioning) return
    const newIndex = direction === 'next' ? selectedEventIndex + 1 : selectedEventIndex - 1
    if (newIndex < 0 || newIndex >= filteredEvents.length) return
    
    setIsTransitioning(true)
    setSwipeDirection(direction === 'next' ? 'left' : 'right')
    
    setTimeout(() => {
      setSelectedEventIndex(newIndex)
      updateMarkerSelection(filteredEvents[newIndex].id)
      flyToEvent(filteredEvents[newIndex])
      setSwipeDirection(direction === 'next' ? 'right' : 'left')
      
      setTimeout(() => {
        setSwipeDirection(null)
        setIsTransitioning(false)
      }, 50)
    }, ANIMATION_DURATION / 2)
  }, [selectedEventIndex, filteredEvents, isTransitioning, flyToEvent, updateMarkerSelection])

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
    setTouchStartY(e.touches[0].clientY)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const deltaX = e.touches[0].clientX - touchStartX
    const deltaY = e.touches[0].clientY - touchStartY
    
    // Determine if horizontal or vertical swipe
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setDragOffsetX(deltaX * 0.5)
      setDragOffsetY(0)
    } else if (viewMode === 'detail' && deltaY > 0) {
      setDragOffsetY(deltaY * 0.5)
      setDragOffsetX(0)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    
    // Horizontal swipe threshold
    if (Math.abs(dragOffsetX) > 60) {
      if (dragOffsetX < 0 && selectedEventIndex < filteredEvents.length - 1) {
        navigateTo('next')
      } else if (dragOffsetX > 0 && selectedEventIndex > 0) {
        navigateTo('prev')
      }
    }
    
    // Vertical swipe (dismiss detail)
    if (dragOffsetY > 100 && viewMode === 'detail') {
      setViewMode('preview')
    }
    
    setDragOffsetX(0)
    setDragOffsetY(0)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode === 'preview' || viewMode === 'detail') {
        if (e.key === 'ArrowLeft') navigateTo('prev')
        if (e.key === 'ArrowRight') navigateTo('next')
        if (e.key === 'Escape') setViewMode('map')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewMode, navigateTo])

  const handleFilterChange = (filter: DateFilter) => {
    setDateFilter(filter)
    setShowDatePicker(false)
    setViewMode('map')
    setSelectedEventIndex(0)
  }

  const openList = () => {
    setViewMode('list')
    fitAllMarkers()
  }

  const selectEvent = (event: Event) => {
    const idx = filteredEvents.findIndex(e => e.id === event.id)
    setSelectedEventIndex(idx)
    setViewMode('preview')
    updateMarkerSelection(event.id)
    flyToEvent(event)
  }

  // Card animation styles
  const getCardStyle = () => {
    let transform = 'translateX(0)'
    let opacity = 1
    
    if (isDragging && dragOffsetX !== 0) {
      transform = `translateX(${dragOffsetX}px) rotate(${dragOffsetX * 0.02}deg)`
      opacity = 1 - Math.abs(dragOffsetX) / 400
    } else if (swipeDirection === 'left') {
      transform = 'translateX(-120%) rotate(-5deg)'
      opacity = 0
    } else if (swipeDirection === 'right') {
      transform = 'translateX(120%) rotate(5deg)'
      opacity = 0
    }
    
    return {
      transform,
      opacity,
      transition: isDragging ? 'none' : `all ${ANIMATION_DURATION}ms ${APPLE_EASE}`
    }
  }

  const getDetailStyle = () => {
    if (isDragging && dragOffsetY > 0) {
      return {
        transform: `translateY(${dragOffsetY}px)`,
        opacity: 1 - dragOffsetY / 400,
        transition: 'none'
      }
    }
    return {
      transform: 'translateY(0)',
      opacity: 1,
      transition: `all ${ANIMATION_DURATION}ms ${APPLE_EASE}`
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', justifyContent: 'center' }}>
      <main style={{ height: '100vh', width: '100%', maxWidth: '480px', position: 'relative', overflow: 'hidden', background: '#0a0a0b' }}>
        
        {/* Map */}
        <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />

        {/* Header */}
        <header style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '50px 20px 20px',
          background: 'linear-gradient(to bottom, rgba(10,10,11,0.98) 0%, rgba(10,10,11,0.85) 70%, transparent 100%)',
          zIndex: 10,
          opacity: viewMode === 'detail' ? 0.3 : 1,
          transition: `opacity ${ANIMATION_DURATION}ms ${APPLE_EASE}`
        }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>SOUNDED OUT</h1>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '2px', marginBottom: '14px' }}>Newcastle</p>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['tonight', 'tomorrow', 'weekend'] as const).map(f => (
              <button key={f} onClick={() => handleFilterChange(f)} style={{
                padding: '8px 14px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: dateFilter === f ? '#ab67f7' : 'rgba(255,255,255,0.1)',
                color: dateFilter === f ? 'white' : '#888',
                transition: `all ${ANIMATION_DURATION}ms ${APPLE_EASE}`
              }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
            <button onClick={() => setShowDatePicker(!showDatePicker)} style={{
              padding: '8px 12px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              background: 'rgba(255,255,255,0.1)', color: '#ab67f7', transition: `all ${ANIMATION_DURATION}ms ${APPLE_EASE}`
            }}>{showDatePicker ? 'Less ▲' : 'More ▼'}</button>
          </div>

          {showDatePicker && (
            <div style={{ marginTop: '12px', padding: '16px', background: '#1e1e24', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {getNext7Days().map(day => (
                  <button key={day.dateString} onClick={() => handleFilterChange(day.dateString)} style={{
                    width: '40px', padding: '8px 4px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    background: dateFilter === day.dateString ? '#ab67f7' : 'transparent',
                    color: dateFilter === day.dateString ? 'white' : '#888',
                    transition: `all ${ANIMATION_DURATION}ms ${APPLE_EASE}`
                  }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>{day.dayName}</span>
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>{day.dayNum}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* Bottom Bar - Default */}
        {viewMode === 'map' && (
          <div onClick={openList} style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '30px 20px 34px',
            background: 'linear-gradient(to top, rgba(10,10,11,1) 0%, rgba(10,10,11,0.95) 70%, transparent 100%)',
            zIndex: 10, cursor: 'pointer'
          }}>
            <div style={{
              background: '#1e1e24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '15px', fontWeight: 500 }}>
                <span style={{ color: '#ab67f7', fontWeight: 700 }}>{loading ? '...' : filteredEvents.length}</span>
                {' '}{filteredEvents.length === 1 ? 'event' : 'events'} {getFilterLabel()}
              </span>
              <span style={{ color: '#ab67f7', fontSize: '18px' }}>↑</span>
            </div>
          </div>
        )}

        {/* Preview Card */}
        {viewMode === 'preview' && selectedEvent && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 15 }}>
            <div onClick={() => { setViewMode('map'); updateMarkerSelection(null) }} style={{ height: '60px' }} />
            
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                background: '#141416', borderRadius: '24px 24px 0 0', padding: '16px 20px 34px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                ...getCardStyle()
              }}
            >
              <div onClick={() => { setViewMode('map'); updateMarkerSelection(null) }} style={{ width: '36px', height: '4px', background: '#444', borderRadius: '2px', margin: '0 auto 16px', cursor: 'pointer' }} />

              {/* Dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '16px' }}>
                {filteredEvents.slice(0, 10).map((_, i) => (
                  <div key={i} style={{
                    width: i === selectedEventIndex ? '20px' : '6px', height: '6px', borderRadius: '3px',
                    background: i === selectedEventIndex ? '#ab67f7' : 'rgba(255,255,255,0.2)',
                    transition: `all ${ANIMATION_DURATION}ms ${APPLE_EASE}`
                  }} />
                ))}
                {filteredEvents.length > 10 && <span style={{ fontSize: '10px', color: '#555' }}>+{filteredEvents.length - 10}</span>}
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 700, marginBottom: '6px' }}>
                    {formatTime(selectedEvent.start_time)} · {getDateLabel(selectedEvent.start_time)}
                  </p>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px', lineHeight: 1.2 }}>{selectedEvent.title}</h3>
                  <p style={{ fontSize: '14px', color: '#888', marginBottom: '10px' }}>{selectedEvent.venue?.name}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {isFree(selectedEvent.price_min, selectedEvent.price_max) && (
                      <span style={{ padding: '4px 10px', background: 'rgba(34,197,94,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#22c55e' }}>FREE</span>
                    )}
                    {formatPrice(selectedEvent.price_min, selectedEvent.price_max) && (
                      <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#fff' }}>{formatPrice(selectedEvent.price_min, selectedEvent.price_max)}</span>
                    )}
                    {getCompactGenres(selectedEvent.genres) && (
                      <span style={{ padding: '4px 10px', background: 'rgba(171,103,247,0.15)', borderRadius: '8px', fontSize: '12px', color: '#ab67f7' }}>{getCompactGenres(selectedEvent.genres)}</span>
                    )}
                  </div>
                </div>
                {selectedEvent.image_url && (
                  <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={selectedEvent.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <button onClick={() => setViewMode('detail')} style={{
                width: '100%', padding: '14px', marginTop: '16px',
                background: 'linear-gradient(135deg, #ab67f7 0%, #d7b3ff 100%)',
                border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700, color: 'white', cursor: 'pointer'
              }}>VIEW DETAILS</button>

              {/* Desktop navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <button onClick={() => navigateTo('prev')} disabled={selectedEventIndex === 0} style={{
                  background: 'none', border: 'none', color: selectedEventIndex === 0 ? '#333' : '#666',
                  fontSize: '13px', cursor: 'pointer', padding: '8px'
                }}>← Previous</button>
                <span style={{ color: '#444', fontSize: '12px', alignSelf: 'center' }}>{selectedEventIndex + 1} / {filteredEvents.length}</span>
                <button onClick={() => navigateTo('next')} disabled={selectedEventIndex === filteredEvents.length - 1} style={{
                  background: 'none', border: 'none', color: selectedEventIndex === filteredEvents.length - 1 ? '#333' : '#666',
                  fontSize: '13px', cursor: 'pointer', padding: '8px'
                }}>Next →</button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {viewMode === 'detail' && selectedEvent && (
          <div onClick={() => setViewMode('preview')} style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 25,
            display: 'flex', alignItems: 'flex-end'
          }}>
            <div
              onClick={e => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                width: '100%', maxHeight: '90vh', background: '#141416', borderRadius: '24px 24px 0 0',
                padding: '16px 20px 40px', overflowY: 'auto',
                ...getDetailStyle()
              }}
            >
              <div onClick={() => setViewMode('preview')} style={{ width: '36px', height: '4px', background: '#444', borderRadius: '2px', margin: '0 auto 16px', cursor: 'pointer' }} />

              {selectedEvent.image_url ? (
                <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px' }}>
                  <img src={selectedEvent.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ width: '100%', aspectRatio: '16/9', background: 'linear-gradient(135deg, #2a2a3e, #1a1a2e)', borderRadius: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>No image</div>
              )}

              <p style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                {getDateLabel(selectedEvent.start_time)} · {formatTime(selectedEvent.start_time)}
                {selectedEvent.end_time && ` – ${formatTime(selectedEvent.end_time)}`}
              </p>

              <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', lineHeight: 1.2 }}>{selectedEvent.title}</h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '16px', color: '#888' }}>{selectedEvent.venue?.name}</span>
                {selectedEvent.venue?.instagram_url && (
                  <a href={selectedEvent.venue.instagram_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '18px', opacity: 0.7 }}>📸</a>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {isFree(selectedEvent.price_min, selectedEvent.price_max) && (
                  <span style={{ padding: '8px 16px', background: 'rgba(34,197,94,0.2)', borderRadius: '12px', fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>FREE</span>
                )}
                {selectedEvent.genres?.split(',').map((g, i) => (
                  <span key={i} style={{ padding: '8px 16px', background: 'rgba(171,103,247,0.15)', borderRadius: '12px', fontSize: '14px', color: '#ab67f7' }}>{g.trim()}</span>
                ))}
                {selectedEvent.vibe && (
                  <span style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '14px', color: '#888' }}>{selectedEvent.vibe}</span>
                )}
              </div>

              {!isFree(selectedEvent.price_min, selectedEvent.price_max) && formatPrice(selectedEvent.price_min, selectedEvent.price_max) && (
                <p style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>{formatPrice(selectedEvent.price_min, selectedEvent.price_max)}</p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedEvent.event_url && (
                  <a href={selectedEvent.event_url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'block', padding: '18px', background: 'linear-gradient(135deg, #ab67f7 0%, #d7b3ff 100%)',
                    borderRadius: '16px', textAlign: 'center', fontWeight: 700, fontSize: '16px', color: 'white', textDecoration: 'none'
                  }}>GET TICKETS</a>
                )}
                {selectedEvent.venue && (
                  <a href={getGoogleMapsUrl(selectedEvent.venue)} target="_blank" rel="noopener noreferrer" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', color: '#888', fontSize: '15px', textDecoration: 'none'
                  }}>📍 Take me there</a>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button onClick={() => navigateTo('prev')} disabled={selectedEventIndex === 0} style={{ background: 'none', border: 'none', color: selectedEventIndex === 0 ? '#333' : '#888', fontSize: '14px', cursor: 'pointer', padding: '8px' }}>← Previous</button>
                <span style={{ color: '#555', fontSize: '14px' }}>{selectedEventIndex + 1} / {filteredEvents.length}</span>
                <button onClick={() => navigateTo('next')} disabled={selectedEventIndex === filteredEvents.length - 1} style={{ background: 'none', border: 'none', color: selectedEventIndex === filteredEvents.length - 1 ? '#333' : '#888', fontSize: '14px', cursor: 'pointer', padding: '8px' }}>Next →</button>
              </div>
            </div>
          </div>
        )}

        {/* Cluster Selection */}
        {viewMode === 'cluster-select' && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 15 }}>
            <div onClick={() => setViewMode('map')} style={{ height: '60px' }} />
            <div style={{ background: '#141416', borderRadius: '24px 24px 0 0', padding: '16px 20px 34px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div onClick={() => setViewMode('map')} style={{ width: '36px', height: '4px', background: '#444', borderRadius: '2px', margin: '0 auto 16px', cursor: 'pointer' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#ab67f7' }}>{clusterEvents.length} events at this venue</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {clusterEvents.map(event => (
                  <div key={event.id} onClick={() => selectEvent(event)} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: '#1e1e24', borderRadius: '14px', cursor: 'pointer'
                  }}>
                    <span style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 700, minWidth: '50px' }}>{formatTime(event.start_time)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{event.title}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{getCompactGenres(event.genres)}</div>
                    </div>
                    {isFree(event.price_min, event.price_max) ? (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.2)', padding: '4px 8px', borderRadius: '6px' }}>FREE</span>
                    ) : formatPrice(event.price_min, event.price_max) && (
                      <span style={{ fontSize: '12px', color: '#888' }}>{formatPrice(event.price_min, event.price_max)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: '#141416', borderRadius: '24px 24px 0 0',
            height: 'calc(100vh - 200px)', maxHeight: '500px',
            zIndex: 15, display: 'flex', flexDirection: 'column'
          }}>
            {/* Sticky header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: '#141416', borderRadius: '24px 24px 0 0', flexShrink: 0
            }}>
              <div onClick={() => setViewMode('map')} style={{ width: '36px', height: '4px', background: '#444', borderRadius: '2px', margin: '0 auto 16px', cursor: 'pointer' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ab67f7', textTransform: 'uppercase' }}>
                {Object.keys(groupedEvents)[0] || getFilterLabel()}
              </h3>
            </div>
            
            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 34px' }}>
              {Object.keys(groupedEvents).length === 0 ? (
                <p style={{ textAlign: 'center', color: '#555', padding: '30px' }}>No events {getFilterLabel()}</p>
              ) : (
                Object.entries(groupedEvents).map(([label, evts], groupIdx) => (
                  <div key={label} style={{ marginTop: groupIdx > 0 ? '24px' : '16px' }}>
                    {groupIdx > 0 && (
                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: '12px' }}>{label}</h4>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {evts.map(event => (
                        <div key={event.id} onClick={() => selectEvent(event)} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px', background: '#1e1e24', borderRadius: '14px', cursor: 'pointer'
                        }}>
                          <span style={{ fontSize: '13px', color: '#ab67f7', fontWeight: 700, minWidth: '50px', paddingTop: '2px' }}>{formatTime(event.start_time)}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '15px', fontWeight: 600 }}>{event.title}</span>
                              {isFree(event.price_min, event.price_max) ? (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.2)', padding: '3px 8px', borderRadius: '6px' }}>FREE</span>
                              ) : formatPrice(event.price_min, event.price_max) && (
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#888' }}>{formatPrice(event.price_min, event.price_max)}</span>
                              )}
                            </div>
                            <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>{event.venue?.name}</div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {getCompactGenres(event.genres) && (
                                <span style={{ fontSize: '11px', color: '#ab67f7', background: 'rgba(171,103,247,0.1)', padding: '3px 8px', borderRadius: '6px' }}>{getCompactGenres(event.genres)}</span>
                              )}
                              {event.vibe && (
                                <span style={{ fontSize: '11px', color: '#666', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '6px' }}>{event.vibe}</span>
                              )}
                            </div>
                          </div>
                          <span style={{ color: '#444', fontSize: '18px', paddingTop: '2px' }}>›</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <style jsx global>{`
          * { -webkit-tap-highlight-color: transparent; }
          body { overscroll-behavior: none; }
        `}</style>
      </main>
    </div>
  )
}
