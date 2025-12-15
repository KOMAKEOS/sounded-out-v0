'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { supabase } from '../lib/supabase'

type Venue = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  venue_type: string
}

type Event = {
  id: string
  venue_id: string
  title: string
  start_time: string
  end_time: string | null
  genres: string | null
  event_url: string | null
  price_min: number | null
  price_max: number | null
  venue?: Venue
}

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(function loadEvents() {
    supabase
      .from('events')
      .select('*, venue:venues(*)')
      .eq('status', 'published')
      .gte('start_time', new Date().toISOString().split('T')[0])
      .order('start_time', { ascending: true })
      .then(function(result) {
        if (result.error) {
          console.error('Error loading events:', result.error)
        } else {
          setEvents(result.data as Event[])
        }
        setLoading(false)
      })
  }, [])

  useEffect(function initMap() {
    if (!mapContainer.current || map.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-1.6178, 54.9783],
      zoom: 13
    })

    return function cleanup() {
      if (map.current) map.current.remove()
    }
  }, [])

  useEffect(function addMarkers() {
    if (!map.current || events.length === 0) return

    events.forEach(function(event) {
      if (!event.venue) return

      var el = document.createElement('div')
      el.style.width = '32px'
      el.style.height = '32px'
      el.style.background = 'linear-gradient(135deg, #ff3366 0%, #ff6b35 100%)'
      el.style.borderRadius = '50%'
      el.style.border = '2px solid white'
      el.style.boxShadow = '0 4px 12px rgba(255, 51, 102, 0.4)'
      el.style.cursor = 'pointer'

      el.onclick = function() {
        setSelectedEvent(event)
        if (map.current && event.venue) {
          map.current.flyTo({
            center: [event.venue.lng, event.venue.lat],
            zoom: 15
          })
        }
      }

      new mapboxgl.Marker(el)
        .setLngLat([event.venue.lng, event.venue.lat])
        .addTo(map.current as mapboxgl.Map)
    })
  }, [events])

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function formatDate(dateStr: string) {
    var date = new Date(dateStr)
    var today = new Date()
    if (date.toDateString() === today.toDateString()) return 'Tonight'
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  function formatPrice(min: number | null, max: number | null) {
    if (!min && !max) return 'Free / TBC'
    if (min && max && min !== max) return '£' + min + '–£' + max
    return '£' + (min || max)
  }

  var mainStyle = { height: '100vh', width: '100vw', position: 'relative' as const }
  var mapStyle = { height: '100%', width: '100%' }
  var headerStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    padding: '16px 20px',
    background: 'linear-gradient(to bottom, rgba(10,10,11,0.95) 0%, rgba(10,10,11,0) 100%)',
    zIndex: 10
  }
  var bottomStyle = {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(to top, rgba(10,10,11,0.98) 0%, rgba(10,10,11,0) 100%)',
    padding: '60px 16px 24px',
    zIndex: 10
  }
  var cardStyle = {
    flexShrink: 0,
    width: '200px',
    padding: '14px',
    background: '#141416',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    textAlign: 'left' as const,
    cursor: 'pointer',
    color: 'white'
  }
  var overlayStyle = {
    position: 'absolute' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    zIndex: 20,
    display: 'flex',
    alignItems: 'flex-end' as const,
    justifyContent: 'center'
  }
  var modalStyle = {
    width: '100%',
    maxWidth: '480px',
    background: '#141416',
    borderRadius: '20px 20px 0 0',
    padding: '24px'
  }
  var buttonStyle = {
    display: 'block',
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #ff3366 0%, #ff6b35 100%)',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 700,
    color: 'white',
    textAlign: 'center' as const,
    textDecoration: 'none'
  }

  return (
    <main style={mainStyle}>
      <div ref={mapContainer} style={mapStyle}></div>

      <header style={headerStyle}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '24px', fontWeight: 800 }}>SOUNDED OUT</h1>
        <p style={{ fontSize: '12px', color: '#a0a0a5', marginTop: '2px' }}>Newcastle</p>
      </header>

      <div style={bottomStyle}>
        {loading ? (
          <p style={{ color: '#a0a0a5', fontSize: '14px', textAlign: 'center' }}>Loading...</p>
        ) : events.length === 0 ? (
          <p style={{ color: '#a0a0a5', fontSize: '14px', textAlign: 'center' }}>No events found</p>
        ) : (
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
            {events.map(function(event) {
              return (
                <button
                  key={event.id}
                  onClick={function() {
                    setSelectedEvent(event)
                    if (map.current && event.venue) {
                      map.current.flyTo({ center: [event.venue.lng, event.venue.lat], zoom: 15 })
                    }
                  }}
                  style={cardStyle}
                >
                  <p style={{ fontSize: '10px', color: '#ff3366', fontWeight: 700, marginBottom: '6px' }}>
                    {formatDate(event.start_time)} - {formatTime(event.start_time)}
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{event.title}</p>
                  <p style={{ fontSize: '12px', color: '#a0a0a5' }}>{event.venue?.name || 'Venue TBC'}</p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selectedEvent ? (
        <div style={overlayStyle} onClick={function() { setSelectedEvent(null) }}>
          <div style={modalStyle} onClick={function(e) { e.stopPropagation() }}>
            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', margin: '0 auto 20px' }}></div>

            <p style={{ fontSize: '11px', color: '#ff3366', fontWeight: 700, marginBottom: '8px' }}>
              {formatDate(selectedEvent.start_time)} - {formatTime(selectedEvent.start_time)}
            </p>

            <h2 style={{ fontSize: '28px', fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: '8px' }}>
              {selectedEvent.title}
            </h2>

            <p style={{ fontSize: '16px', color: '#a0a0a5', marginBottom: '16px' }}>
              {selectedEvent.venue?.name}
            </p>

            {selectedEvent.genres ? (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {selectedEvent.genres.split(',').map(function(genre, i) {
                  return (
                    <span key={i} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: '20px', fontSize: '12px', color: '#a0a0a5' }}>
                      {genre.trim()}
                    </span>
                  )
                })}
              </div>
            ) : null}

            <p style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>
              {formatPrice(selectedEvent.price_min, selectedEvent.price_max)}
            </p>

            {selectedEvent.event_url ? (
              <a href={selectedEvent.event_url} target="_blank" rel="noopener noreferrer" style={buttonStyle}>
                GET TICKETS
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  )
}
