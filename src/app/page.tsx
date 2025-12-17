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

type DateFilter = 'tonight' | 'tomorrow' | 'weekend' | string
type ViewMode = 'map' | 'preview' | 'detail' | 'list' | 'cluster'

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, { marker: mapboxgl.Marker; el: HTMLDivElement }>>(new Map())
  
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilter>('tonight')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [clusterEvents, setClusterEvents] = useState<Event[]>([])
  
  // Card animation state
  const [cardState, setCardState] = useState<'visible' | 'exiting-left' | 'exiting-right' | 'entering-left' | 'entering-right'>('visible')
  const [nextIndex, setNextIndex] = useState<number | null>(null)
  
  // Touch/drag state
  const [dragX, setDragX] = useState(0)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)

  // Date helpers
  const getDateStr = (d: Date) => d.toDateString()
  const isTonight = (s: string) => getDateStr(new Date(s)) === getDateStr(new Date())
  const isTomorrow = (s: string) => {
    const t = new Date(); t.setDate(t.getDate() + 1)
    return getDateStr(new Date(s)) === getDateStr(t)
  }
  const isWeekend = (s: string) => {
    const d = new Date(s), now = new Date(), day = now.getDay()
    const fri = new Date(now); fri.setDate(now.getDate() + ((5 - day + 7) % 7 || 7))
    if (day >= 5) fri.setDate(now.getDate())
    fri.setHours(0,0,0,0)
    const sun = new Date(fri); sun.setDate(fri.getDate() + (7 - fri.getDay())); sun.setHours(23,59,59)
    return d >= fri && d <= sun
  }
  const getDateLabel = (s: string) => {
    if (isTonight(s)) return 'Tonight'
    if (isTomorrow(s)) return 'Tomorrow'
    return new Date(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }
  const getNext7Days = () => Array.from({length: 7}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i)
    return { str: getDateStr(d), name: d.toLocaleDateString('en-GB', { weekday: 'short' }), num: d.getDate() }
  })

  // Filter
  const filtered = useMemo(() => {
    switch (dateFilter) {
      case 'tonight': return events.filter(e => isTonight(e.start_time))
      case 'tomorrow': return events.filter(e => isTomorrow(e.start_time))
      case 'weekend': return events.filter(e => isWeekend(e.start_time))
      default: return events.filter(e => getDateStr(new Date(e.start_time)) === dateFilter)
    }
  }, [events, dateFilter])

  const current = filtered[currentIndex] || null
  const grouped = useMemo(() => {
    const g: Record<string, Event[]> = {}
    filtered.forEach(e => { const l = getDateLabel(e.start_time); if (!g[l]) g[l] = []; g[l].push(e) })
    return g
  }, [filtered])

  const filterLabel = dateFilter === 'tonight' ? 'tonight' : dateFilter === 'tomorrow' ? 'tomorrow' : dateFilter === 'weekend' ? 'this weekend' : new Date(dateFilter).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })

  // Helpers
  const formatTime = (s: string) => new Date(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const formatPrice = (min: number|null, max: number|null) => {
    if (min === 0 || (!min && !max)) return null
    if (min && max && min !== max) return `£${min}–${max}`
    return `£${min || max}`
  }
  const isFree = (min: number|null, max: number|null) => min === 0 || (!min && !max)
  const getGenres = (g: string|null) => g ? g.split(',').map(x => x.trim()).slice(0,2).join(' · ') : null
  const mapsUrl = (v: Venue) => `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`

  // Load events
  useEffect(() => {
    supabase.from('events').select('*, venue:venues(*)').eq('status', 'published')
      .gte('start_time', new Date().toISOString().split('T')[0]).order('start_time')
      .then(({ data }) => { if (data) setEvents(data as Event[]); setLoading(false) })
  }, [])

  // Init map - STATIC markers that don't move
  useEffect(() => {
    if (!mapContainer.current || map.current) return
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-1.6131, 54.9695],
      zoom: 14,
      pitch: 0,
      bearing: 0,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
      renderWorldCopies: false
    })
    map.current = m
    return () => m.remove()
  }, [])

  // Update marker selection visual
  const highlightMarker = useCallback((eventId: string | null) => {
    markersRef.current.forEach((data, id) => {
      const selected = eventId && id.includes(eventId)
      data.el.style.transform = selected ? 'scale(1.4)' : 'scale(1)'
      data.el.style.zIndex = selected ? '1000' : '1'
      data.el.style.filter = selected ? 'drop-shadow(0 0 16px #ab67f7) drop-shadow(0 0 8px #ab67f7)' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
    })
  }, [])

  // Update markers when filter changes
  useEffect(() => {
    if (!map.current) return
    
    // Clear old markers
    markersRef.current.forEach(d => d.marker.remove())
    markersRef.current.clear()
    
    if (filtered.length === 0) {
      map.current.flyTo({ center: [-1.6131, 54.9695], zoom: 14, duration: 600 })
      return
    }

    // Group by venue location
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

      const el = document.createElement('div')
      el.style.cursor = 'pointer'
      el.style.transition = 'transform 0.3s ease, filter 0.3s ease'
      el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'

      if (count > 1) {
        el.style.width = '44px'
        el.style.height = '44px'
        el.innerHTML = `<div style="width:44px;height:44px;background:linear-gradient(135deg,#ab67f7,#d7b3ff);border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:white;">${count}</div>`
      } else {
        el.style.width = '32px'
        el.style.height = '42px'
        el.innerHTML = `<svg viewBox="0 0 24 36"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="url(#g)"/><circle cx="12" cy="12" r="5" fill="white"/><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ab67f7"/><stop offset="100%" stop-color="#d7b3ff"/></linearGradient></defs></svg>`
      }

      el.onclick = (e) => {
        e.stopPropagation()
        if (count > 1) {
          setClusterEvents(evs)
          setViewMode('cluster')
        } else {
          const idx = filtered.findIndex(x => x.id === evs[0].id)
          setCurrentIndex(idx)
          setViewMode('preview')
          highlightMarker(evs[0].id)
        }
        map.current?.flyTo({ center: [v.lng, v.lat], zoom: 16, duration: 600 })
      }

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([v.lng, v.lat])
        .addTo(map.current!)
      
      markersRef.current.set(ids, { marker, el })
    })

    // Fit bounds - but not too zoomed in
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
  }, [filtered, highlightMarker])

  // Navigation with proper animation sequencing
  const navigate = useCallback((dir: 'prev' | 'next') => {
    if (cardState !== 'visible') return
    const newIdx = dir === 'next' ? currentIndex + 1 : currentIndex - 1
    if (newIdx < 0 || newIdx >= filtered.length) return

    // Step 1: Exit current card
    setCardState(dir === 'next' ? 'exiting-left' : 'exiting-right')
    setNextIndex(newIdx)

    // Step 2: After exit animation, update index and enter new card
    setTimeout(() => {
      setCurrentIndex(newIdx)
      setCardState(dir === 'next' ? 'entering-right' : 'entering-left')
      highlightMarker(filtered[newIdx].id)
      if (filtered[newIdx].venue) {
        map.current?.flyTo({ 
          center: [filtered[newIdx].venue!.lng, filtered[newIdx].venue!.lat], 
          zoom: 16, 
          duration: 400 
        })
      }
    }, 250)

    // Step 3: Card fully visible
    setTimeout(() => {
      setCardState('visible')
      setNextIndex(null)
    }, 450)
  }, [cardState, currentIndex, filtered, highlightMarker])

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX)
    setStartY(e.touches[0].clientY)
    setIsDragging(true)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const dx = e.touches[0].clientX - startX
    const dy = e.touches[0].clientY - startY
    
    // Horizontal swipe priority
    if (Math.abs(dx) > Math.abs(dy) + 10) {
      setDragX(dx * 0.6)
      setDragY(0)
    } else if (dy > 10 && viewMode === 'detail') {
      setDragY(dy * 0.5)
      setDragX(0)
    }
  }

  const onTouchEnd = () => {
    setIsDragging(false)
    
    // Horizontal swipe
    if (Math.abs(dragX) > 80) {
      if (dragX < 0) navigate('next')
      else navigate('prev')
    }
    
    // Vertical swipe down to dismiss
    if (dragY > 100) {
      if (viewMode === 'detail') setViewMode('preview')
      else if (viewMode === 'preview') { setViewMode('map'); highlightMarker(null) }
    }
    
    setDragX(0)
    setDragY(0)
  }

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (viewMode === 'preview' || viewMode === 'detail') {
        if (e.key === 'ArrowLeft') navigate('prev')
        if (e.key === 'ArrowRight') navigate('next')
        if (e.key === 'Escape') { setViewMode('map'); highlightMarker(null) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [viewMode, navigate, highlightMarker])

  // Card transform based on state
  const getCardTransform = () => {
    if (isDragging && dragX !== 0) {
      return { transform: `translateX(${dragX}px) rotate(${dragX * 0.03}deg)`, opacity: 1 - Math.abs(dragX) / 500, transition: 'none' }
    }
    switch (cardState) {
      case 'exiting-left': return { transform: 'translateX(-110%) rotate(-8deg)', opacity: 0, transition: 'all 0.25s ease-out' }
      case 'exiting-right': return { transform: 'translateX(110%) rotate(8deg)', opacity: 0, transition: 'all 0.25s ease-out' }
      case 'entering-left': return { transform: 'translateX(-30px)', opacity: 0.5, transition: 'all 0.2s ease-out' }
      case 'entering-right': return { transform: 'translateX(30px)', opacity: 0.5, transition: 'all 0.2s ease-out' }
      default: return { transform: 'translateX(0) rotate(0)', opacity: 1, transition: 'all 0.2s ease-out' }
    }
  }

  const getDetailTransform = () => {
    if (isDragging && dragY > 0) {
      return { transform: `translateY(${dragY}px)`, opacity: 1 - dragY / 400, transition: 'none' }
    }
    return { transform: 'translateY(0)', opacity: 1, transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }
  }

  const closeOverlay = () => {
    setViewMode('map')
    highlightMarker(null)
  }

  const selectEvent = (e: Event) => {
    const idx = filtered.findIndex(x => x.id === e.id)
    setCurrentIndex(idx)
    setViewMode('preview')
    highlightMarker(e.id)
    if (e.venue) map.current?.flyTo({ center: [e.venue.lng, e.venue.lat], zoom: 16, duration: 600 })
  }

  // Calculate list height based on items (max 3.5 visible)
  const listItemHeight = 85
  const maxVisibleItems = 3.5
  const listContentHeight = Math.min(Object.values(grouped).flat().length, maxVisibleItems) * listItemHeight + 80

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', justifyContent: 'center' }}>
      <main style={{ height: '100vh', width: '100%', maxWidth: '480px', position: 'relative', overflow: 'hidden' }}>
        
        {/* Map */}
        <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />

        {/* Click anywhere to close when in preview/detail */}
        {(viewMode === 'preview' || viewMode === 'cluster') && (
          <div 
            onClick={closeOverlay}
            style={{ position: 'absolute', inset: 0, zIndex: 10 }}
          />
        )}

        {/* Header - reduced top padding */}
        <header style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '44px 20px 16px',
          background: 'linear-gradient(to bottom, rgba(10,10,11,0.98) 0%, rgba(10,10,11,0.9) 60%, transparent 100%)',
          zIndex: viewMode === 'detail' ? 5 : 20,
          opacity: viewMode === 'detail' ? 0.4 : 1,
          transition: 'opacity 0.3s ease',
          pointerEvents: viewMode === 'detail' ? 'none' : 'auto'
        }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>SOUNDED OUT</h1>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '2px', marginBottom: '12px' }}>Newcastle</p>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['tonight', 'tomorrow', 'weekend'] as const).map(f => (
              <button key={f} onClick={() => { setDateFilter(f); setCurrentIndex(0); setViewMode('map') }} style={{
                padding: '8px 14px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: dateFilter === f ? '#ab67f7' : 'rgba(255,255,255,0.1)',
                color: dateFilter === f ? 'white' : '#888',
                transition: 'all 0.2s ease'
              }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
            <button onClick={() => setShowDatePicker(!showDatePicker)} style={{
              padding: '8px 12px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              background: 'rgba(255,255,255,0.1)', color: '#ab67f7'
            }}>{showDatePicker ? '✕' : 'More'}</button>
          </div>

          {showDatePicker && (
            <div style={{ marginTop: '12px', padding: '14px', background: '#1a1a1f', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {getNext7Days().map(d => (
                  <button key={d.str} onClick={() => { setDateFilter(d.str); setShowDatePicker(false); setCurrentIndex(0); setViewMode('map') }} style={{
                    width: '40px', padding: '8px 4px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    background: dateFilter === d.str ? '#ab67f7' : 'transparent',
                    color: dateFilter === d.str ? 'white' : '#888'
                  }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>{d.name}</span>
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>{d.num}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* Bottom Bar */}
        {viewMode === 'map' && (
          <div onClick={() => setViewMode('list')} style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '24px 20px 30px',
            background: 'linear-gradient(to top, rgba(10,10,11,1) 0%, rgba(10,10,11,0.95) 60%, transparent 100%)',
            zIndex: 15, cursor: 'pointer'
          }}>
            <div style={{
              background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '15px' }}>
                <span style={{ color: '#ab67f7', fontWeight: 700 }}>{loading ? '...' : filtered.length}</span>
                {' '}{filtered.length === 1 ? 'event' : 'events'} {filterLabel}
              </span>
              <span style={{ color: '#ab67f7', fontSize: '20px' }}>↑</span>
            </div>
          </div>
        )}

        {/* List View - dynamic height */}
        {viewMode === 'list' && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: '#141416', borderRadius: '24px 24px 0 0',
            zIndex: 25, display: 'flex', flexDirection: 'column',
            maxHeight: `${listContentHeight}px`,
            transition: 'max-height 0.3s ease'
          }}>
            {/* Sticky header with close affordance */}
            <div style={{
              padding: '12px 20px 14px', 
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: '#141416', 
              borderRadius: '24px 24px 0 0',
              flexShrink: 0,
              cursor: 'pointer'
            }} onClick={() => setViewMode('map')}>
              <div style={{ width: '40px', height: '5px', background: '#555', borderRadius: '3px', margin: '0 auto 14px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ab67f7', textTransform: 'uppercase' }}>
                  {Object.keys(grouped)[0] || filterLabel}
                </h3>
                <span style={{ fontSize: '12px', color: '#666' }}>Tap to close</span>
              </div>
            </div>
            
            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 30px' }}>
              {Object.entries(grouped).map(([label, evs], gi) => (
                <div key={label} style={{ marginTop: gi > 0 ? '20px' : '0' }}>
                  {gi > 0 && <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: '10px' }}>{label}</h4>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {evs.map(e => (
                      <div key={e.id} onClick={() => selectEvent(e)} style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                        background: '#1e1e24', borderRadius: '14px', cursor: 'pointer'
                      }}>
                        <span style={{ fontSize: '13px', color: '#ab67f7', fontWeight: 700, minWidth: '48px' }}>{formatTime(e.start_time)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{e.venue?.name}</div>
                        </div>
                        {isFree(e.price_min, e.price_max) ? (
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.15)', padding: '4px 8px', borderRadius: '6px' }}>FREE</span>
                        ) : formatPrice(e.price_min, e.price_max) && (
                          <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>{formatPrice(e.price_min, e.price_max)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p style={{ textAlign: 'center', color: '#555', padding: '24px' }}>No events {filterLabel}</p>}
            </div>
          </div>
        )}

        {/* Cluster Selection */}
        {viewMode === 'cluster' && (
          <div onClick={(e) => e.stopPropagation()} style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: '#141416', borderRadius: '24px 24px 0 0',
            padding: '12px 20px 30px', zIndex: 30
          }}>
            <div onClick={closeOverlay} style={{ width: '40px', height: '5px', background: '#555', borderRadius: '3px', margin: '0 auto 16px', cursor: 'pointer' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ab67f7', marginBottom: '14px' }}>{clusterEvents.length} events here</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {clusterEvents.map(e => (
                <div key={e.id} onClick={() => { selectEvent(e); setViewMode('preview') }} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px',
                  background: '#1e1e24', borderRadius: '14px', cursor: 'pointer'
                }}>
                  <span style={{ fontSize: '13px', color: '#ab67f7', fontWeight: 700, minWidth: '48px' }}>{formatTime(e.start_time)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>{e.title}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{getGenres(e.genres)}</div>
                  </div>
                  {isFree(e.price_min, e.price_max) ? (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.15)', padding: '4px 8px', borderRadius: '6px' }}>FREE</span>
                  ) : formatPrice(e.price_min, e.price_max) && (
                    <span style={{ fontSize: '12px', color: '#888' }}>{formatPrice(e.price_min, e.price_max)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview Card */}
        {viewMode === 'preview' && current && (
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: '#141416', borderRadius: '24px 24px 0 0',
              padding: '12px 20px 30px', zIndex: 30,
              ...getCardTransform()
            }}
          >
            <div onClick={closeOverlay} style={{ width: '40px', height: '5px', background: '#555', borderRadius: '3px', margin: '0 auto 14px', cursor: 'pointer' }} />

            {/* Progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '14px' }}>
              {filtered.slice(0, 8).map((_, i) => (
                <div key={i} style={{
                  width: i === currentIndex ? '18px' : '6px', height: '6px', borderRadius: '3px',
                  background: i === currentIndex ? '#ab67f7' : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.2s ease'
                }} />
              ))}
              {filtered.length > 8 && <span style={{ fontSize: '10px', color: '#444' }}>+{filtered.length - 8}</span>}
            </div>

            <div style={{ display: 'flex', gap: '14px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 700, marginBottom: '6px' }}>
                  {formatTime(current.start_time)} · {getDateLabel(current.start_time)}
                </p>
                <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px', lineHeight: 1.2 }}>{current.title}</h3>
                <p style={{ fontSize: '14px', color: '#888', marginBottom: '10px' }}>{current.venue?.name}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {isFree(current.price_min, current.price_max) && (
                    <span style={{ padding: '5px 10px', background: 'rgba(34,197,94,0.15)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#22c55e' }}>FREE</span>
                  )}
                  {formatPrice(current.price_min, current.price_max) && (
                    <span style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>{formatPrice(current.price_min, current.price_max)}</span>
                  )}
                  {getGenres(current.genres) && (
                    <span style={{ padding: '5px 10px', background: 'rgba(171,103,247,0.12)', borderRadius: '8px', fontSize: '12px', color: '#ab67f7' }}>{getGenres(current.genres)}</span>
                  )}
                </div>
              </div>
              {current.image_url && (
                <div style={{ width: '75px', height: '75px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
                  <img src={current.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>

            <button onClick={() => setViewMode('detail')} style={{
              width: '100%', padding: '14px', marginTop: '16px',
              background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
              border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700, color: 'white', cursor: 'pointer'
            }}>VIEW DETAILS</button>

            {/* Navigation - OBVIOUS purple arrows */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
              <button 
                onClick={() => navigate('prev')} 
                disabled={currentIndex === 0}
                style={{
                  background: currentIndex === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(171,103,247,0.15)',
                  border: 'none', borderRadius: '12px', padding: '10px 16px',
                  color: currentIndex === 0 ? '#333' : '#ab67f7',
                  fontSize: '14px', fontWeight: 600, cursor: currentIndex === 0 ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <span style={{ fontSize: '18px' }}>←</span> Prev
              </button>
              <span style={{ fontSize: '13px', color: '#555' }}>{currentIndex + 1} / {filtered.length}</span>
              <button 
                onClick={() => navigate('next')} 
                disabled={currentIndex === filtered.length - 1}
                style={{
                  background: currentIndex === filtered.length - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(171,103,247,0.15)',
                  border: 'none', borderRadius: '12px', padding: '10px 16px',
                  color: currentIndex === filtered.length - 1 ? '#333' : '#ab67f7',
                  fontSize: '14px', fontWeight: 600, cursor: currentIndex === filtered.length - 1 ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                Next <span style={{ fontSize: '18px' }}>→</span>
              </button>
            </div>
            
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#444', marginTop: '10px' }}>Swipe left or right to browse</p>
          </div>
        )}

        {/* Detail Modal */}
        {viewMode === 'detail' && current && (
          <div 
            onClick={() => setViewMode('preview')} 
            style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 40,
              display: 'flex', alignItems: 'flex-end',
              animation: 'fadeIn 0.25s ease'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{
                width: '100%', maxHeight: '88vh', background: '#141416', borderRadius: '24px 24px 0 0',
                padding: '12px 20px 36px', overflowY: 'auto',
                ...getDetailTransform()
              }}
            >
              <div onClick={() => setViewMode('preview')} style={{ width: '40px', height: '5px', background: '#555', borderRadius: '3px', margin: '0 auto 14px', cursor: 'pointer' }} />
              <p style={{ textAlign: 'center', fontSize: '11px', color: '#555', marginBottom: '14px' }}>Swipe down to close · Swipe left/right to browse</p>

              {current.image_url ? (
                <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', marginBottom: '18px' }}>
                  <img src={current.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ width: '100%', aspectRatio: '16/9', background: 'linear-gradient(135deg, #252530, #1a1a22)', borderRadius: '16px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>No image</div>
              )}

              <p style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                {getDateLabel(current.start_time)} · {formatTime(current.start_time)}
                {current.end_time && ` – ${formatTime(current.end_time)}`}
              </p>

              <h2 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px', lineHeight: 1.2 }}>{current.title}</h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '15px', color: '#888' }}>{current.venue?.name}</span>
                {current.venue?.instagram_url && (
                  <a href={current.venue.instagram_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '16px' }}>📸</a>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
                {isFree(current.price_min, current.price_max) && (
                  <span style={{ padding: '8px 14px', background: 'rgba(34,197,94,0.15)', borderRadius: '10px', fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>FREE</span>
                )}
                {current.genres?.split(',').map((g, i) => (
                  <span key={i} style={{ padding: '8px 14px', background: 'rgba(171,103,247,0.12)', borderRadius: '10px', fontSize: '14px', color: '#ab67f7' }}>{g.trim()}</span>
                ))}
                {current.vibe && (
                  <span style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', fontSize: '14px', color: '#666' }}>{current.vibe}</span>
                )}
              </div>

              {!isFree(current.price_min, current.price_max) && formatPrice(current.price_min, current.price_max) && (
                <p style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>{formatPrice(current.price_min, current.price_max)}</p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {current.event_url && (
                  <a href={current.event_url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'block', padding: '16px', background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                    borderRadius: '14px', textAlign: 'center', fontWeight: 700, fontSize: '15px', color: 'white', textDecoration: 'none'
                  }}>GET TICKETS</a>
                )}
                {current.venue && (
                  <a href={mapsUrl(current.venue)} target="_blank" rel="noopener noreferrer" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '12px', color: '#888', fontSize: '14px', textDecoration: 'none'
                  }}>📍 Take me there</a>
                )}
              </div>

              {/* Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button 
                  onClick={() => navigate('prev')} 
                  disabled={currentIndex === 0}
                  style={{
                    background: currentIndex === 0 ? 'transparent' : 'rgba(171,103,247,0.15)',
                    border: 'none', borderRadius: '10px', padding: '10px 14px',
                    color: currentIndex === 0 ? '#333' : '#ab67f7',
                    fontSize: '14px', fontWeight: 600, cursor: currentIndex === 0 ? 'default' : 'pointer'
                  }}
                >← Prev</button>
                <span style={{ fontSize: '13px', color: '#444' }}>{currentIndex + 1} / {filtered.length}</span>
                <button 
                  onClick={() => navigate('next')} 
                  disabled={currentIndex === filtered.length - 1}
                  style={{
                    background: currentIndex === filtered.length - 1 ? 'transparent' : 'rgba(171,103,247,0.15)',
                    border: 'none', borderRadius: '10px', padding: '10px 14px',
                    color: currentIndex === filtered.length - 1 ? '#333' : '#ab67f7',
                    fontSize: '14px', fontWeight: 600, cursor: currentIndex === filtered.length - 1 ? 'default' : 'pointer'
                  }}
                >Next →</button>
              </div>
            </div>
          </div>
        )}

        <style jsx global>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
          body { overscroll-behavior: none; }
          .mapboxgl-canvas { outline: none; }
        `}</style>
      </main>
    </div>
  )
}
