'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { supabase } from '../lib/supabase'

// ============================================================================
// APPLE-GRADE MOTION CONSTANTS (Atlas audit Round 4)
// ============================================================================
const SPRING = {
  sheet: 'cubic-bezier(0.175, 0.885, 0.32, 1.35)',
  sheetDuration: 300,
  ios: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
  iosDuration: 280,
  feedback: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  feedbackDuration: 60,
  settle: 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
  settleDuration: 420,
  springBack: 'cubic-bezier(0.34, 1.3, 0.64, 1)',
  springBackDuration: 220,
  snap: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  snapDuration: 240,
  emergence: 'cubic-bezier(0.42, 0.0, 0.58, 1.0)',
  emergenceDuration: 320,
  scrollSettle: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
  scrollSettleDuration: 180,
}

const GESTURE = {
  swipeThreshold: 96,
  velocityThreshold: 320,
  dismissThreshold: 110,
  dismissVelocity: 300,
  rubberBand: 0.22,
  edgeResistance: 0.18,
  scrollRubberBand: 0.15,
  peekAmount: 0.12,
  mapFriction: 0.965,
  minPanDuration: 280,
  maxPanDuration: 620,
  dismissScale: 0.97,
}

// ============================================================================
// TYPES
// ============================================================================
type Venue = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  venue_type: string
  instagram_url: string | null
  no_phones?: boolean  // Optional venue-level fallback
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
  so_pick?: boolean  // SO Pick editorial badge
  sold_out?: boolean // Sold out status
  description?: string | null // Event description/more info
  no_phones?: boolean // Event-level no-phones policy (takes priority)
}

type DateFilter = 'tonight' | 'tomorrow' | 'weekend' | string
type ViewMode = 'map' | 'preview' | 'detail' | 'list' | 'cluster'

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, { marker: mapboxgl.Marker; el: HTMLDivElement; inner: HTMLDivElement }>>(new Map())
  
  // Core state
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilter>('tonight')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [clusterEvents, setClusterEvents] = useState<Event[]>([])
  const [visibleDayLabel, setVisibleDayLabel] = useState<string>('') // Track visible day for sticky header
  
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [showIntro, setShowIntro] = useState(true) // Intro loading screen
  const [introPhase, setIntroPhase] = useState<'logo' | 'zoom' | 'done'>('logo')
  
  // Detail view state
  const [showAllGenres, setShowAllGenres] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  
  // User location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [showUserLocation, setShowUserLocation] = useState(false)
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  
  // Refs for scroll tracking
  const listScrollRef = useRef<HTMLDivElement>(null)
  const daySectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  
  // Gesture state
  const [dragX, setDragX] = useState(0)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragDirection, setDragDirection] = useState<'horizontal' | 'vertical' | null>(null)
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const [velocity, setVelocity] = useState({ x: 0, y: 0 })
  const lastPos = useRef({ x: 0, y: 0, time: 0 })

  // ============================================================================
  // DATE HELPERS
  // ============================================================================
  const getDateStr = (d: Date) => d.toDateString()
  
  const isTonight = (s: string) => getDateStr(new Date(s)) === getDateStr(new Date())
  
  const isTomorrow = (s: string) => {
    const t = new Date()
    t.setDate(t.getDate() + 1)
    return getDateStr(new Date(s)) === getDateStr(t)
  }
  
  const isWeekend = (s: string) => {
    const d = new Date(s), now = new Date(), day = now.getDay()
    const fri = new Date(now)
    fri.setDate(now.getDate() + ((5 - day + 7) % 7 || 7))
    if (day >= 5) fri.setDate(now.getDate())
    fri.setHours(0, 0, 0, 0)
    const sun = new Date(fri)
    sun.setDate(fri.getDate() + (7 - fri.getDay()))
    sun.setHours(23, 59, 59)
    return d >= fri && d <= sun
  }
  
  const getDateLabel = (s: string) => {
    if (isTonight(s)) return 'Tonight'
    if (isTomorrow(s)) return 'Tomorrow'
    return new Date(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }
  
  const getNext7Days = () => Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return { 
      str: getDateStr(d), 
      name: d.toLocaleDateString('en-GB', { weekday: 'short' }), 
      num: d.getDate() 
    }
  })

  // ============================================================================
  // FILTERED DATA
  // ============================================================================
  const filtered = useMemo(() => {
    switch (dateFilter) {
      case 'tonight': return events.filter(e => isTonight(e.start_time))
      case 'tomorrow': return events.filter(e => isTomorrow(e.start_time))
      case 'weekend': return events.filter(e => isWeekend(e.start_time))
      default: return events.filter(e => getDateStr(new Date(e.start_time)) === dateFilter)
    }
  }, [events, dateFilter])

  const current = filtered[currentIndex] || null
  const nextEvent = filtered[currentIndex + 1] || null
  const prevEvent = filtered[currentIndex - 1] || null
  
  // Better date label for grouping: "FRI 19 DEC"
  const getDayGroupLabel = (s: string) => {
    const d = new Date(s)
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()
  }
  
  const grouped = useMemo(() => {
    const g: Record<string, Event[]> = {}
    filtered.forEach(e => {
      const l = getDayGroupLabel(e.start_time)
      if (!g[l]) g[l] = []
      g[l].push(e)
    })
    return g
  }, [filtered])
  
  // Set initial visible day label when grouped changes
  useEffect(() => {
    const keys = Object.keys(grouped)
    if (keys.length > 0 && !visibleDayLabel) {
      setVisibleDayLabel(keys[0])
    }
  }, [grouped, visibleDayLabel])

  const filterLabel = dateFilter === 'tonight' ? 'tonight' 
    : dateFilter === 'tomorrow' ? 'tomorrow' 
    : dateFilter === 'weekend' ? 'this weekend' 
    : new Date(dateFilter).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })

  // ============================================================================
  // FORMAT HELPERS
  // ============================================================================
  const formatTime = (s: string) => new Date(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  
  // FIX: Proper price formatting - £1.50 not £1.5
  const formatPrice = (min: number | null, max: number | null) => {
    if (min === 0 || (!min && !max)) return null
    const fmt = (n: number) => {
      if (n % 1 === 0) return `£${n}`
      return `£${n.toFixed(2)}`
    }
    if (min && max && min !== max) return `${fmt(min)}–${fmt(max)}`
    return fmt(min || max || 0)
  }
  
  const isFree = (min: number | null, max: number | null) => min === 0 || (!min && !max)
  
  const getGenres = (g: string | null) => g ? g.split(',').map(x => x.trim()).slice(0, 2).join(' · ') : null
  
  const mapsUrl = (v: Venue) => `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`
  
  const getTicketUrl = (url: string | null) => {
    if (!url) return null
    if (!url.startsWith('http://') && !url.startsWith('https://')) return `https://${url}`
    return url
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  useEffect(() => {
    supabase.from('events').select('*, venue:venues(*)').eq('status', 'published')
      .gte('start_time', new Date().toISOString().split('T')[0]).order('start_time')
      .then(({ data }: { data: Event[] | null }) => { 
        if (data) setEvents(data)
        setLoading(false) 
      })
  }, [])

  // ============================================================================
  // MAP INITIALIZATION - With smooth intro animation
  // ============================================================================
  useEffect(() => {
    if (!mapContainer.current || map.current) return
    
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
    
    // Start zoomed out (globe view) for intro animation
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-1.6131, 54.9695], // Newcastle
      zoom: showIntro ? 2 : 14, // Start zoomed out if showing intro
      pitch: 0,
      bearing: 0,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
      renderWorldCopies: false,
      dragPan: !showIntro, // Disable pan during intro
      scrollZoom: !showIntro,
      doubleClickZoom: !showIntro,
      touchZoomRotate: !showIntro,
      fadeDuration: 0,
    })
    
    m.on('load', () => {
      setMapReady(true)
    })
    
    map.current = m
    return () => m.remove()
  }, [])

  // Intro animation sequence - FAST: 1 second total
  useEffect(() => {
    if (!showIntro || !mapReady || !map.current) return
    
    // Check if returning user (skip intro)
    const hasSeenIntro = localStorage.getItem('so_intro_seen')
    if (hasSeenIntro) {
      setShowIntro(false)
      map.current?.jumpTo({ center: [-1.6131, 54.9695], zoom: 14 })
      map.current?.dragPan.enable()
      map.current?.scrollZoom.enable()
      map.current?.doubleClickZoom.enable()
      map.current?.touchZoomRotate.enable()
      return
    }
    
    // Phase 1: Show logo briefly (300ms)
    const zoomTimer = setTimeout(() => {
      setIntroPhase('zoom')
      
      // Fast fly to Newcastle (600ms)
      map.current?.flyTo({
        center: [-1.6131, 54.9695],
        zoom: 14,
        duration: 600,
        easing: (t) => 1 - Math.pow(1 - t, 3), // Ease out cubic
        essential: true,
      })
      
      // Re-enable map interactions after animation
      setTimeout(() => {
        if (map.current) {
          map.current.dragPan.enable()
          map.current.scrollZoom.enable()
          map.current.doubleClickZoom.enable()
          map.current.touchZoomRotate.enable()
        }
      }, 600)
    }, 300)
    
    // Phase 2: Fade out intro overlay
    const fadeTimer = setTimeout(() => {
      setIntroPhase('done')
      localStorage.setItem('so_intro_seen', 'true')
    }, 800)
    
    // Phase 3: Remove intro completely
    const removeTimer = setTimeout(() => {
      setShowIntro(false)
    }, 1000)
    
    return () => {
      clearTimeout(zoomTimer)
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [showIntro, mapReady])

  // ============================================================================
  // USER LOCATION
  // ============================================================================
  const toggleUserLocation = useCallback(() => {
    if (showUserLocation) {
      // Turn off
      setShowUserLocation(false)
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }
    } else {
      // Turn on - request location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            setUserLocation({ lat: latitude, lng: longitude })
            setShowUserLocation(true)
          },
          (error) => {
            console.log('Location error:', error)
            alert('Unable to get your location. Please enable location services.')
          },
          { enableHighAccuracy: true, timeout: 10000 }
        )
      } else {
        alert('Geolocation is not supported by your browser.')
      }
    }
  }, [showUserLocation])

  // Update user marker when location changes
  useEffect(() => {
    if (!map.current || !mapReady || !showUserLocation || !userLocation) return
    
    // Remove existing marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
    }
    
    // Create user location marker
    const el = document.createElement('div')
    el.innerHTML = `
      <div style="position: relative;">
        <div style="width: 20px; height: 20px; background: #4285F4; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
        <div style="position: absolute; top: -4px; left: -4px; width: 28px; height: 28px; background: rgba(66,133,244,0.2); border-radius: 50%; animation: pulse 2s infinite;"></div>
      </div>
    `
    
    userMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map.current)
    
    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
      }
    }
  }, [userLocation, showUserLocation, mapReady])

  // ============================================================================
  // MARKER HIGHLIGHT - FIX: Lower z-index so markers don't overlap modals
  // ============================================================================
  const highlightMarker = useCallback((eventId: string | null) => {
    markersRef.current.forEach((data, id) => {
      const selected = eventId && id.includes(eventId)
      // Apply transforms to INNER element only (not the Mapbox-controlled outer element)
      if (data.inner) {
        data.inner.style.transition = `transform ${SPRING.feedbackDuration}ms ${SPRING.feedback}, filter ${SPRING.feedbackDuration}ms ease-out`
        data.inner.style.transform = selected ? 'scale(1.25)' : 'scale(1)'
        data.inner.style.filter = selected 
          ? 'drop-shadow(0 6px 10px rgba(0,0,0,0.5))' 
          : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
      }
      // Z-index can still be on outer element
      data.el.style.zIndex = selected ? '5' : '1'
    })
  }, [])

  // ============================================================================
  // MARKERS
  // ============================================================================
  useEffect(() => {
    if (!map.current || !mapReady) return
    
    // Clear old markers
    markersRef.current.forEach(d => d.marker.remove())
    markersRef.current.clear()
    
    if (filtered.length === 0) {
      map.current.flyTo({ 
        center: [-1.6131, 54.9695], 
        zoom: 14, 
        duration: 500, 
        easing: (t) => 1 - Math.pow(1 - t, 3) 
      })
      return
    }

    // Group by venue
    const byVenue: Record<string, Event[]> = {}
    filtered.forEach(e => {
      if (e.venue) {
        const k = `${e.venue.lat.toFixed(6)},${e.venue.lng.toFixed(6)}`
        if (!byVenue[k]) byVenue[k] = []
        byVenue[k].push(e)
      }
    })

    // Create markers
    Object.entries(byVenue).forEach(([key, evs]) => {
      const v = evs[0].venue!
      const count = evs.length
      const ids = evs.map(e => e.id).join(',')
      const hasCurated = evs.some(e => e.so_pick) // Check if any event is curated

      // Outer container - DO NOT apply transforms here (Mapbox uses transforms for positioning)
      const el = document.createElement('div')
      el.style.cursor = 'pointer'
      el.style.zIndex = '1'
      
      // Inner wrapper - this is where we apply scale transforms safely
      const inner = document.createElement('div')
      inner.style.transition = `transform ${SPRING.feedbackDuration}ms ${SPRING.feedback}, filter ${SPRING.feedbackDuration}ms ease-out`
      inner.style.transformOrigin = 'center bottom' // Scale from the pin point
      
      // Add halo glow for curated events
      if (hasCurated) {
        inner.style.filter = 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6)) drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
      } else {
        inner.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
      }

      if (count > 1) {
        el.style.width = '44px'
        el.style.height = '44px'
        // Add golden border for clusters with curated events
        const borderColor = hasCurated ? '#fbbf24' : 'white'
        inner.innerHTML = `<div style="width:44px;height:44px;background:linear-gradient(135deg,#ab67f7,#d7b3ff);border-radius:50%;border:3px solid ${borderColor};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:white;box-shadow:0 4px 12px rgba(0,0,0,0.3);">${count}</div>`
      } else {
        el.style.width = '32px'
        el.style.height = '42px'
        inner.innerHTML = `<svg viewBox="0 0 24 36" width="32" height="42"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="url(#g${ids.replace(/,/g, '')})"/><circle cx="12" cy="12" r="5" fill="${hasCurated ? '#fbbf24' : 'white'}"/><defs><linearGradient id="g${ids.replace(/,/g, '')}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ab67f7"/><stop offset="100%" stop-color="#d7b3ff"/></linearGradient></defs></svg>`
      }
      
      el.appendChild(inner)

      // Press feedback - apply to INNER element only
      el.onpointerdown = (e) => { 
        e.stopPropagation()
        inner.style.transform = 'scale(1.15)' 
        inner.style.transition = 'transform 60ms ease-out'
      }
      el.onpointerup = () => { 
        inner.style.transform = 'scale(1)'
        inner.style.transition = `transform ${SPRING.feedbackDuration}ms ${SPRING.feedback}`
      }
      el.onpointerleave = () => { 
        inner.style.transform = 'scale(1)'
        inner.style.transition = `transform ${SPRING.feedbackDuration}ms ${SPRING.feedback}`
      }

      el.onclick = (e) => {
        e.stopPropagation()
        e.preventDefault()
        
        // Open sheet FIRST (before any map animation)
        if (count > 1) {
          setClusterEvents(evs)
          setViewMode('cluster')
        } else {
          const idx = filtered.findIndex(x => x.id === evs[0].id)
          setCurrentIndex(idx)
          setViewMode('preview')
        }
        
        // Make sheet visible after state is set
        requestAnimationFrame(() => {
          setSheetVisible(true)
          highlightMarker(evs[0].id)
        })
        
        // Gentle pan to center the marker (no aggressive zoom change)
        const currentZoom = map.current?.getZoom() || 14
        map.current?.easeTo({ 
          center: [v.lng, v.lat], 
          zoom: Math.max(currentZoom, 14.5),
          duration: 300,
          easing: (t) => 1 - Math.pow(1 - t, 2)
        })
      }

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([v.lng, v.lat])
        .addTo(map.current!)
      
      markersRef.current.set(ids, { marker, el, inner })
    })

    // Fit bounds
    if (filtered.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      filtered.forEach(e => { if (e.venue) bounds.extend([e.venue.lng, e.venue.lat]) })
      map.current.fitBounds(bounds, { 
        padding: { top: 180, bottom: 150, left: 40, right: 40 }, 
        maxZoom: 15,
        minZoom: 13,
        duration: 600 
      })
    }
  }, [filtered, mapReady, highlightMarker])

  // ============================================================================
  // SHEET CONTROLS
  // ============================================================================
  const openSheet = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setSheetVisible(true)
      })
    })
  }, [])

  const closeSheet = useCallback(() => {
    setSheetVisible(false)
    setVisibleDayLabel('') // Reset for next open
    setTimeout(() => {
      setViewMode('map')
      highlightMarker(null)
    }, SPRING.springBackDuration)
  }, [highlightMarker])

  // Handle scroll to update visible day header
  const handleListScroll = useCallback(() => {
    if (!listScrollRef.current) return
    
    const scrollTop = listScrollRef.current.scrollTop
    const dayLabels = Object.keys(grouped)
    
    // Find which day section is currently visible
    for (let i = dayLabels.length - 1; i >= 0; i--) {
      const section = daySectionRefs.current.get(dayLabels[i])
      if (section && section.offsetTop <= scrollTop + 50) {
        if (visibleDayLabel !== dayLabels[i]) {
          setVisibleDayLabel(dayLabels[i])
        }
        break
      }
    }
  }, [grouped, visibleDayLabel])

  // ============================================================================
  // NAVIGATION
  // ============================================================================
  const navigate = useCallback((dir: 'prev' | 'next', fromVelocity = false) => {
    if (isAnimating) return
    const newIdx = dir === 'next' ? currentIndex + 1 : currentIndex - 1
    if (newIdx < 0 || newIdx >= filtered.length) return

    setIsAnimating(true)
    setCurrentIndex(newIdx)
    highlightMarker(filtered[newIdx].id)
    
    if (filtered[newIdx].venue) {
      const currentZoom = map.current?.getZoom() || 14
      map.current?.easeTo({ 
        center: [filtered[newIdx].venue!.lng, filtered[newIdx].venue!.lat], 
        zoom: Math.max(currentZoom, 14.5),
        duration: fromVelocity ? 200 : 300,
        easing: (t) => 1 - Math.pow(1 - t, 2)
      })
    }

    setTimeout(() => setIsAnimating(false), fromVelocity ? 180 : 280)
  }, [isAnimating, currentIndex, filtered, highlightMarker])

  // ============================================================================
  // TOUCH HANDLERS
  // ============================================================================
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    const now = Date.now()
    setStartX(touch.clientX)
    setStartY(touch.clientY)
    setIsDragging(true)
    setDragDirection(null)
    lastPos.current = { x: touch.clientX, y: touch.clientY, time: now }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const touch = e.touches[0]
    const now = Date.now()
    const dx = touch.clientX - startX
    const dy = touch.clientY - startY
    
    // Calculate velocity
    const dt = now - lastPos.current.time
    if (dt > 0) {
      setVelocity({
        x: (touch.clientX - lastPos.current.x) / dt * 1000,
        y: (touch.clientY - lastPos.current.y) / dt * 1000
      })
    }
    lastPos.current = { x: touch.clientX, y: touch.clientY, time: now }
    
    // Lock direction
    if (!dragDirection) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        setDragDirection(Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical')
      }
    }
    
    if (dragDirection === 'horizontal') {
      let adjustedDx = dx
      if ((currentIndex === 0 && dx > 0) || (currentIndex === filtered.length - 1 && dx < 0)) {
        adjustedDx = dx * GESTURE.rubberBand
      }
      setDragX(adjustedDx)
      setDragY(0)
      e.preventDefault()
    } else if (dragDirection === 'vertical' && dy > 0) {
      setDragY(dy)
      setDragX(0)
      e.preventDefault()
    }
  }

  const onTouchEnd = () => {
    setIsDragging(false)
    
    const absVelocityX = Math.abs(velocity.x)
    const absVelocityY = velocity.y
    
    // Horizontal swipe
    if (dragDirection === 'horizontal') {
      if (absVelocityX > GESTURE.velocityThreshold && Math.abs(dragX) > 20) {
        if (velocity.x < 0) navigate('next', true)
        else navigate('prev', true)
      } else if (Math.abs(dragX) > GESTURE.swipeThreshold) {
        if (dragX < 0) navigate('next')
        else navigate('prev')
      }
    }
    
    // Vertical dismiss
    if (dragDirection === 'vertical') {
      const shouldDismiss = dragY > GESTURE.dismissThreshold || absVelocityY > GESTURE.dismissVelocity
      
      if (shouldDismiss) {
        if (viewMode === 'detail') {
          setViewMode('preview')
        } else if (viewMode === 'preview') {
          closeSheet()
        } else if (viewMode === 'list') {
          closeSheet()
        } else if (viewMode === 'cluster') {
          closeSheet()
        }
      }
    }
    
    setDragX(0)
    setDragY(0)
    setDragDirection(null)
    setVelocity({ x: 0, y: 0 })
  }

  // Mouse handlers
  const onMouseDown = (e: React.MouseEvent) => {
    const now = Date.now()
    setStartX(e.clientX)
    setStartY(e.clientY)
    setIsDragging(true)
    setDragDirection(null)
    lastPos.current = { x: e.clientX, y: e.clientY, time: now }
    e.preventDefault()
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const now = Date.now()
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    
    const dt = now - lastPos.current.time
    if (dt > 0) {
      setVelocity({
        x: (e.clientX - lastPos.current.x) / dt * 1000,
        y: (e.clientY - lastPos.current.y) / dt * 1000
      })
    }
    lastPos.current = { x: e.clientX, y: e.clientY, time: now }
    
    if (!dragDirection) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        setDragDirection(Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical')
      }
    }
    
    if (dragDirection === 'horizontal') {
      let adjustedDx = dx
      if ((currentIndex === 0 && dx > 0) || (currentIndex === filtered.length - 1 && dx < 0)) {
        adjustedDx = dx * GESTURE.rubberBand
      }
      setDragX(adjustedDx)
      setDragY(0)
    } else if (dragDirection === 'vertical' && dy > 0) {
      setDragY(dy)
      setDragX(0)
    }
  }

  const onMouseUp = () => {
    if (!isDragging) return
    onTouchEnd()
  }

  const onMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false)
      setDragX(0)
      setDragY(0)
      setDragDirection(null)
      setVelocity({ x: 0, y: 0 })
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (viewMode === 'preview' || viewMode === 'detail') {
        if (e.key === 'ArrowLeft') navigate('prev')
        if (e.key === 'ArrowRight') navigate('next')
        if (e.key === 'Escape') closeSheet()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [viewMode, navigate, closeSheet])

  // ============================================================================
  // TRANSFORM HELPERS
  // ============================================================================
  const getCardTransform = () => {
    if (isDragging && dragX !== 0) {
      return { 
        transform: `translateX(${dragX}px) rotate(${dragX * 0.015}deg)`,
        transition: 'none',
      }
    }
    return { 
      transform: 'translateX(0) rotate(0)',
      transition: `transform ${SPRING.snapDuration}ms ${SPRING.snap}`,
    }
  }

  const getDismissTransform = () => {
    if (isDragging && dragY > 0) {
      const progress = Math.min(dragY / 200, 1)
      const scale = 1 - progress * (1 - GESTURE.dismissScale)
      return { 
        transform: `translateY(${dragY}px) scale(${scale})`, 
        opacity: 1 - progress * 0.35,
        transition: 'none' 
      }
    }
    return { 
      transform: 'translateY(0) scale(1)', 
      opacity: 1, 
      transition: `all ${SPRING.springBackDuration}ms ${SPRING.springBack}` 
    }
  }

  const getSheetStyle = (isVisible: boolean): React.CSSProperties => ({
    transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
    transition: isVisible 
      ? `transform ${SPRING.sheetDuration}ms ${SPRING.sheet}` 
      : `transform ${SPRING.springBackDuration}ms ${SPRING.springBack}`,
  })

  const selectEvent = (e: Event) => {
    const idx = filtered.findIndex(x => x.id === e.id)
    setCurrentIndex(idx)
    setShowAllGenres(false) // Reset expanded genres
    setShowDescription(false) // Reset description dropdown
    highlightMarker(e.id)
    openSheet('preview')
    if (e.venue) {
      const currentZoom = map.current?.getZoom() || 14
      map.current?.easeTo({ 
        center: [e.venue.lng, e.venue.lat], 
        zoom: Math.max(currentZoom, 14.5),
        duration: 300,
        easing: (t) => 1 - Math.pow(1 - t, 2)
      })
    }
  }

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const listItemHeight = 85
  const maxVisibleItems = 3.5
  const listContentHeight = Math.min(Object.values(grouped).flat().length, maxVisibleItems) * listItemHeight + 80

  const noSelectStyle: React.CSSProperties = {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'none',
  }

  const peekProgress = Math.min(Math.abs(dragX) / 150, 1)
  const showNextPeek = dragX < -20 && currentIndex < filtered.length - 1
  const showPrevPeek = dragX > 20 && currentIndex > 0
  const dismissProgress = Math.min(dragY / GESTURE.dismissThreshold, 1)

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', justifyContent: 'center' }}>
      <main style={{ height: '100vh', width: '100%', maxWidth: '480px', position: 'relative', overflow: 'hidden' }}>
        
        {/* Map - z-index 1 */}
        <div ref={mapContainer} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />

        {/* Intro Loading Screen - z-index 100 */}
        {showIntro && (
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 100,
              background: '#0a0a0b',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: introPhase === 'done' ? 0 : 1,
              transition: 'opacity 500ms ease-out',
              pointerEvents: introPhase === 'done' ? 'none' : 'auto',
            }}
          >
            {/* Logo animation */}
            <div style={{
              transform: introPhase === 'zoom' ? 'scale(0.8) translateY(-20px)' : 'scale(1)',
              opacity: introPhase === 'zoom' ? 0.6 : 1,
              transition: 'all 800ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
              <img 
                src="/logo.svg" 
                alt="Sounded Out" 
                style={{ 
                  height: '40px', 
                  width: 'auto',
                  filter: 'drop-shadow(0 4px 20px rgba(171, 103, 247, 0.3))',
                }}
              />
            </div>
            
            {/* Subtle loading indicator */}
            <div style={{
              marginTop: '24px',
              opacity: introPhase === 'logo' ? 1 : 0,
              transition: 'opacity 300ms ease',
            }}>
              <div style={{
                width: '40px',
                height: '3px',
                background: 'rgba(171, 103, 247, 0.2)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: '50%',
                  height: '100%',
                  background: '#ab67f7',
                  borderRadius: '2px',
                  animation: 'loadingSlide 1s ease-in-out infinite',
                }} />
              </div>
            </div>
            
            {/* Location text that fades in during zoom */}
            <p style={{
              marginTop: '16px',
              fontSize: '13px',
              color: '#666',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              opacity: introPhase === 'zoom' ? 1 : 0,
              transform: introPhase === 'zoom' ? 'translateY(0)' : 'translateY(10px)',
              transition: 'all 600ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
              Newcastle
            </p>
          </div>
        )}

        {/* Click overlay - z-index 10 */}
        {(viewMode === 'preview' || viewMode === 'cluster') && (
          <div 
            onClick={closeSheet}
            style={{ 
              position: 'absolute', 
              inset: 0, 
              zIndex: 10,
              background: 'transparent',
              cursor: 'pointer'
            }}
          />
        )}

        {/* Header - z-index 20 */}
        <header style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '12px 20px 16px', // Reduced top padding
          paddingTop: 'max(12px, env(safe-area-inset-top, 12px))', // Use safe area if available
          background: 'linear-gradient(to bottom, rgba(10,10,11,0.98) 0%, rgba(10,10,11,0.9) 60%, transparent 100%)',
          zIndex: viewMode === 'detail' ? 5 : 20,
          opacity: viewMode === 'detail' ? 0.3 : 1,
          transition: `opacity ${SPRING.iosDuration}ms ${SPRING.ios}`,
          pointerEvents: viewMode === 'detail' ? 'none' : 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              {/* Logo image instead of text */}
              <img 
                src="/logo.svg" 
                alt="Sounded Out" 
                style={{ height: '26px', width: 'auto', marginBottom: '2px' }}
              />
              <p style={{ fontSize: '12px', color: '#888', marginTop: '2px', marginBottom: '12px' }}>Newcastle</p>
            </div>
            {/* User location toggle */}
            <button
              onClick={toggleUserLocation}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: showUserLocation ? '#4285F4' : 'rgba(255,255,255,0.1)',
                color: showUserLocation ? 'white' : '#888',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: `all ${SPRING.iosDuration}ms ${SPRING.ios}`,
              }}
              title={showUserLocation ? 'Hide my location' : 'Show my location'}
            >
              📍
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['tonight', 'tomorrow', 'weekend'] as const).map(f => (
              <button 
                key={f} 
                onClick={() => { 
                  setDateFilter(f)
                  setCurrentIndex(0)
                  setViewMode('map')
                  setSheetVisible(false) 
                }} 
                style={{
                  padding: '8px 14px', 
                  borderRadius: '20px', 
                  border: 'none', 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  background: dateFilter === f ? '#ab67f7' : 'rgba(255,255,255,0.1)',
                  color: dateFilter === f ? 'white' : '#888',
                  transition: `all ${SPRING.iosDuration}ms ${SPRING.ios}`,
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
              }}
            >
              {showDatePicker ? '✕' : 'More'}
            </button>
          </div>

          {showDatePicker && (
            <div style={{ 
              marginTop: '12px', 
              padding: '14px', 
              background: '#1a1a1f', 
              borderRadius: '16px',
              animation: 'slideDown 200ms ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {getNext7Days().map(d => (
                  <button 
                    key={d.str} 
                    onClick={() => { 
                      setDateFilter(d.str)
                      setShowDatePicker(false)
                      setCurrentIndex(0)
                      setViewMode('map') 
                    }} 
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
                      background: dateFilter === d.str ? '#ab67f7' : 'transparent',
                      color: dateFilter === d.str ? 'white' : '#888',
                    }}
                  >
                    <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>{d.name}</span>
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>{d.num}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* Bottom Bar - z-index 15 */}
        {viewMode === 'map' && (
          <div 
            onClick={() => openSheet('list')} 
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '24px 20px 30px',
              background: 'linear-gradient(to top, rgba(10,10,11,1) 0%, rgba(10,10,11,0.95) 60%, transparent 100%)',
              zIndex: 15, 
              cursor: 'pointer'
            }}
          >
            <div style={{
              background: '#1a1a1f', 
              border: '1px solid rgba(255,255,255,0.08)', 
              borderRadius: '16px', 
              padding: '16px 20px',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '15px' }}>
                <span style={{ color: '#ab67f7', fontWeight: 700 }}>
                  {loading ? '...' : filtered.length}
                </span>
                {' '}{filtered.length === 1 ? 'event' : 'events'} {filterLabel}
              </span>
              <span style={{ color: '#ab67f7', fontSize: '20px' }}>↑</span>
            </div>
          </div>
        )}

        {/* List View - z-index 30 */}
        {viewMode === 'list' && (
          <div 
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: '#141416', borderRadius: '24px 24px 0 0',
              zIndex: 30, 
              display: 'flex', 
              flexDirection: 'column',
              maxHeight: '70vh',
              ...getSheetStyle(sheetVisible),
              ...getDismissTransform(),
            }}
          >
            {/* Drag Handle - Only this area triggers sheet dismiss */}
            <div 
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{
                padding: '12px 20px 14px', 
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: '#141416', 
                borderRadius: '24px 24px 0 0',
                flexShrink: 0,
                cursor: 'grab',
                touchAction: 'none', // Prevent scroll interference
              }} 
            >
              <div 
                onClick={closeSheet}
                style={{ 
                  width: '48px', 
                  height: '5px', 
                  background: dismissProgress > 0.5 ? '#ab67f7' : '#666', 
                  borderRadius: '3px', 
                  margin: '0 auto 14px',
                  transition: 'background 150ms ease',
                }} 
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* Dynamic sticky header - updates as you scroll */}
                <h3 style={{ 
                  fontSize: '14px', 
                  fontWeight: 700, 
                  color: '#ab67f7', 
                  textTransform: 'uppercase',
                  transition: 'opacity 150ms ease',
                }}>
                  {visibleDayLabel || Object.keys(grouped)[0] || filterLabel}
                </h3>
                <span style={{ fontSize: '12px', color: '#666' }}>Pull down to close</span>
              </div>
            </div>
            
            {/* Scrollable event list - isolated scroll that won't dismiss sheet */}
            <div 
              ref={listScrollRef}
              onScroll={handleListScroll}
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '8px 20px 30px',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y', // Allow vertical scroll only
              }}
            >
              {Object.entries(grouped).map(([label, evs], gi) => (
                <div 
                  key={label} 
                  ref={(el) => { if (el) daySectionRefs.current.set(label, el) }}
                  style={{ marginTop: gi > 0 ? '24px' : '0' }}
                >
                  {/* Day separator - always show for multi-day views */}
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: 700, 
                    color: gi === 0 ? 'transparent' : '#555', // Hide first one since it's in header
                    textTransform: 'uppercase', 
                    marginBottom: '12px',
                    paddingBottom: gi > 0 ? '8px' : '0',
                    borderBottom: gi > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}>
                    {label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {evs.map(e => (
                      <div 
                        key={e.id} 
                        onClick={() => selectEvent(e)} 
                        style={{
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          gap: '12px', 
                          padding: '12px 14px',
                          background: '#1e1e24', 
                          borderRadius: '14px', 
                          cursor: 'pointer',
                          transition: `transform ${SPRING.feedbackDuration}ms ${SPRING.feedback}`,
                        }}
                        onPointerDown={(ev) => (ev.currentTarget.style.transform = 'scale(0.98)')}
                        onPointerUp={(ev) => (ev.currentTarget.style.transform = 'scale(1)')}
                        onPointerLeave={(ev) => (ev.currentTarget.style.transform = 'scale(1)')}
                      >
                        <span style={{ 
                          fontSize: '13px', 
                          color: '#ab67f7', 
                          fontWeight: 700, 
                          minWidth: '48px',
                          paddingTop: '2px',
                        }}>
                          {formatTime(e.start_time)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '3px',
                          }}>
                            {/* SO PICK badge - Star glyph */}
                            {e.so_pick && (
                              <span style={{
                                fontSize: '12px',
                                color: '#fbbf24',
                                textShadow: '0 0 6px rgba(251, 191, 36, 0.5)',
                              }}>
                                ★
                              </span>
                            )}
                            <span style={{ 
                              fontSize: '14px', 
                              fontWeight: 600, 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis' 
                            }}>
                              {e.title}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{e.venue?.name}</div>
                          {/* Genre/vibe indicator for differentiation */}
                          {(e.genres || e.vibe) && (
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#555',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {e.genres?.split(',').slice(0, 2).map(g => g.trim()).join(' · ') || e.vibe}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          {e.sold_out && (
                            <span style={{ 
                              fontSize: '10px', 
                              fontWeight: 700, 
                              color: '#f87171', 
                              background: 'rgba(248,113,113,0.15)', 
                              padding: '3px 6px', 
                              borderRadius: '4px' 
                            }}>
                              SOLD OUT
                            </span>
                          )}
                          {isFree(e.price_min, e.price_max) ? (
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: 700, 
                              color: '#22c55e', 
                              background: 'rgba(34,197,94,0.15)', 
                              padding: '4px 8px', 
                              borderRadius: '6px' 
                            }}>
                              FREE
                            </span>
                          ) : formatPrice(e.price_min, e.price_max) && (
                            <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>
                              {formatPrice(e.price_min, e.price_max)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <p style={{ color: '#555', marginBottom: '12px' }}>No events {filterLabel}</p>
                  <p style={{ color: '#444', fontSize: '13px' }}>Try selecting a different date</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cluster Selection - z-index 30 */}
        {viewMode === 'cluster' && (
          <div 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: '#141416', borderRadius: '24px 24px 0 0',
              padding: '12px 20px 40px',
              paddingBottom: 'max(40px, env(safe-area-inset-bottom, 40px))',
              zIndex: 30,
              ...getSheetStyle(sheetVisible),
              ...getDismissTransform(),
            }}
          >
            <div 
              onClick={closeSheet} 
              style={{ 
                width: '48px', 
                height: '5px', 
                background: dismissProgress > 0.5 ? '#ab67f7' : '#666',
                borderRadius: '3px', 
                margin: '0 auto 16px', 
                cursor: 'pointer',
                transition: 'background 150ms ease',
              }} 
            />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ab67f7', marginBottom: '14px' }}>
              {clusterEvents.length} events here
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {clusterEvents.map(e => (
                <div 
                  key={e.id} 
                  onClick={() => selectEvent(e)} 
                  style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '14px',
                    background: '#1e1e24', 
                    borderRadius: '14px', 
                    cursor: 'pointer',
                    transition: `transform ${SPRING.feedbackDuration}ms ${SPRING.feedback}`,
                  }}
                  onPointerDown={(ev) => (ev.currentTarget.style.transform = 'scale(0.98)')}
                  onPointerUp={(ev) => (ev.currentTarget.style.transform = 'scale(1)')}
                  onPointerLeave={(ev) => (ev.currentTarget.style.transform = 'scale(1)')}
                >
                  <span style={{ fontSize: '13px', color: '#ab67f7', fontWeight: 700, minWidth: '48px' }}>
                    {formatTime(e.start_time)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>{e.title}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{getGenres(e.genres)}</div>
                  </div>
                  {isFree(e.price_min, e.price_max) ? (
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      color: '#22c55e', 
                      background: 'rgba(34,197,94,0.15)', 
                      padding: '4px 8px', 
                      borderRadius: '6px' 
                    }}>
                      FREE
                    </span>
                  ) : formatPrice(e.price_min, e.price_max) && (
                    <span style={{ fontSize: '12px', color: '#888' }}>
                      {formatPrice(e.price_min, e.price_max)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview Card - z-index 30 */}
        {viewMode === 'preview' && current && (
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: '#141416', borderRadius: '24px 24px 0 0',
              padding: '12px 20px 40px', // Increased bottom padding to prevent cutoff
              paddingBottom: 'max(40px, env(safe-area-inset-bottom, 40px))', // Respect safe area
              zIndex: 30,
              ...noSelectStyle,
              ...getSheetStyle(sheetVisible),
              ...(dragDirection === 'horizontal' ? getCardTransform() : getDismissTransform()),
            }}
          >
            {/* Peek indicators */}
            {showPrevPeek && prevEvent && (
              <div style={{
                position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(171,103,247,0.9)', borderRadius: '4px', padding: '4px 8px',
                opacity: peekProgress * 0.9, fontSize: '11px', fontWeight: 600, color: 'white',
              }}>
                ← {prevEvent.title.slice(0, 12)}...
              </div>
            )}
            {showNextPeek && nextEvent && (
              <div style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(171,103,247,0.9)', borderRadius: '4px', padding: '4px 8px',
                opacity: peekProgress * 0.9, fontSize: '11px', fontWeight: 600, color: 'white',
              }}>
                {nextEvent.title.slice(0, 12)}... →
              </div>
            )}

            {/* Handle */}
            <div 
              onClick={closeSheet} 
              style={{ 
                width: '100%', 
                padding: '8px 0', 
                cursor: 'pointer',
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '6px'
              }}
            >
              <div style={{ 
                width: '48px', 
                height: '5px', 
                background: dismissProgress > 0.8 ? '#ab67f7' : '#666',
                borderRadius: '3px',
                transition: 'background 150ms ease',
              }} />
              <span style={{ fontSize: '10px', color: dismissProgress > 0.8 ? '#ab67f7' : '#555' }}>
                {dismissProgress > 0.8 ? 'Release to close' : 'Pull down to close'}
              </span>
            </div>

            {/* Progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '14px', marginTop: '8px' }}>
              {filtered.slice(0, 8).map((_, i) => (
                <div 
                  key={i} 
                  style={{
                    width: i === currentIndex ? '20px' : '6px', 
                    height: '6px', 
                    borderRadius: '3px',
                    background: i === currentIndex ? '#ab67f7' : 'rgba(255,255,255,0.15)',
                    transition: `all ${SPRING.iosDuration}ms ${SPRING.ios}`,
                  }} 
                />
              ))}
              {filtered.length > 8 && (
                <span style={{ fontSize: '10px', color: '#444' }}>+{filtered.length - 8}</span>
              )}
            </div>

            {/* Content */}
            <div style={{ display: 'flex', gap: '14px', ...noSelectStyle }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 700, marginBottom: '6px' }}>
                  {formatTime(current.start_time)} · {getDateLabel(current.start_time)}
                </p>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                  {current.so_pick && (
                    <span style={{
                      fontSize: '16px',
                      color: '#fbbf24',
                      textShadow: '0 0 8px rgba(251, 191, 36, 0.5)',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}>
                      ★
                    </span>
                  )}
                  <h3 style={{ fontSize: '20px', fontWeight: 800, lineHeight: 1.2 }}>
                    {current.title}
                  </h3>
                </div>
                <p style={{ fontSize: '14px', color: '#888', marginBottom: '10px' }}>
                  {current.venue?.name}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {current.sold_out && (
                    <span style={{ 
                      padding: '5px 10px', 
                      background: 'rgba(255,255,255,0.1)', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      fontWeight: 700, 
                      color: '#666' 
                    }}>
                      SOLD OUT
                    </span>
                  )}
                  {isFree(current.price_min, current.price_max) && (
                    <span style={{ 
                      padding: '5px 10px', 
                      background: 'rgba(34,197,94,0.15)', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      fontWeight: 700, 
                      color: '#22c55e' 
                    }}>
                      FREE
                    </span>
                  )}
                  {formatPrice(current.price_min, current.price_max) && (
                    <span style={{ 
                      padding: '5px 10px', 
                      background: 'rgba(255,255,255,0.08)', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      fontWeight: 600 
                    }}>
                      {formatPrice(current.price_min, current.price_max)}
                    </span>
                  )}
                  {getGenres(current.genres) && (
                    <span style={{ 
                      padding: '5px 10px', 
                      background: 'rgba(171,103,247,0.12)', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      color: '#ab67f7' 
                    }}>
                      {getGenres(current.genres)}
                    </span>
                  )}
                </div>
              </div>
              {current.image_url && (
                <div style={{ width: '75px', height: '75px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
                  <img 
                    src={current.image_url} 
                    alt="" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} 
                    draggable={false} 
                  />
                </div>
              )}
            </div>

            {/* View Details Button */}
            <button 
              onClick={() => setViewMode('detail')} 
              style={{
                width: '100%', 
                padding: '14px', 
                marginTop: '16px',
                background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                border: 'none', 
                borderRadius: '14px', 
                fontSize: '15px', 
                fontWeight: 700, 
                color: 'white', 
                cursor: 'pointer',
                transition: `transform ${SPRING.feedbackDuration}ms ${SPRING.feedback}`,
              }}
              onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
              onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              VIEW DETAILS
            </button>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); navigate('prev') }} 
                disabled={currentIndex === 0}
                style={{
                  background: currentIndex === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(171,103,247,0.2)',
                  border: currentIndex === 0 ? 'none' : '1px solid rgba(171,103,247,0.3)',
                  borderRadius: '12px', 
                  padding: '12px 18px',
                  color: currentIndex === 0 ? '#333' : '#ab67f7',
                  fontSize: '14px', 
                  fontWeight: 600, 
                  cursor: currentIndex === 0 ? 'default' : 'pointer',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  ...noSelectStyle
                }}
              >
                <span style={{ fontSize: '18px' }}>←</span> Prev
              </button>
              <span style={{ fontSize: '13px', color: '#555' }}>{currentIndex + 1} / {filtered.length}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); navigate('next') }} 
                disabled={currentIndex === filtered.length - 1}
                style={{
                  background: currentIndex === filtered.length - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(171,103,247,0.2)',
                  border: currentIndex === filtered.length - 1 ? 'none' : '1px solid rgba(171,103,247,0.3)',
                  borderRadius: '12px', 
                  padding: '12px 18px',
                  color: currentIndex === filtered.length - 1 ? '#333' : '#ab67f7',
                  fontSize: '14px', 
                  fontWeight: 600, 
                  cursor: currentIndex === filtered.length - 1 ? 'default' : 'pointer',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  ...noSelectStyle
                }}
              >
                Next <span style={{ fontSize: '18px' }}>→</span>
              </button>
            </div>
          </div>
        )}

        {/* Detail Modal - z-index 50 (HIGHEST - fixes marker overlap) */}
        {viewMode === 'detail' && current && (
          <div 
            onClick={() => setViewMode('preview')} 
            style={{
              position: 'absolute', inset: 0, 
              background: 'rgba(0,0,0,0.8)', 
              zIndex: 50,
              display: 'flex', 
              alignItems: 'flex-end',
              transition: `opacity ${SPRING.settleDuration}ms ${SPRING.settle}`,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseLeave}
              style={{
                width: '100%', 
                maxHeight: '90vh', 
                background: '#141416', 
                borderRadius: '24px 24px 0 0',
                padding: '12px 20px 36px', 
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                ...noSelectStyle,
                ...(dragDirection === 'horizontal' ? getCardTransform() : getDismissTransform()),
              }}
            >
              {/* Handle */}
              <div 
                onClick={() => setViewMode('preview')} 
                style={{ 
                  width: '100%', 
                  padding: '8px 0 14px', 
                  cursor: 'pointer',
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '6px'
                }}
              >
                <div style={{ 
                  width: '48px', 
                  height: '5px', 
                  background: dismissProgress > 0.8 ? '#ab67f7' : '#666',
                  borderRadius: '3px',
                  transition: 'background 150ms ease',
                }} />
                <span style={{ fontSize: '10px', color: dismissProgress > 0.8 ? '#ab67f7' : '#555' }}>
                  {dismissProgress > 0.8 ? 'Release to close' : 'Pull down to close'}
                </span>
              </div>

              {/* Image */}
              {current.image_url ? (
                <div style={{ 
                  width: '100%', 
                  aspectRatio: '16/9', 
                  borderRadius: '16px', 
                  overflow: 'hidden', 
                  marginBottom: '18px' 
                }}>
                  <img 
                    src={current.image_url} 
                    alt="" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} 
                    draggable={false} 
                  />
                </div>
              ) : (
                <div style={{ 
                  width: '100%', 
                  aspectRatio: '16/9', 
                  background: 'linear-gradient(135deg, #252530, #1a1a22)', 
                  borderRadius: '16px', 
                  marginBottom: '18px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#333' 
                }}>
                  No image
                </div>
              )}

              {/* Date/Time */}
              <p style={{ 
                fontSize: '12px', 
                color: '#ab67f7', 
                fontWeight: 700, 
                textTransform: 'uppercase', 
                marginBottom: '8px' 
              }}>
                {getDateLabel(current.start_time)} · {formatTime(current.start_time)}
                {current.end_time && ` – ${formatTime(current.end_time)}`}
              </p>

              {/* Title with SO Pick badge */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                {current.so_pick && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#fbbf24',
                    background: 'rgba(251, 191, 36, 0.15)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    flexShrink: 0,
                    marginTop: '4px',
                  }}>
                    <span style={{ fontSize: '12px' }}>★</span> CURATED
                  </span>
                )}
                <h2 style={{ 
                  fontSize: '26px', 
                  fontWeight: 800, 
                  lineHeight: 1.2, 
                  ...noSelectStyle 
                }}>
                  {current.title}
                </h2>
              </div>

              {/* Venue */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '15px', color: '#888' }}>{current.venue?.name}</span>
                {current.venue?.instagram_url && (
                  <a 
                    href={current.venue.instagram_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ fontSize: '16px' }}
                  >
                    📸
                  </a>
                )}
              </div>
              
              {/* No-phone policy indicator - Event level takes priority */}
              {(current.no_phones || current.venue?.no_phones) && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  background: 'rgba(255,200,50,0.08)',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  border: '1px solid rgba(255,200,50,0.15)',
                }}>
                  <span style={{ fontSize: '18px' }}>📵</span>
                  <span style={{ fontSize: '13px', color: '#ffc832' }}>
                    No phones policy — enjoy the moment
                  </span>
                </div>
              )}

              {/* Tags - Collapsible genres */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {current.sold_out && (
                    <span style={{ 
                      padding: '8px 14px', 
                      background: 'rgba(248,113,113,0.15)', 
                      borderRadius: '10px', 
                      fontSize: '14px', 
                      fontWeight: 700, 
                      color: '#f87171' 
                    }}>
                      SOLD OUT
                    </span>
                  )}
                  {isFree(current.price_min, current.price_max) && (
                    <span style={{ 
                      padding: '8px 14px', 
                      background: 'rgba(34,197,94,0.15)', 
                      borderRadius: '10px', 
                      fontSize: '14px', 
                      fontWeight: 700, 
                      color: '#22c55e' 
                    }}>
                      FREE
                    </span>
                  )}
                  {/* Show first 4 genres, then +X more */}
                  {current.genres?.split(',').slice(0, showAllGenres ? undefined : 4).map((g, i) => (
                    <span 
                      key={i} 
                      style={{ 
                        padding: '8px 14px', 
                        background: 'rgba(171,103,247,0.12)', 
                        borderRadius: '10px', 
                        fontSize: '14px', 
                        color: '#ab67f7' 
                      }}
                    >
                      {g.trim()}
                    </span>
                  ))}
                  {/* Show +X more button if more than 4 genres */}
                  {current.genres && current.genres.split(',').length > 4 && !showAllGenres && (
                    <button
                      onClick={() => setShowAllGenres(true)}
                      style={{
                        padding: '8px 14px',
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        fontSize: '14px',
                        color: '#888',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      +{current.genres.split(',').length - 4} more
                    </button>
                  )}
                  {current.vibe && (
                    <span style={{ 
                      padding: '8px 14px', 
                      background: 'rgba(56, 189, 248, 0.15)', 
                      borderRadius: '10px', 
                      fontSize: '14px', 
                      color: '#38bdf8',
                      fontStyle: 'italic',
                    }}>
                      {current.vibe}
                    </span>
                  )}
                </div>
              </div>

              {/* Price */}
              {!isFree(current.price_min, current.price_max) && formatPrice(current.price_min, current.price_max) && (
                <p style={{ fontSize: '22px', fontWeight: 700, marginBottom: '16px' }}>
                  {formatPrice(current.price_min, current.price_max)}
                </p>
              )}

              {/* Description dropdown - More Info */}
              {current.description && (
                <div style={{ marginBottom: '16px' }}>
                  <button
                    onClick={() => setShowDescription(!showDescription)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#888',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>More Info</span>
                    <span style={{ 
                      transform: showDescription ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 200ms ease',
                    }}>
                      ▼
                    </span>
                  </button>
                  {showDescription && (
                    <div style={{
                      padding: '14px 16px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '0 0 12px 12px',
                      marginTop: '-1px',
                      borderLeft: '1px solid rgba(255,255,255,0.1)',
                      borderRight: '1px solid rgba(255,255,255,0.1)',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                    }}>
                      <p style={{ fontSize: '14px', color: '#999', lineHeight: 1.6 }}>
                        {current.description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions - Sold out events can still view page */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {getTicketUrl(current.event_url) && (
                  <a 
                    href={getTicketUrl(current.event_url)!} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{
                      display: 'block', 
                      padding: '16px', 
                      background: current.sold_out 
                        ? 'rgba(255,255,255,0.1)' 
                        : 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                      borderRadius: '14px', 
                      textAlign: 'center', 
                      fontWeight: 700, 
                      fontSize: '15px', 
                      color: current.sold_out ? '#888' : 'white', 
                      textDecoration: 'none',
                    }}
                  >
                    {current.sold_out 
                      ? 'VIEW PAGE (SOLD OUT)' 
                      : isFree(current.price_min, current.price_max) 
                        ? 'VIEW PAGE' 
                        : 'GET TICKETS'}
                  </a>
                )}
                {current.venue && (
                  <a 
                    href={mapsUrl(current.venue)} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '8px',
                      padding: '12px', 
                      color: '#888', 
                      fontSize: '14px', 
                      textDecoration: 'none'
                    }}
                  >
                    📍 Take me there
                  </a>
                )}
              </div>

              {/* Navigation */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginTop: '20px', 
                paddingTop: '16px', 
                borderTop: '1px solid rgba(255,255,255,0.05)' 
              }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate('prev') }} 
                  disabled={currentIndex === 0}
                  style={{
                    background: currentIndex === 0 ? 'transparent' : 'rgba(171,103,247,0.2)',
                    border: currentIndex === 0 ? 'none' : '1px solid rgba(171,103,247,0.3)',
                    borderRadius: '10px', 
                    padding: '10px 14px',
                    color: currentIndex === 0 ? '#333' : '#ab67f7',
                    fontSize: '14px', 
                    fontWeight: 600, 
                    cursor: currentIndex === 0 ? 'default' : 'pointer',
                    ...noSelectStyle
                  }}
                >
                  ← Prev
                </button>
                <span style={{ fontSize: '13px', color: '#444' }}>{currentIndex + 1} / {filtered.length}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate('next') }} 
                  disabled={currentIndex === filtered.length - 1}
                  style={{
                    background: currentIndex === filtered.length - 1 ? 'transparent' : 'rgba(171,103,247,0.2)',
                    border: currentIndex === filtered.length - 1 ? 'none' : '1px solid rgba(171,103,247,0.3)',
                    borderRadius: '10px', 
                    padding: '10px 14px',
                    color: currentIndex === filtered.length - 1 ? '#333' : '#ab67f7',
                    fontSize: '14px', 
                    fontWeight: 600, 
                    cursor: currentIndex === filtered.length - 1 ? 'default' : 'pointer',
                    ...noSelectStyle
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Styles */}
        <style jsx global>{`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.5); opacity: 0.2; }
            100% { transform: scale(1); opacity: 0.6; }
          }
          @keyframes loadingSlide {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          * { 
            -webkit-tap-highlight-color: transparent; 
            box-sizing: border-box; 
          }
          body { 
            overscroll-behavior: none; 
          }
          .mapboxgl-canvas { 
            outline: none; 
          }
          .mapboxgl-ctrl-bottom-left,
          .mapboxgl-ctrl-bottom-right {
            display: none;
          }
        `}</style>
      </main>
    </div>
  )
}
