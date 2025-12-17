'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
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

type DateFilter = 'tonight' | 'tomorrow' | 'weekend' | 'all' | string
type ViewMode = 'map' | 'preview' | 'detail' | 'list'

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const previewCardRef = useRef<HTMLDivElement>(null)
  
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilter>('tonight')
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [selectedEventIndex, setSelectedEventIndex] = useState(0)
  
  // Touch handling for swipe
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Minimum swipe distance
  const minSwipeDistance = 50

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
    const friday = new Date(today)
    friday.setDate(today.getDate() + ((5 - dayOfWeek + 7) % 7 || 7))
    if (dayOfWeek >= 5) friday.setDate(today.getDate())
    const sunday = new Date(friday)
    sunday.setDate(friday.getDate() + 2)
    sunday.setHours(23, 59, 59)
    friday.setHours(0, 0, 0)
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
      days.push({
        dateString: getDateString(date),
        dayName: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        dayNum: date.getDate()
      })
    }
    return days
  }

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered: Event[] = []
    switch (dateFilter) {
      case 'tonight':
        filtered = events.filter(e => isTonight(e.start_time))
        break
      case 'tomorrow':
        filtered = events.filter(e => isTomorrow(e.start_time))
        break
      case 'weekend':
        filtered = events.filter(e => isWeekend(e.start_time))
        break
      case 'all':
        filtered = events
        break
      default:
        filtered = events.filter(e => getDateString(new Date(e.start_time)) === dateFilter)
    }
    return filtered
  }, [events, dateFilter])

  // Current selected event
  const selectedEvent = filteredEvents[selectedEventIndex] || null

  // Group events by date for list view
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
      case 'all': return 'upcoming'
      default: return new Date(dateFilter).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
    }
  }

  // Format helpers
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatPrice = (min: number | null, max: number | null) => {
    if (min === 0 || (!min && !max)) return null // Free
    if (min && max && min !== max) return `£${min}–${max}`
    return `£${min || max}`
  }

  const isFree = (min: number | null, max: number | null) => {
    return min === 0 || (!min && !max)
  }

  const getCompactGenres = (genres: string | null) => {
    if (!genres) return null
    return genres.split(',').map(g => g.trim()).slice(0, 2).join(' · ')
  }

  const getGoogleMapsUrl = (venue: Venue) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`
  }

  // Calculate spread of events to determine zoom
  const calculateSpread = (events: Event[]) => {
    if (events.length <= 1) return 0
    const venues = events.filter(e => e.venue).map(e => e.venue!)
    if (venues.length <= 1) return 0
    let maxDistance = 0
    for (let i = 0; i < venues.length; i++) {
      for (let j = i + 1; j < venues.length; j++) {
        const distance = Math.sqrt(
          Math.pow((venues[j].lat - venues[i].lat) * 111000, 2) +
          Math.pow((venues[j].lng - venues[i].lng) * 111000 * Math.cos(venues[i].lat * Math.PI / 180), 2)
        )
        maxDistance = Math.max(maxDistance, distance)
      }
    }
    return maxDistance
  }

  // Load events
  useEffect(() => {
    async function loadEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('*, venue:venues(*)')
        .eq('status', 'published')
        .gte('start_time', new Date().toISOString().split('T')[0])
        .order('start_time', { ascending: true })
      if (error) console.error('Error:', error)
      else setEvents(data as Event[])
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
      center: [-1.6131, 54.9695],
      zoom: 15
    })
    return () => { if (map.current) map.current.remove() }
  }, [])

  // Navigate to event on map
  const flyToEvent = useCallback((event: Event, zoom: number = 16) => {
    if (!map.current || !event.venue) return
    map.current.flyTo({
      center: [event.venue.lng, event.venue.lat],
      zoom,
      duration: 800,
      easing: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 // ease-in-out-cubic
    })
  }, [])

  // Update markers
  useEffect(() => {
    if (!map.current) return

    // Clear existing
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    if (filteredEvents.length === 0) {
      map.current.flyTo({ center: [-1.6131, 54.9695], zoom: 15, duration: 800 })
      return
    }

    // Group by venue for clustering
    const venueGroups: { [key: string]: Event[] } = {}
    filteredEvents.forEach(event => {
      if (event.venue) {
        const key = `${event.venue.lat},${event.venue.lng}`
        if (!venueGroups[key]) venueGroups[key] = []
        venueGroups[key].push(event)
      }
    })

    Object.entries(venueGroups).forEach(([_, eventsAtVenue]) => {
      const venue = eventsAtVenue[0].venue!
      const isCluster = eventsAtVenue.length > 1
      const isSelected = viewMode === 'preview' && selectedEvent?.venue?.id === venue.id

      const el = document.createElement('div')
      el.style.cursor = 'pointer'
      el.style.transition = 'transform 0.3s ease'
      el.style.transform = isSelected ? 'scale(1.2)' : 'scale(1)'

      if (isCluster) {
        el.style.width = '48px'
        el.style.height = '48px'
        el.innerHTML = `
          <div style="
            width: 48px; height: 48px;
            background: linear-gradient(135deg, #ab67f7 0%, #d7b3ff 100%);
            border-radius: 50%;
            border: 3px solid white;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; font-weight: bold; color: white;
            box-shadow: 0 4px 16px rgba(171, 103, 247, 0.5);
            transition: all 0.3s ease;
          ">${eventsAtVenue.length}</div>
        `
      } else {
        el.style.width = '36px'
        el.style.height = '46px'
        el.innerHTML = `
          <svg viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg" 
               style="filter: drop-shadow(0 4px 12px rgba(171, 103, 247, ${isSelected ? '0.8' : '0.5'})); transition: all 0.3s ease;">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" 
                  fill="url(#pinGrad)"/>
            <circle cx="12" cy="12" r="5" fill="white"/>
            <defs>
              <linearGradient id="pinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#ab67f7"/>
                <stop offset="100%" style="stop-color:#d7b3ff"/>
              </linearGradient>
            </defs>
          </svg>
        `
      }

      el.onclick = () => {
        if (isCluster) {
          map.current?.flyTo({ center: [venue.lng, venue.lat], zoom: 17, duration: 800 })
        } else {
          const idx = filteredEvents.findIndex(e => e.id === eventsAtVenue[0].id)
          setSelectedEventIndex(idx)
          setViewMode('preview')
          flyToEvent(eventsAtVenue[0])
        }
      }

      const marker = new mapboxgl.Marker(el).setLngLat([venue.lng, venue.lat]).addTo(map.current!)
      markersRef.current.push(marker)
    })

    // Smart zoom
    if (viewMode === 'map') {
      const spread = calculateSpread(filteredEvents)
      if (filteredEvents.length === 1 || spread < 500) {
        const first = filteredEvents.find(e => e.venue)
        if (first?.venue) {
          map.current.flyTo({ center: [first.venue.lng, first.venue.lat], zoom: 16, duration: 800 })
        }
      } else {
        const bounds = new mapboxgl.LngLatBounds()
        filteredEvents.forEach(e => { if (e.venue) bounds.extend([e.venue.lng, e.venue.lat]) })
        map.current.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 800 })
      }
    }
  }, [filteredEvents, viewMode, selectedEvent, flyToEvent])

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return
    const currentTouch = e.targetTouches[0].clientX
    setTouchEnd(currentTouch)
    const diff = touchStart - currentTouch
    // Limit swipe offset
    const maxOffset = 100
    setSwipeOffset(Math.max(-maxOffset, Math.min(maxOffset, diff)))
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setSwipeOffset(0)
      return
    }
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    setIsAnimating(true)
    
    if (isLeftSwipe && selectedEventIndex < filteredEvents.length - 1) {
      // Next event
      const newIndex = selectedEventIndex + 1
      setSelectedEventIndex(newIndex)
      flyToEvent(filteredEvents[newIndex])
    } else if (isRightSwipe && selectedEventIndex > 0) {
      // Previous event
      const newIndex = selectedEventIndex - 1
      setSelectedEventIndex(newIndex)
      flyToEvent(filteredEvents[newIndex])
    }

    setSwipeOffset(0)
    setTouchStart(null)
    setTouchEnd(null)
    setTimeout(() => setIsAnimating(false), 300)
  }

  // Navigation functions
  const goToNext = () => {
    if (selectedEventIndex < filteredEvents.length - 1) {
      setIsAnimating(true)
      const newIndex = selectedEventIndex + 1
      setSelectedEventIndex(newIndex)
      flyToEvent(filteredEvents[newIndex])
      setTimeout(() => setIsAnimating(false), 300)
    }
  }

  const goToPrev = () => {
    if (selectedEventIndex > 0) {
      setIsAnimating(true)
      const newIndex = selectedEventIndex - 1
      setSelectedEventIndex(newIndex)
      flyToEvent(filteredEvents[newIndex])
      setTimeout(() => setIsAnimating(false), 300)
    }
  }

  const openDetail = () => {
    setViewMode('detail')
  }

  const closePreview = () => {
    setViewMode('map')
    // Reset zoom to fit all
    if (map.current && filteredEvents.length > 0) {
      const spread = calculateSpread(filteredEvents)
      if (spread >= 500) {
        const bounds = new mapboxgl.LngLatBounds()
        filteredEvents.forEach(e => { if (e.venue) bounds.extend([e.venue.lng, e.venue.lat]) })
        map.current.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 800 })
      }
    }
  }

  const handleFilterChange = (filter: DateFilter) => {
    setDateFilter(filter)
    setShowDatePicker(false)
    setViewMode('map')
    setSelectedEventIndex(0)
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a0b',
      display: 'flex',
      justifyContent: 'center'
    }}>
      <main style={{ 
        height: '100vh', 
        width: '100%',
        maxWidth: '480px',
        position: 'relative', 
        overflow: 'hidden', 
        background: '#0a0a0b'
      }}>
        {/* Map */}
        <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />

        {/* Header */}
        <header style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          padding: '50px 20px 20px',
          background: 'linear-gradient(to bottom, rgba(10,10,11,0.95) 0%, rgba(10,10,11,0.8) 70%, transparent 100%)',
          zIndex: 10,
          opacity: viewMode === 'detail' ? 0.3 : 1,
          transition: 'opacity 0.3s ease'
        }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>SOUNDED OUT</h1>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '2px', marginBottom: '14px' }}>Newcastle</p>
          
          {/* Date filters */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['tonight', 'tomorrow', 'weekend'] as DateFilter[]).map(f => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: dateFilter === f ? '#ab67f7' : 'rgba(255,255,255,0.1)',
                  color: dateFilter === f ? 'white' : '#888',
                  transition: 'all 0.2s ease'
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              style={{
                padding: '8px 12px',
                borderRadius: '20px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.1)',
                color: '#ab67f7',
                transition: 'all 0.2s ease'
              }}
            >
              {showDatePicker ? 'Less ▲' : 'More ▼'}
            </button>
          </div>

          {/* Date picker */}
          {showDatePicker && (
            <div style={{
              marginTop: '12px',
              padding: '16px',
              background: '#1e1e24',
              borderRadius: '16px',
              animation: 'slideDown 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {getNext7Days().map((day) => (
                  <button
                    key={day.dateString}
                    onClick={() => handleFilterChange(day.dateString)}
                    style={{
                      width: '40px',
                      padding: '8px 4px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      background: dateFilter === day.dateString ? '#ab67f7' : 'transparent',
                      color: dateFilter === day.dateString ? 'white' : '#888',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>{day.dayName}</span>
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>{day.dayNum}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* Bottom bar - Default state */}
        {viewMode === 'map' && (
          <div 
            onClick={() => setViewMode('list')}
            style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              padding: '30px 20px 34px',
              background: 'linear-gradient(to top, rgba(10,10,11,1) 0%, rgba(10,10,11,0.9) 70%, transparent 100%)',
              zIndex: 10,
              cursor: 'pointer',
              animation: 'slideUp 0.3s ease'
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
                <span style={{ color: '#ab67f7', fontWeight: 700 }}>{loading ? '...' : filteredEvents.length}</span>
                {' '}{filteredEvents.length === 1 ? 'event' : 'events'} {getFilterLabel()}
              </span>
              <span style={{ color: '#ab67f7', fontSize: '18px' }}>↑</span>
            </div>
          </div>
        )}

        {/* Preview Card - Swipeable */}
        {viewMode === 'preview' && selectedEvent && (
          <div
            ref={previewCardRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              zIndex: 15,
              animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            {/* Tap outside to close */}
            <div 
              onClick={closePreview}
              style={{ height: '100px', width: '100%' }}
            />
            
            <div style={{
              background: '#141416',
              borderRadius: '24px 24px 0 0',
              padding: '16px 20px 34px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              transform: `translateX(${-swipeOffset}px)`,
              transition: isAnimating ? 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
            }}>
              {/* Handle */}
              <div style={{ 
                width: '36px', height: '4px', 
                background: '#444', 
                borderRadius: '2px', 
                margin: '0 auto 16px',
                cursor: 'pointer'
              }} onClick={closePreview} />

              {/* Position indicator */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '6px', 
                marginBottom: '16px' 
              }}>
                {filteredEvents.map((_, i) => (
                  <div key={i} style={{
                    width: i === selectedEventIndex ? '20px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background: i === selectedEventIndex ? '#ab67f7' : 'rgba(255,255,255,0.2)',
                    transition: 'all 0.3s ease'
                  }} />
                ))}
              </div>

              {/* Card content */}
              <div style={{ display: 'flex', gap: '16px' }}>
                {/* Left: Info */}
                <div style={{ flex: 1 }}>
                  {/* Time + Date */}
                  <p style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 700, marginBottom: '6px' }}>
                    {formatTime(selectedEvent.start_time)} · {getDateLabel(selectedEvent.start_time)}
                  </p>
                  
                  {/* Title */}
                  <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px', lineHeight: 1.2 }}>
                    {selectedEvent.title}
                  </h3>
                  
                  {/* Venue */}
                  <p style={{ fontSize: '14px', color: '#888', marginBottom: '10px' }}>
                    {selectedEvent.venue?.name}
                  </p>

                  {/* Tags row */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {/* Free badge */}
                    {isFree(selectedEvent.price_min, selectedEvent.price_max) && (
                      <span style={{
                        padding: '4px 10px',
                        background: 'rgba(34, 197, 94, 0.2)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#22c55e'
                      }}>FREE</span>
                    )}
                    
                    {/* Price */}
                    {formatPrice(selectedEvent.price_min, selectedEvent.price_max) && (
                      <span style={{
                        padding: '4px 10px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#fff'
                      }}>{formatPrice(selectedEvent.price_min, selectedEvent.price_max)}</span>
                    )}

                    {/* Genres */}
                    {getCompactGenres(selectedEvent.genres) && (
                      <span style={{
                        padding: '4px 10px',
                        background: 'rgba(171, 103, 247, 0.15)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#ab67f7'
                      }}>{getCompactGenres(selectedEvent.genres)}</span>
                    )}

                    {/* Vibe */}
                    {selectedEvent.vibe && (
                      <span style={{
                        padding: '4px 10px',
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#888'
                      }}>{selectedEvent.vibe}</span>
                    )}
                  </div>
                </div>

                {/* Right: Thumbnail (if image) */}
                {selectedEvent.image_url && (
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    <img 
                      src={selectedEvent.image_url} 
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
              </div>

              {/* View details button */}
              <button
                onClick={openDetail}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #ab67f7 0%, #d7b3ff 100%)',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'white',
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
              >
                VIEW DETAILS
              </button>

              {/* Navigation hints */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginTop: '16px',
                color: '#555',
                fontSize: '12px'
              }}>
                <span style={{ opacity: selectedEventIndex > 0 ? 1 : 0.3 }}>← Swipe for previous</span>
                <span style={{ opacity: selectedEventIndex < filteredEvents.length - 1 ? 1 : 0.3 }}>Swipe for next →</span>
              </div>
            </div>
          </div>
        )}

        {/* Full Detail Modal */}
        {viewMode === 'detail' && selectedEvent && (
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 25,
              display: 'flex',
              alignItems: 'flex-end',
              animation: 'fadeIn 0.2s ease'
            }}
            onClick={() => setViewMode('preview')}
          >
            <div 
              style={{
                width: '100%',
                maxHeight: '90vh',
                background: '#141416',
                borderRadius: '24px 24px 0 0',
                padding: '16px 20px 40px',
                overflowY: 'auto',
                animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div 
                onClick={() => setViewMode('preview')}
                style={{ 
                  width: '36px', height: '4px', 
                  background: '#444', 
                  borderRadius: '2px', 
                  margin: '0 auto 16px',
                  cursor: 'pointer'
                }} 
              />

              {/* Image */}
              {selectedEvent.image_url ? (
                <div style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  marginBottom: '20px'
                }}>
                  <img 
                    src={selectedEvent.image_url} 
                    alt={selectedEvent.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <div style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  background: 'linear-gradient(135deg, #2a2a3e, #1a1a2e)',
                  borderRadius: '16px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#444'
                }}>No image</div>
              )}

              {/* Date/time */}
              <p style={{ 
                fontSize: '12px', 
                color: '#ab67f7', 
                fontWeight: 700, 
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}>
                {getDateLabel(selectedEvent.start_time)} · {formatTime(selectedEvent.start_time)}
                {selectedEvent.end_time && ` – ${formatTime(selectedEvent.end_time)}`}
              </p>

              {/* Title */}
              <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', lineHeight: 1.2 }}>
                {selectedEvent.title}
              </h2>

              {/* Venue + Instagram */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '16px', color: '#888' }}>{selectedEvent.venue?.name}</span>
                {selectedEvent.venue?.instagram_url && (
                  <a 
                    href={selectedEvent.venue.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '18px', opacity: 0.7 }}
                    onClick={e => e.stopPropagation()}
                  >📸</a>
                )}
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {isFree(selectedEvent.price_min, selectedEvent.price_max) && (
                  <span style={{
                    padding: '8px 16px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#22c55e'
                  }}>FREE</span>
                )}
                {selectedEvent.genres?.split(',').map((g, i) => (
                  <span key={i} style={{
                    padding: '8px 16px',
                    background: 'rgba(171, 103, 247, 0.15)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: '#ab67f7'
                  }}>{g.trim()}</span>
                ))}
                {selectedEvent.vibe && (
                  <span style={{
                    padding: '8px 16px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: '#888'
                  }}>{selectedEvent.vibe}</span>
                )}
              </div>

              {/* Price */}
              {!isFree(selectedEvent.price_min, selectedEvent.price_max) && (
                <p style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
                  {formatPrice(selectedEvent.price_min, selectedEvent.price_max)}
                </p>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedEvent.event_url && (
                  <a 
                    href={selectedEvent.event_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      padding: '18px',
                      background: 'linear-gradient(135deg, #ab67f7 0%, #d7b3ff 100%)',
                      borderRadius: '16px',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '16px',
                      color: 'white',
                      textDecoration: 'none'
                    }}
                  >GET TICKETS</a>
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
                      padding: '14px',
                      color: '#888',
                      fontSize: '15px',
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
                marginTop: '24px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255,255,255,0.05)'
              }}>
                <button 
                  onClick={goToPrev}
                  disabled={selectedEventIndex === 0}
                  style={{ 
                    background: 'none', border: 'none', 
                    color: selectedEventIndex === 0 ? '#333' : '#888',
                    fontSize: '14px', cursor: 'pointer', padding: '8px'
                  }}
                >← Previous</button>
                <span style={{ color: '#555', fontSize: '14px' }}>
                  {selectedEventIndex + 1} / {filteredEvents.length}
                </span>
                <button 
                  onClick={goToNext}
                  disabled={selectedEventIndex === filteredEvents.length - 1}
                  style={{ 
                    background: 'none', border: 'none', 
                    color: selectedEventIndex === filteredEvents.length - 1 ? '#333' : '#888',
                    fontSize: '14px', cursor: 'pointer', padding: '8px'
                  }}
                >Next →</button>
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            background: '#141416',
            borderRadius: '24px 24px 0 0',
            padding: '16px 20px 34px',
            maxHeight: '60vh',
            overflowY: 'auto',
            zIndex: 15,
            animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Handle */}
            <div 
              onClick={() => setViewMode('map')}
              style={{ 
                width: '36px', height: '4px', 
                background: '#444', 
                borderRadius: '2px', 
                margin: '0 auto 20px',
                cursor: 'pointer'
              }} 
            />

            {Object.keys(groupedEvents).length === 0 ? (
              <p style={{ textAlign: 'center', color: '#555', padding: '30px' }}>
                No events {getFilterLabel()}
              </p>
            ) : (
              Object.entries(groupedEvents).map(([label, evts]) => (
                <div key={label} style={{ marginBottom: '24px' }}>
                  <h3 style={{ 
                    fontSize: '13px', 
                    fontWeight: 700, 
                    color: label === 'Tonight' ? '#ab67f7' : '#555',
                    textTransform: 'uppercase',
                    marginBottom: '12px'
                  }}>{label}</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {evts.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => {
                          const idx = filteredEvents.findIndex(e => e.id === event.id)
                          setSelectedEventIndex(idx)
                          setViewMode('preview')
                          flyToEvent(event)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '14px',
                          padding: '14px',
                          background: '#1e1e24',
                          borderRadius: '14px',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease'
                        }}
                      >
                        <span style={{ 
                          fontSize: '13px', 
                          color: '#ab67f7', 
                          fontWeight: 700, 
                          minWidth: '50px',
                          paddingTop: '2px'
                        }}>{formatTime(event.start_time)}</span>
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start',
                            marginBottom: '4px'
                          }}>
                            <span style={{ fontSize: '15px', fontWeight: 600 }}>{event.title}</span>
                            {isFree(event.price_min, event.price_max) ? (
                              <span style={{ 
                                fontSize: '11px', 
                                fontWeight: 700, 
                                color: '#22c55e',
                                background: 'rgba(34, 197, 94, 0.2)',
                                padding: '3px 8px',
                                borderRadius: '6px'
                              }}>FREE</span>
                            ) : formatPrice(event.price_min, event.price_max) && (
                              <span style={{ 
                                fontSize: '12px', 
                                fontWeight: 600, 
                                color: '#888'
                              }}>{formatPrice(event.price_min, event.price_max)}</span>
                            )}
                          </div>
                          <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>
                            {event.venue?.name}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {getCompactGenres(event.genres) && (
                              <span style={{
                                fontSize: '11px',
                                color: '#ab67f7',
                                background: 'rgba(171,103,247,0.1)',
                                padding: '3px 8px',
                                borderRadius: '6px'
                              }}>{getCompactGenres(event.genres)}</span>
                            )}
                            {event.vibe && (
                              <span style={{
                                fontSize: '11px',
                                color: '#666',
                                background: 'rgba(255,255,255,0.05)',
                                padding: '3px 8px',
                                borderRadius: '6px'
                              }}>{event.vibe}</span>
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
        )}

        {/* CSS Animations */}
        <style jsx global>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes slideDown {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </main>
    </div>
  )
}
