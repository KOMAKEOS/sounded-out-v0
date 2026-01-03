'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import EventActions from '../components/EventActions'
import LoginPromptModal from '../components/LoginPromptModal'
import { 
  initAnalytics, 
  trackEventView, 
  trackTicketClick, 
  trackDateFilter, 
  trackGenreFilter, 
  trackListOpen, 
  trackMarkerClick,
  trackMapLoaded,
  trackDirectionsClick,
  trackShareClick,
  trackClaimStart,
  trackClaimSubmit,
  trackMenuOpen,
  trackLocationEnabled,
  trackLocationDenied,
  trackCTAClick,
} from '../lib/analytics'


// ============================================================================
// APPLE-GRADE MOTION CONSTANTS
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
  no_phones?: boolean
  is_claimed?: boolean
  is_verified?: boolean
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
  so_pick?: boolean
  sold_out?: boolean
  description?: string | null
  no_phones?: boolean
  is_claimed?: boolean
  is_verified?: boolean
}

type DateFilter = 'today' | 'tomorrow' | 'weekend' | string
type ViewMode = 'map' | 'preview' | 'detail' | 'list' | 'cluster'
type DeviceType = 'mobile' | 'tablet' | 'desktop'

// ============================================================================
// P1 FIX: NEW INTERFACES
// ============================================================================
interface GenreStyle {
  gradient: string
  emoji: string
}

interface SaveButtonProps {
  eventId: string
  saved: boolean
  onToggle: (id: string, e?: React.MouseEvent) => void
  size?: 'small' | 'medium' | 'large'
}

interface OnboardingModalProps {
  onComplete: () => void
}

interface EmptyStateProps {
  filterLabel: string
  onReset: () => void
}

// ============================================================================
// RESPONSIVE BREAKPOINTS
// ============================================================================
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
}

// ============================================================================
// P1 FIX: GENRE STYLES FOR PLACEHOLDERS
// ============================================================================
const GENRE_STYLES: Record<string, GenreStyle> = {
  techno: { gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', emoji: '🔊' },
  house: { gradient: 'linear-gradient(135deg, #2d132c 0%, #801336 50%, #c72c41 100%)', emoji: '🎧' },
  dnb: { gradient: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 50%, #2d2d44 100%)', emoji: '⚡' },
  disco: { gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)', emoji: '✨' },
  'hip-hop': { gradient: 'linear-gradient(135deg, #1e1e1e 0%, #3d3d3d 50%, #5a5a5a 100%)', emoji: '🔥' },
  indie: { gradient: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 50%, #c4e0e5 100%)', emoji: '🌙' },
  live: { gradient: 'linear-gradient(135deg, #232526 0%, #414345 50%, #5a5a5a 100%)', emoji: '🎸' },
  default: { gradient: 'linear-gradient(135deg, #1a1a22 0%, #252530 50%, #1e1e28 100%)', emoji: '🎵' },
}

const getGenreStyle = (genres: string | null): GenreStyle => {
  if (!genres) return GENRE_STYLES.default
  const firstGenre: string = genres.split(',')[0]?.trim().toLowerCase() || ''
  const keys: string[] = Object.keys(GENRE_STYLES)
  for (let i = 0; i < keys.length; i++) {
    const key: string = keys[i]
    if (firstGenre.includes(key) || key.includes(firstGenre)) {
      return GENRE_STYLES[key]
    }
  }
  return GENRE_STYLES.default
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function Home() {
  // Initialize analytics
  useEffect(() => {
    initAnalytics()
  }, [])

  // Load user on mount and listen for auth changes
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email })
      }
    }
    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email })
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])
  
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, { marker: mapboxgl.Marker; el: HTMLDivElement; inner: HTMLDivElement }>>(new Map())
  
  // Core state
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [clusterEvents, setClusterEvents] = useState<Event[]>([])
  const [visibleDayLabel, setVisibleDayLabel] = useState<string>('')
  const [showAdminMenu, setShowAdminMenu] = useState(false)

  // User auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  
  // Responsive state
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth
      if (width >= 1024) return 'desktop'
      if (width >= 768) return 'tablet'
    }
    return 'mobile'
  })
  const [windowWidth, setWindowWidth] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth
    return 0
  })
  
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const [introPhase, setIntroPhase] = useState<'logo' | 'zoom' | 'done'>('logo')
  
  // First-load welcome overlay
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('so_welcome_seen')
    }
    return true
  })

  // ============================================================================
  // P1 FIX: ONBOARDING STATE
  // ============================================================================
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('so_onboarding_complete')
    }
    return true
  })

  // ============================================================================
  // P1 FIX: SAVED EVENTS STATE
  // ============================================================================
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved: string | null = localStorage.getItem('so_saved_events')
      if (saved) {
        const parsed: string[] = JSON.parse(saved) as string[]
        return new Set(parsed)
      }
    }
    return new Set()
  })
  
  // Genre/vibe filter state
  const [activeGenre, setActiveGenre] = useState<string | null>(null)
  const [showFreeOnly, setShowFreeOnly] = useState(false)
  
  // Detail view state
  const [showAllGenres, setShowAllGenres] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  
  // Claim modal state
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [claimType, setClaimType] = useState<'venue' | 'event'>('event')
  const [claimForm, setClaimForm] = useState({ name: '', email: '', role: 'owner', proofUrl: '' })
  const [claimSubmitting, setClaimSubmitting] = useState(false)
  const [claimSubmitted, setClaimSubmitted] = useState(false)
  const [claimError, setClaimError] = useState('')

  // Login prompt modal state
  const [showLoginModal, setShowLoginModal] = useState(false)
  
  // Menu state
  const [showMenu, setShowMenu] = useState(false)
  const [logoTapCount, setLogoTapCount] = useState(0)
  const logoTapTimer = useRef<NodeJS.Timeout | null>(null)
  
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
  // P1 FIX: SYNC SAVED EVENTS TO LOCALSTORAGE
  // ============================================================================
  useEffect(() => {
    const arr: string[] = Array.from(savedEventIds)
    localStorage.setItem('so_saved_events', JSON.stringify(arr))
  }, [savedEventIds])

  // ============================================================================
  // RESPONSIVE DETECTION
  // ============================================================================
  useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth
      setWindowWidth(width)
      if (width < BREAKPOINTS.mobile) {
        setDeviceType('mobile')
      } else if (width < BREAKPOINTS.tablet) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
      }
    }
    
    updateDeviceType()
    window.addEventListener('resize', updateDeviceType)
    return () => window.removeEventListener('resize', updateDeviceType)
  }, [])

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
  // FILTERED DATA - P1 FIX: Using for loops for TypeScript
  // ============================================================================
  const dateFiltered = useMemo(() => {
    const result: Event[] = []
    for (let i = 0; i < events.length; i++) {
      const e: Event = events[i]
      if (dateFilter === 'today' && isTonight(e.start_time)) result.push(e)
      else if (dateFilter === 'tomorrow' && isTomorrow(e.start_time)) result.push(e)
      else if (dateFilter === 'weekend' && isWeekend(e.start_time)) result.push(e)
      else if (dateFilter !== 'today' && dateFilter !== 'tomorrow' && dateFilter !== 'weekend' && getDateStr(new Date(e.start_time)) === dateFilter) result.push(e)
    }
    return result
  }, [events, dateFilter])
  
  const PINNED_GENRES = ['techno', 'house', 'dnb', 'disco', 'hip-hop', 'indie', 'live', 'student']
  
  const availableGenres = useMemo(() => {
    const genreCount = new Map<string, number>()
    for (let i = 0; i < dateFiltered.length; i++) {
      const e: Event = dateFiltered[i]
      if (e.genres) {
        const genreList: string[] = e.genres.split(',')
        for (let j = 0; j < genreList.length; j++) {
          const normalized: string = genreList[j].trim().toLowerCase()
          genreCount.set(normalized, (genreCount.get(normalized) || 0) + 1)
        }
      }
    }
    
    const pinnedPresent: string[] = []
    const unpinned: { genre: string; count: number }[] = []
    
    genreCount.forEach((count: number, genre: string) => {
      if (PINNED_GENRES.includes(genre)) {
        pinnedPresent.push(genre)
      } else {
        unpinned.push({ genre, count })
      }
    })
    
    pinnedPresent.sort((a: string, b: string) => PINNED_GENRES.indexOf(a) - PINNED_GENRES.indexOf(b))
    unpinned.sort((a, b) => b.count - a.count)
    
    const result: string[] = []
    for (let i = 0; i < pinnedPresent.length; i++) {
      result.push(pinnedPresent[i])
    }
    for (let i = 0; i < unpinned.length; i++) {
      result.push(unpinned[i].genre)
    }
    return result.slice(0, 8)
  }, [dateFiltered])
  
  const filtered = useMemo(() => {
    let result: Event[] = dateFiltered
    if (activeGenre) {
      const temp: Event[] = []
      for (let i = 0; i < result.length; i++) {
        if (result[i].genres?.toLowerCase().includes(activeGenre.toLowerCase())) {
          temp.push(result[i])
        }
      }
      result = temp
    }
    if (showFreeOnly) {
      const temp: Event[] = []
      for (let i = 0; i < result.length; i++) {
        if (result[i].price_min === 0) {
          temp.push(result[i])
        }
      }
      result = temp
    }
    return result
  }, [dateFiltered, activeGenre, showFreeOnly])

  const current = filtered[currentIndex] || null
  const nextEvent = filtered[currentIndex + 1] || null
  const prevEvent = filtered[currentIndex - 1] || null
  
  const getDayGroupLabel = (s: string) => {
    const d = new Date(s)
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()
  }
  
  const grouped = useMemo(() => {
    const g: Record<string, Event[]> = {}
    for (let i = 0; i < filtered.length; i++) {
      const e: Event = filtered[i]
      const l: string = getDayGroupLabel(e.start_time)
      if (!g[l]) g[l] = []
      g[l].push(e)
    }
    return g
  }, [filtered])
  
  useEffect(() => {
    const keys = Object.keys(grouped)
    if (keys.length > 0 && !visibleDayLabel) {
      setVisibleDayLabel(keys[0])
    }
  }, [grouped, visibleDayLabel])

  const filterLabel = dateFilter === 'today' ? 'today' 
    : dateFilter === 'tomorrow' ? 'tomorrow' 
    : dateFilter === 'weekend' ? 'this weekend' 
    : new Date(dateFilter).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })

  // ============================================================================
  // FORMAT HELPERS
  // ============================================================================
  const formatTime = (s: string) => new Date(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  
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
  
  const getGenres = (g: string | null) => g ? g.split(',').map((x: string) => x.trim()).slice(0, 2).join(' · ') : null
  
  const mapsUrl = (v: Venue) => `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`
  
  const getTicketUrl = (url: string | null) => {
    if (!url) return null
    if (!url.startsWith('http://') && !url.startsWith('https://')) return `https://${url}`
    return url
  }

  // ============================================================================
  // P1 FIX: ONBOARDING & SAVE FUNCTIONS
  // ============================================================================
  const completeOnboarding = useCallback((): void => {
    setShowOnboarding(false)
    localStorage.setItem('so_onboarding_complete', 'true')
  }, [])

  const toggleSaveEvent = useCallback((eventId: string, e?: React.MouseEvent): void => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    setSavedEventIds((prev: Set<string>) => {
      const next: Set<string> = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }, [])

  const isEventSaved = useCallback((eventId: string): boolean => {
    return savedEventIds.has(eventId)
  }, [savedEventIds])

  // ============================================================================
  // LOGO TAP HANDLER (Admin access)
  // ============================================================================
   const handleLogoTap = useCallback((): void => {
    if (logoTapTimer.current) {
      clearTimeout(logoTapTimer.current)
    }
    
    const newCount: number = logoTapCount + 1
    setLogoTapCount(newCount)
    
    if (newCount >= 5) {
      setShowAdminMenu(true)
      setLogoTapCount(0)
      return
    }
    
    logoTapTimer.current = setTimeout(() => {
      setLogoTapCount(0)
    }, 2000)
  }, [logoTapCount])

  // ============================================================================
  // LIST SCROLL HANDLER (Day label tracking)
  // ============================================================================
    const handleListScroll = useCallback((): void => {
    if (!listScrollRef.current) return
    
    const scrollTop: number = listScrollRef.current.scrollTop
    const labels: string[] = Object.keys(grouped)
    
    for (let i = 0; i < labels.length; i++) {
      const label: string = labels[i]
      const el: HTMLDivElement | undefined = daySectionRefs.current.get(label)
      if (el) {
        const rect: DOMRect = el.getBoundingClientRect()
        const containerRect: DOMRect = listScrollRef.current.getBoundingClientRect()
        if (rect.top <= containerRect.top + 50 && rect.bottom > containerRect.top) {
          setVisibleDayLabel(label)
          break
        }
      }
    }
  }, [grouped])

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  useEffect(() => {
    supabase.from('events').select('*, venue:venues(*)').eq('status', 'published')
      .gte('start_time', new Date().toISOString().split('T')[0]).order('start_time')
      .then(({ data }: { data: Event[] | null }) => { 
        if (data) {
          setEvents(data)
          const venueIds = new Set<string>()
          for (let i = 0; i < data.length; i++) {
            venueIds.add(data[i].venue_id)
          }
          trackMapLoaded(data.length, venueIds.size)
        }
        setLoading(false) 
      })
  }, [])

  // ============================================================================
  // MAP INITIALIZATION - P1 FIX: minZoom changed from 10 to 12
  // ============================================================================
  useEffect(() => {
    if (!mapContainer.current) return
    
    if (map.current) {
      map.current.remove()
      map.current = null
    }
    
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
    
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-1.6131, 54.9695],
      zoom: showIntro ? 2 : 14,
      pitch: 0,
      bearing: 0,
      minZoom: 12, // P1 FIX: Changed from 10 to prevent globe view
      maxZoom: 18,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
      renderWorldCopies: false,
      dragPan: !showIntro,
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
  }, [deviceType])

  // Intro animation sequence
  useEffect(() => {
    if (!showIntro || !mapReady || !map.current) return
    
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
    
    const zoomTimer = setTimeout(() => {
      setIntroPhase('zoom')
      map.current?.flyTo({
        center: [-1.6131, 54.9695],
        zoom: 14,
        duration: 600,
        easing: (t) => 1 - Math.pow(1 - t, 3),
        essential: true,
      })
      setTimeout(() => {
        if (map.current) {
          map.current.dragPan.enable()
          map.current.scrollZoom.enable()
          map.current.doubleClickZoom.enable()
          map.current.touchZoomRotate.enable()
        }
      }, 600)
    }, 300)
    
    const fadeTimer = setTimeout(() => {
      setIntroPhase('done')
      localStorage.setItem('so_intro_seen', 'true')
    }, 800)
    
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
      setShowUserLocation(false)
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }
      trackLocationDenied()
    } else {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            setUserLocation({ lat: latitude, lng: longitude })
            setShowUserLocation(true)
            trackLocationEnabled()
          },
          (error) => {
            console.log('Location error:', error)
            alert('Unable to get your location. Please enable location services.')
            trackLocationDenied()
          },
          { enableHighAccuracy: true, timeout: 10000 }
        )
      } else {
        alert('Geolocation is not supported by your browser.')
      }
    }
  }, [showUserLocation])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setShowMenu(false)
  }

  useEffect(() => {
    if (!map.current || !mapReady || !showUserLocation || !userLocation) return
    
    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
    }
    
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
  // MARKER HIGHLIGHT
  // ============================================================================
  const highlightMarker = useCallback((eventId: string | null) => {
    markersRef.current.forEach((data, id) => {
      const selected = eventId && id.includes(eventId)
      if (data.inner) {
        data.inner.style.transition = `transform ${SPRING.feedbackDuration}ms ${SPRING.feedback}, filter ${SPRING.feedbackDuration}ms ease-out`
        data.inner.style.transform = selected ? 'scale(1.25)' : 'scale(1)'
        data.inner.style.filter = selected 
          ? 'drop-shadow(0 6px 10px rgba(0,0,0,0.5))' 
          : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
      }
      data.el.style.zIndex = selected ? '5' : '1'
    })
  }, [])

  // ============================================================================
  // SELECT EVENT
  // ============================================================================
  const selectEvent = useCallback((event: Event): void => {
    let idx: number = -1
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].id === event.id) {
        idx = i
        break
      }
    }
    if (idx !== -1) {
      setCurrentIndex(idx)
      setViewMode('preview')
      setSheetVisible(true)
      setClusterEvents([])
      highlightMarker(event.id)
      
      if (event.venue && map.current) {
        const currentZoom: number = map.current.getZoom() || 14
        map.current.easeTo({
          center: [event.venue.lng, event.venue.lat],
          zoom: Math.max(currentZoom, 14.5),
          duration: 300,
        })
      }
      
      trackEventView(event.id, event.title, event.venue?.name || '', 'list')
    }
  }, [filtered, highlightMarker])

  // ============================================================================
  // NAVIGATE (Prev/Next)
  // ============================================================================
  const navigate = useCallback((direction: 'prev' | 'next'): void => {
    if (isAnimating) return
    
    setIsAnimating(true)
    
    const newIndex: number = direction === 'next' 
      ? Math.min(currentIndex + 1, filtered.length - 1)
      : Math.max(currentIndex - 1, 0)
    
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex)
      const newEvent: Event = filtered[newIndex]
      highlightMarker(newEvent.id)
      
      if (newEvent.venue && map.current) {
        map.current.easeTo({
          center: [newEvent.venue.lng, newEvent.venue.lat],
          zoom: 14.5,
          duration: 300,
        })
      }
    }
    
    setTimeout(() => setIsAnimating(false), 300)
  }, [currentIndex, filtered, highlightMarker, isAnimating])

  // ============================================================================
  // SHEET CONTROLS
  // ============================================================================
  const openSheet = useCallback((mode: ViewMode): void => {
    setViewMode(mode)
    requestAnimationFrame(() => {
      setSheetVisible(true)
    })
  }, [])

  const closeSheet = useCallback((): void => {
    setSheetVisible(false)
    setTimeout(() => {
      setViewMode('map')
      setClusterEvents([])
      highlightMarker(null)
    }, SPRING.sheetDuration)
  }, [highlightMarker])

  // ============================================================================
  // TOUCH/GESTURE HANDLERS
  // ============================================================================
  const onTouchStart = useCallback((e: React.TouchEvent): void => {
    const touch = e.touches[0]
    setStartX(touch.clientX)
    setStartY(touch.clientY)
    setDragX(0)
    setDragY(0)
    setIsDragging(true)
    setDragDirection(null)
    lastPos.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent): void => {
    if (!isDragging) return
    const touch = e.touches[0]
    const dx = touch.clientX - startX
    const dy = touch.clientY - startY
    if (!dragDirection) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        setDragDirection(Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical')
      }
    }
    if (dragDirection === 'horizontal') {
      setDragX(dx)
    } else if (dragDirection === 'vertical') {
      setDragY(Math.max(0, dy))
    }
    const now = Date.now()
    const dt = now - lastPos.current.time
    if (dt > 0) {
      setVelocity({
        x: (touch.clientX - lastPos.current.x) / dt * 1000,
        y: (touch.clientY - lastPos.current.y) / dt * 1000,
      })
    }
    lastPos.current = { x: touch.clientX, y: touch.clientY, time: now }
  }, [isDragging, startX, startY, dragDirection])

  const onTouchEnd = useCallback((): void => {
    setIsDragging(false)
    if (dragDirection === 'vertical') {
      if (dragY > GESTURE.dismissThreshold || velocity.y > GESTURE.dismissVelocity) {
        closeSheet()
      }
    } else if (dragDirection === 'horizontal' && viewMode === 'preview') {
      if (dragX < -GESTURE.swipeThreshold || velocity.x < -GESTURE.velocityThreshold) {
        navigate('next')
      } else if (dragX > GESTURE.swipeThreshold || velocity.x > GESTURE.velocityThreshold) {
        navigate('prev')
      }
    }
    setDragX(0)
    setDragY(0)
    setDragDirection(null)
  }, [dragDirection, dragX, dragY, velocity, viewMode, closeSheet, navigate])

  // ============================================================================
  // TRANSFORM HELPERS
  // ============================================================================
  const getSheetStyle = (visible: boolean): React.CSSProperties => ({
    transform: visible ? 'translateY(0)' : 'translateY(100%)',
    transition: isDragging ? 'none' : `transform ${SPRING.sheetDuration}ms ${SPRING.sheet}`,
  })

  const getCardTransform = (): React.CSSProperties => ({
    transform: `translateX(${dragX * 0.5}px)`,
    transition: isDragging ? 'none' : `transform ${SPRING.springBackDuration}ms ${SPRING.springBack}`,
  })

  const getDismissTransform = (): React.CSSProperties => ({
    transform: `translateY(${dragY}px) scale(${1 - dragY * 0.0005})`,
    transition: isDragging ? 'none' : `transform ${SPRING.springBackDuration}ms ${SPRING.springBack}`,
    opacity: 1 - dragY * 0.002,
  })

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const noSelectStyle: React.CSSProperties = {
    userSelect: 'none',
    WebkitUserSelect: 'none',
  }

  const peekProgress: number = Math.min(Math.abs(dragX) / GESTURE.swipeThreshold, 1)
  const dismissProgress: number = Math.min(dragY / GESTURE.dismissThreshold, 1)
  const showPrevPeek: boolean = dragX > 20 && currentIndex > 0
  const showNextPeek: boolean = dragX < -20 && currentIndex < filtered.length - 1

  // ============================================================================
  // MARKERS
  // ============================================================================
  useEffect(() => {
    if (!map.current || !mapReady) return
    
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

    const byVenue: Record<string, Event[]> = {}
    for (let i = 0; i < filtered.length; i++) {
      const e: Event = filtered[i]
      if (e.venue) {
        const k = `${e.venue.lat.toFixed(6)},${e.venue.lng.toFixed(6)}`
        if (!byVenue[k]) byVenue[k] = []
        byVenue[k].push(e)
      }
    }

    const venueKeys: string[] = Object.keys(byVenue)
    for (let vi = 0; vi < venueKeys.length; vi++) {
      const key: string = venueKeys[vi]
      const evs: Event[] = byVenue[key]
      const v: Venue = evs[0].venue!
      const count: number = evs.length
      const ids: string = evs.map((e: Event) => e.id).join(',')
      let hasCurated = false
      for (let i = 0; i < evs.length; i++) {
        if (evs[i].so_pick) {
          hasCurated = true
          break
        }
      }

      const el = document.createElement('div')
      el.style.cursor = 'pointer'
      el.style.zIndex = '1'
      
      const inner = document.createElement('div')
      inner.style.transition = `transform ${SPRING.feedbackDuration}ms ${SPRING.feedback}, filter ${SPRING.feedbackDuration}ms ease-out`
      inner.style.transformOrigin = 'center bottom'
      inner.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'

      if (count > 1) {
        el.style.width = '44px'
        el.style.height = '44px'
        if (hasCurated) {
          inner.innerHTML = `<div style="position:relative;width:44px;height:44px;background:linear-gradient(135deg,#ab67f7,#d7b3ff);border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:white;box-shadow:0 4px 12px rgba(0,0,0,0.3);">${count}<img src="/so-icon.png" style="position:absolute;top:-6px;right:-6px;height:14px;width:auto;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));" /></div>`
        } else {
          inner.innerHTML = `<div style="width:44px;height:44px;background:linear-gradient(135deg,#ab67f7,#d7b3ff);border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:white;box-shadow:0 4px 12px rgba(0,0,0,0.3);">${count}</div>`
        }
      } else {
        el.style.width = '32px'
        el.style.height = '42px'
        if (hasCurated) {
          inner.innerHTML = `<div style="position:relative;width:32px;height:42px;"><svg viewBox="0 0 24 36" width="32" height="42" style="position:absolute;top:0;left:0;"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="url(#g${ids.replace(/,/g, '')})"/><circle cx="12" cy="12" r="6" fill="white"/><defs><linearGradient id="g${ids.replace(/,/g, '')}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ab67f7"/><stop offset="100%" stop-color="#d7b3ff"/></linearGradient></defs></svg><img src="/so-icon.png" style="position:absolute;top:5px;left:50%;transform:translateX(-50%);height:10px;width:auto;" /></div>`
        } else {
          inner.innerHTML = `<svg viewBox="0 0 24 36" width="32" height="42"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="url(#g${ids.replace(/,/g, '')})"/><circle cx="12" cy="12" r="5" fill="white"/><defs><linearGradient id="g${ids.replace(/,/g, '')}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ab67f7"/><stop offset="100%" stop-color="#d7b3ff"/></linearGradient></defs></svg>`
        }
      }
      
      el.appendChild(inner)

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
        
        if (count > 1) {
          setClusterEvents(evs)
          setViewMode('cluster')
        } else {
          let idx = -1
          for (let i = 0; i < filtered.length; i++) {
            if (filtered[i].id === evs[0].id) {
              idx = i
              break
            }
          }
          setCurrentIndex(idx)
          setViewMode('preview')
          trackMarkerClick(evs[0].id, evs[0].title, v.name)
          trackEventView(evs[0].id, evs[0].title, v.name, 'map_pin')
        }
        
        requestAnimationFrame(() => {
          setSheetVisible(true)
          highlightMarker(evs[0].id)
        })
        
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
    }

    if (filtered.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      for (let i = 0; i < filtered.length; i++) {
        const e: Event = filtered[i]
        if (e.venue) bounds.extend([e.venue.lng, e.venue.lat])
      }
      
      const padding = deviceType === 'desktop' 
        ? { top: 100, bottom: 100, left: 420, right: 100 }
        : deviceType === 'tablet'
        ? { top: 100, bottom: 150, left: 350, right: 50 }
        : { top: 180, bottom: 150, left: 40, right: 40 }
      
      map.current.fitBounds(bounds, { 
        padding,
        maxZoom: 15,
        minZoom: 13,
        duration: 600 
      })
    }
  }, [filtered, mapReady, highlightMarker, deviceType])

// ============================================================================
// END OF PART 1 - COPY PART 2 DIRECTLY AFTER THIS LINE
// ============================================================================
// ============================================================================
// SOUNDED OUT - PAGE.TSX - PART 2 OF 3
// ============================================================================
// This is lines ~850 to ~1700
// Copy this AFTER Part 1, BEFORE Part 3
// This section contains all the component definitions
// ============================================================================

// ============================================================================
// P1 FIX: ONBOARDING MODAL COMPONENT
// ============================================================================
const OnboardingModal = ({ onComplete }: OnboardingModalProps): JSX.Element => (
  <div style={{
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.95)',
    zIndex: 500,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  }}>
    <div style={{ maxWidth: '380px', width: '100%', textAlign: 'center' }}>
      <img src="/logo.svg" alt="Sounded Out" style={{ height: '36px', marginBottom: '32px' }} />
      
      <h1 style={{
        fontSize: '28px',
        fontWeight: 800,
        lineHeight: 1.2,
        marginBottom: '12px',
        background: '#ab67f7',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Discover Newcastle&apos;s Best Nights Out
      </h1>
      
      <p style={{ fontSize: '16px', color: '#999', lineHeight: 1.6, marginBottom: '40px' }}>
        Find gigs, clubs &amp; events happening tonight and beyond — all on one map.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(171,103,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📍</div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '2px' }}>Tap pins on the map</p>
            <p style={{ fontSize: '13px', color: '#999' }}>Each pin is an event happening near you</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(171,103,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📅</div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '2px' }}>Filter by date &amp; genre</p>
            <p style={{ fontSize: '13px', color: '#999' }}>Today, tomorrow, weekend — or pick a day</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(171,103,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>⬆️</div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '2px' }}>Swipe up to browse</p>
            <p style={{ fontSize: '13px', color: '#999' }}>See the full list and explore details</p>
          </div>
        </div>
      </div>
      
      <button
        onClick={onComplete}
        style={{
          width: '100%',
          padding: '18px 32px',
          background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
          border: 'none',
          borderRadius: '14px',
          fontSize: '17px',
          fontWeight: 700,
          color: 'white',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(171,103,247,0.3)',
        }}
      >
        Let&apos;s Go
      </button>
      
      <p style={{ fontSize: '12px', color: '#777', marginTop: '16px' }}>🎵 Curated for Newcastle&apos;s nightlife</p>
    </div>
  </div>
)

// ============================================================================
// P1 FIX: SAVE BUTTON COMPONENT
// ============================================================================
const SaveButton = ({ eventId, saved, onToggle, size = 'medium' }: SaveButtonProps): JSX.Element => {
  const [animating, setAnimating] = useState<boolean>(false)
  
  const handleClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    e.preventDefault()
    if (!saved) {
      setAnimating(true)
      setTimeout(() => setAnimating(false), 600)
    }
    onToggle(eventId, e)
  }
  
  const sizeMap: Record<string, { button: number; icon: number }> = {
    small: { button: 40, icon: 16 },
    medium: { button: 48, icon: 20 },
    large: { button: 52, icon: 24 },
  }
  const { button: buttonSize, icon: iconSize } = sizeMap[size]
  
  return (
    <button
      onClick={handleClick}
      aria-label={saved ? 'Remove from saved' : 'Save event'}
      style={{
        width: `${buttonSize}px`,
        height: `${buttonSize}px`,
        minWidth: `${buttonSize}px`,
        minHeight: `${buttonSize}px`,
        borderRadius: '50%',
        border: 'none',
        background: saved ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.08)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 200ms ease',
        transform: animating ? 'scale(1.2)' : 'scale(1)',
        flexShrink: 0,
      }}
    >
      <svg 
        width={iconSize} 
        height={iconSize} 
        viewBox="0 0 24 24" 
        fill={saved ? '#f87171' : 'none'} 
        stroke={saved ? '#f87171' : '#999'}
        strokeWidth="2"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  )
}

// ============================================================================
// P1 FIX: EMPTY STATE COMPONENT
// ============================================================================
const EmptyStateNoEvents = ({ filterLabel, onReset }: EmptyStateProps): JSX.Element => (
  <div style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <div style={{
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, rgba(171,103,247,0.1), rgba(171,103,247,0.05))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '20px',
    }}>
      <span style={{ fontSize: '36px' }}>🌙</span>
    </div>
    
    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ddd', marginBottom: '8px' }}>
      No events {filterLabel}
    </h3>
    
    <p style={{ fontSize: '14px', color: '#999', lineHeight: 1.5, marginBottom: '24px', maxWidth: '260px' }}>
      The dance floor is quiet... for now. Try a different date or clear your filters.
    </p>
    
    <button
      onClick={onReset}
      style={{
        padding: '14px 24px',
        background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
        border: 'none',
        borderRadius: '12px',
        color: 'white',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      Show Today&apos;s Events
    </button>
  </div>
)

// ============================================================================
// P1 FIX: EVENT THUMBNAIL COMPONENT (with placeholder)
// ============================================================================
const EventThumbnail = ({ imageUrl, genres, size = 52 }: { imageUrl: string | null; genres: string | null; size?: number }): JSX.Element => {
  if (imageUrl) {
    return (
      <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
        <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }
  
  const style: GenreStyle = getGenreStyle(genres)
  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '10px',
      background: style.gradient,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: size > 48 ? '24px' : '20px', opacity: 0.7 }}>{style.emoji}</span>
    </div>
  )
}

// ============================================================================
// NAVIGATION MENU COMPONENT (Shared between desktop/mobile)
// ============================================================================
const NavigationLinks = ({ onClose, user, onSignOut }: { onClose?: () => void; user?: { id: string; email?: string } | null; onSignOut?: () => void }) => (
  <>
    {/* Discover Section */}
    <p style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', paddingLeft: '4px' }}>
      Discover
    </p>

    <Link href="/events" onClick={onClose} style={{ display: 'block', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', color: 'white', textDecoration: 'none', fontSize: '15px', fontWeight: 500, marginBottom: '8px' }}>
      All Events
    </Link>

    <Link href="/venues" onClick={onClose} style={{ display: 'block', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', color: 'white', textDecoration: 'none', fontSize: '15px', fontWeight: 500, marginBottom: '8px' }}>
      Venues
    </Link>

    <Link href="/saved" onClick={onClose} style={{ display: 'block', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', color: 'white', textDecoration: 'none', fontSize: '15px', fontWeight: 500, marginBottom: '8px' }}>
      Saved
    </Link>

    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />

    {/* Partner Section */}
    <p style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', paddingLeft: '4px' }}>
      Partner
    </p>

    <Link href="/portal" onClick={onClose} style={{ display: 'block', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', color: 'white', textDecoration: 'none', fontSize: '15px', fontWeight: 500, marginBottom: '8px' }}>
      Partner Portal
    </Link>

    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />

    {/* Account Section */}
    <p style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', paddingLeft: '4px' }}>
      Account
    </p>

    {user ? (
      <>
        <div style={{ padding: '12px 16px', background: 'rgba(171,103,247,0.1)', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(171,103,247,0.2)' }}>
          <p style={{ fontSize: '13px', color: '#ab67f7', fontWeight: 600 }}>Signed in as</p>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{user.email}</p>
        </div>

        <Link href="/profile" onClick={onClose} style={{ display: 'block', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', color: 'white', textDecoration: 'none', fontSize: '15px', fontWeight: 500, marginBottom: '8px' }}>
          👤 Profile
        </Link>

        <Link href="/settings" onClick={onClose} style={{ display: 'block', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', color: 'white', textDecoration: 'none', fontSize: '15px', fontWeight: 500, marginBottom: '8px' }}>
          ⚙️ Settings
        </Link>

        <button
          onClick={() => { if (onSignOut) onSignOut(); if (onClose) onClose(); }}
          style={{ display: 'block', width: '100%', padding: '14px 16px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', color: '#f87171', fontSize: '15px', fontWeight: 500, marginBottom: '8px', cursor: 'pointer', textAlign: 'left' }}
        >
          Sign Out
        </button>
      </>
    ) : (
      <>
        <Link href="/login" onClick={onClose} style={{ display: 'block', padding: '14px 16px', background: '#ab67f7', borderRadius: '10px', color: 'white', textDecoration: 'none', fontSize: '15px', fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>
          Sign In
        </Link>

        <Link href="/signup" onClick={onClose} style={{ display: 'block', padding: '14px 16px', background: 'rgba(171,103,247,0.15)', border: '1px solid rgba(171,103,247,0.3)', borderRadius: '10px', color: '#ab67f7', textDecoration: 'none', fontSize: '15px', fontWeight: 600, textAlign: 'center' }}>
          Create Account
        </Link>
      </>
    )}

    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />

    {/* Footer Links */}
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      <a href="https://instagram.com/sounded.out" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#777', textDecoration: 'none' }}>
        Instagram
      </a>
      <Link href="/about" onClick={onClose} style={{ fontSize: '13px', color: '#777', textDecoration: 'none' }}>
        About
      </Link>
      <Link href="/privacy" onClick={onClose} style={{ fontSize: '13px', color: '#777', textDecoration: 'none' }}>
        Privacy
      </Link>
      <Link href="/terms" onClick={onClose} style={{ fontSize: '13px', color: '#777', textDecoration: 'none' }}>
        Terms
      </Link>
    </div>
  </>
)

  // ============================================================================
  // DESKTOP/TABLET SIDEBAR COMPONENT - P1 FIXES APPLIED
  // ============================================================================
  const DesktopSidebar = () => (
    <aside style={{
      width: deviceType === 'desktop' ? '380px' : '320px',
      height: '100%',
      background: '#0a0a0b',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Sidebar Header */}
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <img 
            src="/logo.svg" 
            alt="Sounded Out" 
            onClick={handleLogoTap}
            style={{ height: '28px', width: 'auto', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* P1 FIX: Menu button with 44px touch target */}
            <button
              onClick={() => { setShowMenu(!showMenu); trackMenuOpen() }}
              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.08)',
                color: '#999',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        
        {/* Location label - P1 FIX: Better contrast */}
        <p style={{ fontSize: '12px', color: '#777', marginBottom: '12px' }}>Newcastle</p>
        
        {/* P1 FIX: Date filters with 44px touch targets and better selected state */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {(['today', 'tomorrow', 'weekend'] as const).map((f: 'today' | 'tomorrow' | 'weekend') => {
            const isSelected: boolean = dateFilter === f
            return (
              <button 
                key={f} 
                onClick={() => { 
                  if (dateFilter !== f) {
                    setDateFilter(f)
                    setCurrentIndex(0)
                    setViewMode('map')
                    setSheetVisible(false)
                    highlightMarker(null)
                    trackDateFilter(f, filtered.length)
                  }
                }}
                aria-pressed={isSelected}
                style={{
                  padding: '10px 18px',
                  minHeight: '44px',
                  borderRadius: '22px',
                  border: isSelected ? '2px solid #ab67f7' : '2px solid transparent',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: isSelected 
                    ? 'linear-gradient(135deg, #ab67f7, #c490ff)' 
                    : 'rgba(255,255,255,0.08)',
                  color: isSelected ? 'white' : '#bbb',
                  transition: `all ${SPRING.iosDuration}ms ${SPRING.ios}`,
                  boxShadow: isSelected ? '0 4px 12px rgba(171,103,247,0.3)' : 'none',
                }}
              >
                {f === 'today' ? 'Today' : f === 'tomorrow' ? 'Tomorrow' : 'Weekend'}
              </button>
            )
          })}
          <button 
            onClick={() => setShowDatePicker(!showDatePicker)} 
            style={{
              padding: '10px 16px',
              minHeight: '44px',
              borderRadius: '22px',
              border: showDatePicker ? '2px solid #ab67f7' : '2px solid rgba(255,255,255,0.15)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              background: showDatePicker ? 'rgba(171,103,247,0.15)' : 'transparent',
              color: '#ab67f7',
            }}
          >
            {showDatePicker ? '✕ Close' : '+ More'}
          </button>
        </div>
        
        {/* Date picker */}
        {showDatePicker && (
          <div style={{ 
            padding: '14px', 
            background: '#1a1a1f', 
            borderRadius: '12px',
            marginBottom: '12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {getNext7Days().map((d: { str: string; name: string; num: number }) => (
                <button 
                  key={d.str} 
                  onClick={() => { 
                    setDateFilter(d.str)
                    setShowDatePicker(false)
                    setCurrentIndex(0)
                    trackDateFilter(d.str, filtered.length)
                  }} 
                  style={{
                    width: '48px',
                    minWidth: '48px',
                    padding: '8px 4px', 
                    borderRadius: '10px', 
                    border: 'none', 
                    cursor: 'pointer',
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: '4px',
                    background: dateFilter === d.str ? '#ab67f7' : 'transparent',
                    color: dateFilter === d.str ? 'white' : '#999',
                  }}
                >
                  <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>{d.name}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{d.num}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* P1 FIX: Genre chips with better touch targets and states */}
        {availableGenres.length > 0 && (
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            flexWrap: 'wrap',
          }}>
            {availableGenres.map((genre: string) => {
              const isSelected: boolean = activeGenre === genre
              return (
                <button
                  key={genre}
                  onClick={() => {
                    setActiveGenre(isSelected ? null : genre)
                    setCurrentIndex(0)
                    setViewMode('map')
                    setSheetVisible(false)
                    highlightMarker(null)
                    trackGenreFilter(genre, filtered.length)
                  }}
                  aria-pressed={isSelected}
                  style={{
                    padding: '8px 14px',
                    minHeight: '40px',
                    borderRadius: '20px',
                    border: isSelected ? '2px solid #ab67f7' : '1px solid rgba(255,255,255,0.15)',
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(171,103,247,0.2)' : 'transparent',
                    color: isSelected ? '#ab67f7' : '#aaa',
                    textTransform: 'capitalize',
                    transition: 'all 150ms ease',
                  }}
                >
                  {genre}
                </button>
              )
            })}
            {/* Clear filters button */}
            {(activeGenre || showFreeOnly) && (
              <button
                onClick={() => { setActiveGenre(null); setShowFreeOnly(false) }}
                style={{
                  padding: '8px 14px',
                  minHeight: '40px',
                  borderRadius: '20px',
                  border: '1px solid rgba(248,113,113,0.3)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'rgba(248,113,113,0.1)',
                  color: '#f87171',
                }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Event count - P1 FIX: Better contrast */}
      <div style={{ 
        padding: '12px 20px', 
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '13px', color: '#999' }}>
          <span style={{ color: '#ab67f7', fontWeight: 700 }}>{filtered.length}</span> events {filterLabel}
        </span>
      </div>
      
      {/* Event list */}
      <div 
        ref={listScrollRef}
        onScroll={handleListScroll}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '12px',
        }}
      >
        {Object.entries(grouped).map(([label, evs]: [string, Event[]], gi: number) => (
          <div 
            key={label} 
            ref={(el) => { if (el) daySectionRefs.current.set(label, el) }}
            style={{ marginTop: gi > 0 ? '20px' : '0' }}
          >
            <div style={{ 
              fontSize: '11px', 
              fontWeight: 700, 
              color: '#666', 
              textTransform: 'uppercase', 
              marginBottom: '10px',
              paddingLeft: '4px',
            }}>
              {label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {evs.map((e: Event) => (
                <div 
                  key={e.id} 
                  onClick={() => selectEvent(e)} 
                  style={{
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '12px', 
                    padding: '14px',
                    minHeight: '72px',
                    background: current?.id === e.id ? 'rgba(171,103,247,0.1)' : 'rgba(255,255,255,0.02)',
                    border: current?.id === e.id ? '1px solid rgba(171,103,247,0.3)' : '1px solid transparent',
                    borderRadius: '14px', 
                    cursor: 'pointer',
                    transition: `all ${SPRING.feedbackDuration}ms ${SPRING.feedback}`,
                  }}
                >
                  {/* P1 FIX: Use EventThumbnail component */}
                  <EventThumbnail imageUrl={e.image_url} genres={e.genres} size={52} />
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      {e.so_pick && (
                        <img src="/so-icon.png" alt="Curated" style={{ height: '12px', width: 'auto' }} />
                      )}
                      <span style={{ 
                        fontSize: '13px', 
                        fontWeight: 600, 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis' 
                      }}>
                        {e.title}
                      </span>
                    </div>
                    <Link 
                      href={`/venue/${e.venue?.id}`} 
                      onClick={(ev: React.MouseEvent) => ev.stopPropagation()}
                      style={{ fontSize: '11px', color: '#aaa', marginBottom: '2px', textDecoration: 'none', display: 'block' }}
                    >
                      {e.venue?.name}
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#ab67f7', fontWeight: 600 }}>
                        {formatTime(e.start_time)}
                      </span>
                      {e.genres && (
                        <span style={{ fontSize: '10px', color: '#22d3ee' }}>
                          {e.genres.split(',')[0]?.trim()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Right side: Save button + Price */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    {/* P1 FIX: Save button */}
                    <SaveButton 
                      eventId={e.id}
                      saved={isEventSaved(e.id)}
                      onToggle={toggleSaveEvent}
                      size="small"
                    />
                    {e.sold_out && (
                      <span style={{ 
                        fontSize: '9px', 
                        fontWeight: 700, 
                        color: '#f87171', 
                        background: 'rgba(248,113,113,0.15)', 
                        padding: '2px 6px', 
                        borderRadius: '4px' 
                      }}>
                        SOLD OUT
                      </span>
                    )}
                    {isFree(e.price_min, e.price_max) ? (
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: 700, 
                        color: '#22c55e', 
                        background: 'rgba(34,197,94,0.15)', 
                        padding: '3px 6px', 
                        borderRadius: '4px' 
                      }}>
                        FREE
                      </span>
                    ) : formatPrice(e.price_min, e.price_max) && (
                      <span style={{ fontSize: '11px', color: '#999', fontWeight: 600 }}>
                        {formatPrice(e.price_min, e.price_max)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {/* P1 FIX: Use EmptyStateNoEvents component */}
        {filtered.length === 0 && (
          <EmptyStateNoEvents 
            filterLabel={filterLabel} 
            onReset={() => { 
              setDateFilter('today')
              setActiveGenre(null)
              setShowFreeOnly(false)
            }} 
          />
        )}
      </div>
      
      {/* Footer with Privacy/Terms - P1 FIX: Better contrast */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        flexShrink: 0,
      }}>
        <Link href="/privacy" style={{ fontSize: '11px', color: '#666', textDecoration: 'none' }}>
          Privacy Policy
        </Link>
        <span style={{ color: '#444', fontSize: '11px' }}>·</span>
        <Link href="/terms" style={{ fontSize: '11px', color: '#666', textDecoration: 'none' }}>
          Terms of Service
        </Link>
      </div>
    </aside>
  )


  // ============================================================================
  // DESKTOP/TABLET DETAIL PANEL - P1 FIXES APPLIED
  // ============================================================================
  const DesktopDetailPanel = () => {
    if (!current) return null
    
    return (
      <div style={{
        width: deviceType === 'desktop' ? '420px' : '360px',
        height: '100%',
        background: '#0a0a0b',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Header - P1 FIX: 44px close button */}
        <div style={{ 
          padding: '16px 20px', 
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ab67f7' }}>Event Details</h3>
          <button
            onClick={() => { setViewMode('map'); setSheetVisible(false); highlightMarker(null) }}
            style={{
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.1)',
              color: '#999',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
        
        {/* Content - Scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* P1 FIX: Image with genre placeholder */}
          {current.image_url ? (
            <div style={{ 
              width: '100%', 
              aspectRatio: '16/9', 
              borderRadius: '12px', 
              overflow: 'hidden', 
              marginBottom: '16px' 
            }}>
              <img src={current.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ 
              width: '100%', 
              aspectRatio: '16/9', 
              background: getGenreStyle(current.genres).gradient, 
              borderRadius: '12px', 
              marginBottom: '16px', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '40px', opacity: 0.6 }}>{getGenreStyle(current.genres).emoji}</span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {current.genres?.split(',')[0]?.trim() || 'Live Event'}
              </span>
            </div>
          )}
          
          {/* Date/Time - P1 FIX: Better contrast */}
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
          
          {/* Title */}
          <h2 style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.2, marginBottom: '6px' }}>
            {current.title}
          </h2>
          
          {/* Badges */}
          {current.so_pick && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <img src="/so-icon.png" alt="Curated" style={{ height: '14px', width: 'auto' }} />
              <span style={{ fontSize: '11px', color: '#999' }}>Curated by Sounded Out</span>
            </div>
          )}
          
          {current.is_verified && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <span style={{ 
                width: '16px', height: '16px', background: '#ab67f7', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'white'
              }}>✓</span>
              <span style={{ fontSize: '11px', color: '#ab67f7', fontWeight: 600 }}>Verified</span>
            </div>
          )}
          
          {/* Venue - P1 FIX: Better contrast */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', color: '#999' }}>{current.venue?.name}</span>
            {current.venue?.instagram_url && (
              <a href={current.venue.instagram_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px' }}>📸</a>
            )}
          </div>
          
          {/* No-phones policy */}
          {(current.no_phones || current.venue?.no_phones) && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px',
              background: 'rgba(255,200,50,0.08)', borderRadius: '12px', marginBottom: '16px',
              border: '1px solid rgba(255,200,50,0.15)',
            }}>
              <span style={{ fontSize: '16px' }}>📵</span>
              <span style={{ fontSize: '12px', color: '#ffc832' }}>No phones policy — enjoy the moment</span>
            </div>
          )}
          
          {/* Tags */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {current.sold_out && (
              <span style={{ padding: '6px 12px', background: 'rgba(248,113,113,0.15)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#f87171' }}>
                SOLD OUT
              </span>
            )}
            {isFree(current.price_min, current.price_max) && (
              <span style={{ padding: '6px 12px', background: 'rgba(34,197,94,0.15)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#22c55e' }}>
                FREE
              </span>
            )}
            {current.genres?.split(',').slice(0, showAllGenres ? undefined : 4).map((g: string, i: number) => (
              <span key={i} style={{ padding: '6px 12px', background: 'rgba(171,103,247,0.12)', borderRadius: '8px', fontSize: '12px', color: '#ab67f7' }}>
                {g.trim()}
              </span>
            ))}
            {current.genres && current.genres.split(',').length > 4 && !showAllGenres && (
              <button onClick={() => setShowAllGenres(true)} style={{
                padding: '6px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px',
                fontSize: '12px', color: '#999', border: 'none', cursor: 'pointer',
              }}>
                +{current.genres.split(',').length - 4} more
              </button>
            )}
          </div>
          
          {/* Price */}
          {!isFree(current.price_min, current.price_max) && formatPrice(current.price_min, current.price_max) && (
            <p style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
              {formatPrice(current.price_min, current.price_max)}
            </p>
          )}
          
          {/* Description */}
          {current.description && (
            <div style={{ marginBottom: '16px' }}>
              <button onClick={() => setShowDescription(!showDescription)} style={{
                width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#999',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>More Info</span>
                <span style={{ transform: showDescription ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}>▼</span>
              </button>
              {showDescription && (
                <div style={{
                  padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '0 0 10px 10px',
                  marginTop: '-1px', borderLeft: '1px solid rgba(255,255,255,0.1)',
                  borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <p style={{ fontSize: '13px', color: '#999', lineHeight: 1.6 }}>{current.description}</p>
                </div>
              )}
            </div>
          )}
          
         {/* Actions - 2x3 Grid */}
<EventActions
  event={{
    id: current.id,
    title: current.title,
    start_time: current.start_time,
    event_url: current.event_url,
    sold_out: current.sold_out,
    price_min: current.price_min,
    price_max: current.price_max,
    venue: current.venue,
  }}
  isSaved={isEventSaved(current.id)}
  isLoggedIn={!!user}
  onSave={toggleSaveEvent}
  onShowLoginModal={() => setShowLoginModal(true)}
  onClaim={() => { setClaimType('event'); setShowClaimModal(true) }}
  formatPrice={formatPrice}
  getDateLabel={getDateLabel}
/>
          
          {/* Navigation - P1 FIX: 44px buttons */}
          <div style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)'
          }}>
            <button 
              onClick={() => navigate('prev')} 
              disabled={currentIndex === 0}
              style={{
                minHeight: '44px',
                minWidth: '44px',
                background: currentIndex === 0 ? 'transparent' : 'rgba(171,103,247,0.2)',
                border: currentIndex === 0 ? 'none' : '1px solid rgba(171,103,247,0.3)',
                borderRadius: '10px', padding: '10px 14px',
                color: currentIndex === 0 ? '#444' : '#ab67f7',
                fontSize: '13px', fontWeight: 600, cursor: currentIndex === 0 ? 'default' : 'pointer',
              }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: '12px', color: '#555' }}>{currentIndex + 1} / {filtered.length}</span>
            <button 
              onClick={() => navigate('next')} 
              disabled={currentIndex === filtered.length - 1}
              style={{
                minHeight: '44px',
                minWidth: '44px',
                background: currentIndex === filtered.length - 1 ? 'transparent' : 'rgba(171,103,247,0.2)',
                border: currentIndex === filtered.length - 1 ? 'none' : '1px solid rgba(171,103,247,0.3)',
                borderRadius: '10px', padding: '10px 14px',
                color: currentIndex === filtered.length - 1 ? '#444' : '#ab67f7',
                fontSize: '13px', fontWeight: 600, cursor: currentIndex === filtered.length - 1 ? 'default' : 'pointer',
              }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // GLOBAL STYLES - P1 FIX: Added focus styles
  // ============================================================================
  const globalStyles = `
    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.5); opacity: 0.2; } 100% { transform: scale(1); opacity: 0.6; } }
    @keyframes loadingSlide { 0% { transform: translateX(-100%); } 50% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    body { overscroll-behavior: none; margin: 0; padding: 0; overflow: hidden; }
    html { overflow: hidden; }
    .mapboxgl-canvas { outline: none; }
    .mapboxgl-ctrl-bottom-left, .mapboxgl-ctrl-bottom-right { display: none; }
    *::-webkit-scrollbar { width: 6px; }
    *::-webkit-scrollbar-track { background: transparent; }
    *::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
    *::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
    
    /* P1 FIX: Focus states for accessibility */
    *:focus-visible {
      outline: 2px solid #ab67f7;
      outline-offset: 2px;
    }
    
    button:focus-visible,
    a:focus-visible {
      box-shadow: 0 0 0 4px rgba(171,103,247,0.2);
    }
    
    /* P1 FIX: Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }
  `

// ============================================================================
// END OF PART 2 - CONTINUE TO PART 3
// ============================================================================
// ============================================================================
// SOUNDED OUT - PAGE.TSX - PART 3 OF 3
// ============================================================================
// This is lines ~1700 to end
// Copy this AFTER Part 2
// This section contains the return statements and helper components
// ============================================================================

  // ============================================================================
  // RENDER - DESKTOP/TABLET LAYOUT
  // ============================================================================
  if (deviceType === 'desktop' || deviceType === 'tablet') {
    return (
      <div style={{ height: '100vh', width: '100vw', background: '#0a0a0b', display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <DesktopSidebar />
        
        {/* Map - Full remaining width */}
        <div 
          style={{ flex: 1, position: 'relative', minWidth: 0 }}
          onClick={() => {
            if (viewMode === 'preview' || viewMode === 'detail') {
              setViewMode('map')
              setSheetVisible(false)
              highlightMarker(null)
            }
          }}
        >
          <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />
          
          {/* P1 FIX: Map Controls with reset button and 48px touch targets */}
          <div style={{ position: 'absolute', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10 }}>
            {/* Reset View */}
            <button
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                map.current?.flyTo({ center: [-1.6131, 54.9695], zoom: 13, duration: 800 })
              }}
              title="Reset view"
              aria-label="Reset view to Newcastle"
              style={{
                width: '48px',
                height: '48px',
                minWidth: '48px',
                minHeight: '48px',
                borderRadius: '12px',
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#999',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              ⌖
            </button>
            {/* Location */}
            <button
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleUserLocation() }}
              title={showUserLocation ? 'Hide my location' : 'Show my location'}
              aria-label={showUserLocation ? 'Hide my location' : 'Show my location'}
              style={{
                width: '48px',
                height: '48px',
                minWidth: '48px',
                minHeight: '48px',
                borderRadius: '12px',
                background: showUserLocation ? 'rgba(171,103,247,0.2)' : 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(10px)',
                border: showUserLocation ? '2px solid #ab67f7' : '1px solid rgba(255,255,255,0.1)',
                color: showUserLocation ? '#ab67f7' : '#999',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4"/>
                <line x1="12" y1="2" x2="12" y2="6"/>
                <line x1="12" y1="18" x2="12" y2="22"/>
                <line x1="2" y1="12" x2="6" y2="12"/>
                <line x1="18" y1="12" x2="22" y2="12"/>
              </svg>
            </button>
          </div>
          
          {/* Loading */}
          {loading && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#999' }}>
              Loading events...
            </div>
          )}
        </div>
        
        {/* Detail Panel */}
        {(viewMode === 'preview' || viewMode === 'detail') && current && <DesktopDetailPanel />}
        
        {/* Cluster Selection Modal */}
        {viewMode === 'cluster' && clusterEvents.length > 0 && (
          <div 
            onClick={() => { setViewMode('map'); setClusterEvents([]) }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div onClick={(e: React.MouseEvent) => e.stopPropagation()} style={{
              background: '#1a1a1f', borderRadius: '16px', padding: '20px', width: '90%', maxWidth: '400px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ab67f7' }}>{clusterEvents.length} events here</h3>
                <button onClick={() => { setViewMode('map'); setClusterEvents([]) }} style={{
                  width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', borderRadius: '50%', border: 'none',
                  background: 'rgba(255,255,255,0.1)', color: '#999', fontSize: '16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                {clusterEvents.map((e: Event) => (
                  <div key={e.id} onClick={() => selectEvent(e)} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                    background: '#141416', borderRadius: '10px', cursor: 'pointer',
                  }}>
                    <span style={{ fontSize: '13px', color: '#ab67f7', fontWeight: 700, minWidth: '48px' }}>{formatTime(e.start_time)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{e.title}</div>
                      <div style={{ fontSize: '11px', color: '#22d3ee' }}>{getGenres(e.genres)}</div>
                    </div>
                    {isFree(e.price_min, e.price_max) ? (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.15)', padding: '3px 6px', borderRadius: '4px' }}>FREE</span>
                    ) : formatPrice(e.price_min, e.price_max) && (
                      <span style={{ fontSize: '11px', color: '#999' }}>{formatPrice(e.price_min, e.price_max)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Desktop Menu Dropdown */}
        {showMenu && (
          <>
            <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
            <div style={{
              position: 'fixed', top: '70px', left: deviceType === 'desktop' ? '290px' : '240px', 
              background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', 
              padding: '12px', minWidth: '220px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100,
            }}>
              <NavigationLinks onClose={() => setShowMenu(false)} user={user} onSignOut={handleSignOut} />
            </div>
          </>
        )}
        
        {/* Admin Menu */}
        {showAdminMenu && (
          <div onClick={() => setShowAdminMenu(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}>
            <div onClick={(e: React.MouseEvent) => e.stopPropagation()} style={{
              background: '#1a1a1f', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '320px',
              border: '1px solid rgba(171,103,247,0.3)',
            }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '32px' }}>🔐</span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginTop: '12px' }}>Admin Access</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a href="/admin/analytics" style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '16px',
                  background: 'linear-gradient(135deg, rgba(171,103,247,0.2), rgba(171,103,247,0.1))',
                  border: '1px solid rgba(171,103,247,0.3)', borderRadius: '14px',
                  color: 'white', textDecoration: 'none',
                }}>
                  <span style={{ width: '44px', height: '44px', background: '#ab67f7', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📊</span>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: 700 }}>Analytics</p>
                    <p style={{ fontSize: '12px', color: '#999' }}>Sessions, conversions, metrics</p>
                  </div>
                </a>
                <a href="/admin" style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '16px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '14px', color: 'white', textDecoration: 'none',
                }}>
                  <span style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>⚙️</span>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: 700 }}>Content Admin</p>
                    <p style={{ fontSize: '12px', color: '#999' }}>Events, venues, claims</p>
                  </div>
                </a>
              </div>
              <button onClick={() => setShowAdminMenu(false)} style={{
                width: '100%', marginTop: '16px', padding: '12px', background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                color: '#777', fontSize: '14px', cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </div>
        )}
        
        {/* Claim Modal */}
        {showClaimModal && current && (
          <ClaimModal 
            current={current}
            claimType={claimType}
            claimForm={claimForm}
            setClaimForm={setClaimForm}
            claimSubmitting={claimSubmitting}
            setClaimSubmitting={setClaimSubmitting}
            claimSubmitted={claimSubmitted}
            setClaimSubmitted={setClaimSubmitted}
            claimError={claimError}
            setClaimError={setClaimError}
            onClose={() => {
              setShowClaimModal(false)
              setClaimSubmitted(false)
              setClaimError('')
              setClaimForm({ name: '', email: '', role: 'owner', proofUrl: '' })
            }}
            formatTime={formatTime}
            getDateLabel={getDateLabel}
          />
        )}
        
        {/* P1 FIX: Onboarding Modal */}
        {showOnboarding && <OnboardingModal onComplete={completeOnboarding} />}

        {/* Login Prompt Modal */}
<LoginPromptModal
  isOpen={showLoginModal}
  onClose={() => setShowLoginModal(false)}
  action="save"
/>
        
        <style jsx global>{globalStyles}</style>
      </div>
    )
  }

  // ============================================================================
  // RENDER - MOBILE LAYOUT (Pull-up sheet pattern)
  // ============================================================================
  return (
    <div style={{ height: '100vh', width: '100vw', background: '#0a0a0b', overflow: 'hidden' }}>
      <main style={{ height: '100%', width: '100%', position: 'relative' }}>
        
        {/* Map - Full Screen */}
        <div ref={mapContainer} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />

        {/* Intro Loading Screen */}
        {showIntro && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 100, background: '#0a0a0b',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            opacity: introPhase === 'done' ? 0 : 1, transition: 'opacity 500ms ease-out',
            pointerEvents: introPhase === 'done' ? 'none' : 'auto',
          }}>
            <div style={{
              transform: introPhase === 'zoom' ? 'scale(0.8) translateY(-20px)' : 'scale(1)',
              opacity: introPhase === 'zoom' ? 0.6 : 1,
              transition: 'all 800ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
              <img src="/logo.svg" alt="Sounded Out" style={{ 
                height: '40px', width: 'auto',
                filter: 'drop-shadow(0 4px 20px rgba(171, 103, 247, 0.3))',
              }} />
            </div>
            <div style={{ marginTop: '24px', opacity: introPhase === 'logo' ? 1 : 0, transition: 'opacity 300ms ease' }}>
              <div style={{ width: '40px', height: '3px', background: 'rgba(171, 103, 247, 0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: '50%', height: '100%', background: '#ab67f7', borderRadius: '2px', animation: 'loadingSlide 1s ease-in-out infinite' }} />
              </div>
            </div>
            <p style={{
              marginTop: '16px', fontSize: '13px', color: '#777', letterSpacing: '2px', textTransform: 'uppercase',
              opacity: introPhase === 'zoom' ? 1 : 0, transform: introPhase === 'zoom' ? 'translateY(0)' : 'translateY(10px)',
              transition: 'all 600ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}>Newcastle</p>
          </div>
        )}

        {/* Welcome Overlay */}
        {showWelcome && !showIntro && (
          <div 
            onClick={() => { setShowWelcome(false); localStorage.setItem('so_welcome_seen', 'true') }}
            style={{
              position: 'absolute', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.85)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '40px 30px', animation: 'fadeIn 300ms ease-out',
            }}
          >
            <img src="/logo.svg" alt="Sounded Out" style={{ height: '44px', marginBottom: '24px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 700, textAlign: 'center', marginBottom: '12px', lineHeight: 1.3 }}>
              Find the best nights out<br />near you — instantly
            </h2>
            <p style={{ fontSize: '14px', color: '#999', textAlign: 'center', marginBottom: '32px' }}>
              Tap events on the map or swipe up to browse
            </p>
            <button
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowWelcome(false); localStorage.setItem('so_welcome_seen', 'true') }}
              style={{
                padding: '14px 32px', background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, color: 'white', cursor: 'pointer',
              }}
            >Let&apos;s Go</button>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '16px' }}>Tap anywhere to dismiss</p>
          </div>
        )}

        {/* Click overlay for closing sheets */}
        {(viewMode === 'preview' || viewMode === 'cluster') && (
          <div onClick={closeSheet} style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'transparent', cursor: 'pointer' }} />
        )}
        
        {/* Menu overlay */}
        {showMenu && <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 19, background: 'transparent' }} />}

        {/* Floating Header Elements */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
          padding: '12px 16px', paddingTop: 'max(12px, env(safe-area-inset-top))',
          pointerEvents: 'none',
        }}>
          {/* Top row: Search bar + Profile */}
          <div style={{ display: 'flex', gap: '10px', pointerEvents: 'auto', marginBottom: '10px' }}>
            {/* Search/Filter bar */}
            <div 
              onClick={() => { openSheet('list'); trackListOpen(filtered.length) }}
              style={{
                flex: 1, padding: '12px 16px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px', minHeight: '48px',
              }}
            >
              <span style={{ fontSize: '14px', opacity: 0.6 }}>🔍</span>
              <span style={{ fontSize: '14px', color: '#999' }}>
                {loading ? 'Loading...' : `${filtered.length} events ${filterLabel}`}
              </span>
            </div>
            
            {/* P1 FIX: Profile button with 48px touch target */}
            <button
              onClick={() => { setShowMenu(true); trackMenuOpen() }}
              style={{
                width: '48px', height: '48px', minWidth: '48px', minHeight: '48px', borderRadius: '14px',
                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
          
          {/* P1 FIX: Date filter chips with 44px touch targets */}
          <div style={{ display: 'flex', gap: '8px', pointerEvents: 'auto', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>
            {(['today', 'tomorrow', 'weekend'] as const).map((f: 'today' | 'tomorrow' | 'weekend') => {
              const isSelected: boolean = dateFilter === f
              return (
                <button 
                  key={f}
                  onClick={() => { 
                    if (dateFilter !== f) { setDateFilter(f); setCurrentIndex(0); trackDateFilter(f, filtered.length) }
                  }}
                  aria-pressed={isSelected}
                  style={{
                    padding: '10px 16px', minHeight: '44px', borderRadius: '22px', border: 'none',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    background: isSelected ? '#ab67f7' : 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                    color: isSelected ? 'white' : '#999',
                    boxShadow: isSelected ? '0 4px 12px rgba(171,103,247,0.3)' : 'none',
                  }}
                >
                  {f === 'today' ? 'Today' : f === 'tomorrow' ? 'Tomorrow' : 'Weekend'}
                </button>
              )
            })}
            <button 
              onClick={() => setShowDatePicker(!showDatePicker)}
              style={{
                padding: '10px 14px', minHeight: '44px', borderRadius: '22px', border: 'none',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', 
                WebkitBackdropFilter: 'blur(10px)', color: '#ab67f7',
              }}
            >
              {showDatePicker ? '✕' : 'More'}
            </button>
          </div>
          
          {/* Date picker dropdown */}
          {showDatePicker && (
            <div style={{ 
              marginTop: '8px', padding: '14px', background: 'rgba(20,20,22,0.95)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              borderRadius: '14px', pointerEvents: 'auto',
              animation: 'slideDown 200ms ease-out',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {getNext7Days().map((d: { str: string; name: string; num: number }) => (
                  <button 
                    key={d.str}
                    onClick={() => { setDateFilter(d.str); setShowDatePicker(false); setCurrentIndex(0); trackDateFilter(d.str, filtered.length) }}
                    style={{
                      width: '48px', minWidth: '48px', padding: '8px 4px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      background: dateFilter === d.str ? '#ab67f7' : 'transparent',
                      color: dateFilter === d.str ? 'white' : '#999',
                    }}
                  >
                    <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>{d.name}</span>
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>{d.num}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* P1 FIX: Genre chips with better touch targets */}
          {availableGenres.length > 0 && !showDatePicker && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px', overflowX: 'auto', pointerEvents: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>
              {availableGenres.map((genre: string) => {
                const isSelected: boolean = activeGenre === genre
                return (
                  <button
                    key={genre}
                    onClick={() => { setActiveGenre(isSelected ? null : genre); trackGenreFilter(genre, filtered.length) }}
                    aria-pressed={isSelected}
                    style={{
                      padding: '10px 16px',
                      minHeight: '44px',
                      borderRadius: '22px',
                      border: isSelected ? '2px solid #ab67f7' : '1px solid rgba(255,255,255,0.15)',
                      fontSize: '12px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      background: isSelected ? '#ab67f7' : 'transparent',
                      color: isSelected ? 'white' : '#aaa',
                      textTransform: 'capitalize',
                      transition: 'all 150ms ease',
                    }}
                  >
                    {genre}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* P1 FIX: Floating Map Controls with 48px touch targets */}
        <div style={{ position: 'absolute', bottom: '180px', right: '16px', zIndex: 15, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Reset View */}
          <button
            onClick={() => map.current?.flyTo({ center: [-1.6131, 54.9695], zoom: 13, duration: 800 })}
            title="Reset view"
            aria-label="Reset view to Newcastle"
            style={{
              width: '48px', height: '48px', minWidth: '48px', minHeight: '48px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.15)', color: '#999',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            }}
          >
            ⌖
          </button>
          {/* Location */}
          <button
            onClick={toggleUserLocation}
            title={showUserLocation ? 'Hide my location' : 'Show my location'}
            aria-label={showUserLocation ? 'Hide my location' : 'Show my location'}
            style={{
              width: '48px', height: '48px', minWidth: '48px', minHeight: '48px', borderRadius: '50%',
              background: showUserLocation ? 'rgba(171,103,247,0.2)' : 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              border: showUserLocation ? '2px solid #ab67f7' : '1px solid rgba(255,255,255,0.15)',
              color: showUserLocation ? '#ab67f7' : '#999',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="4"/>
              <line x1="12" y1="2" x2="12" y2="6"/>
              <line x1="12" y1="18" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="6" y2="12"/>
              <line x1="18" y1="12" x2="22" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Pull-up Sheet - Peek state shows event count */}
        {viewMode === 'map' && (
          <div 
            onClick={() => { openSheet('list'); trackListOpen(filtered.length) }}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 15,
              background: '#141416', borderRadius: '20px 20px 0 0',
              padding: '16px 20px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
              cursor: 'pointer', boxShadow: '0 -4px 20px rgba(0,0,0,0.4)', minHeight: '72px',
            }}
          >
            <div style={{ width: '40px', height: '4px', background: '#444', borderRadius: '2px', margin: '0 auto 12px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px' }}>
                <span style={{ color: '#ab67f7', fontWeight: 700 }}>{filtered.length}</span>
                {' '}{filtered.length === 1 ? 'event' : 'events'} {filterLabel}
              </span>
              <span style={{ color: '#ab67f7', fontSize: '18px' }}>↑</span>
            </div>
          </div>
        )}

        {/* List View Sheet */}
        {viewMode === 'list' && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: '#141416', borderRadius: '24px 24px 0 0', zIndex: 30,
            display: 'flex', flexDirection: 'column', maxHeight: '75vh',
            ...getSheetStyle(sheetVisible), ...getDismissTransform(),
          }}>
            {/* Handle area */}
            <div 
              onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
              style={{ padding: '12px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, cursor: 'grab', touchAction: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ width: '44px' }} />
                <div onClick={closeSheet} style={{ width: '48px', height: '5px', background: dismissProgress > 0.5 ? '#ab67f7' : '#777', borderRadius: '3px', cursor: 'pointer' }} />
                <button onClick={closeSheet} style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#999', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ab67f7', textTransform: 'uppercase' }}>{visibleDayLabel || Object.keys(grouped)[0] || filterLabel}</h3>
                <span style={{ fontSize: '12px', color: '#666' }}>{filtered.length} events</span>
              </div>
            </div>
            
            {/* Scrollable list */}
            <div ref={listScrollRef} onScroll={handleListScroll} style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 30px', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
              {Object.entries(grouped).map(([label, evs]: [string, Event[]], gi: number) => (
                <div key={label} ref={(el) => { if (el) daySectionRefs.current.set(label, el) }} style={{ marginTop: gi > 0 ? '24px' : '0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: gi === 0 ? 'transparent' : '#666', textTransform: 'uppercase', marginBottom: '12px', paddingBottom: gi > 0 ? '8px' : '0', borderBottom: gi > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>{label}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {evs.map((e: Event) => (
                      <div key={e.id} onClick={() => selectEvent(e)} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', minHeight: '72px', background: '#1e1e24', borderRadius: '14px', cursor: 'pointer' }}>
                        <span style={{ fontSize: '13px', color: '#ab67f7', fontWeight: 700, minWidth: '48px', paddingTop: '2px' }}>{formatTime(e.start_time)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            {e.so_pick && <img src="/so-icon.png" alt="Curated" style={{ height: '14px', width: 'auto', flexShrink: 0, opacity: 0.9 }} />}
                            <span style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>{e.venue?.name}</div>
                          {(e.genres || e.vibe) && <div style={{ fontSize: '11px', color: '#22d3ee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.genres?.split(',').slice(0, 2).map((g: string) => g.trim()).join(' · ') || e.vibe}</div>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          {e.sold_out && <span style={{ fontSize: '10px', fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,0.15)', padding: '3px 6px', borderRadius: '4px' }}>SOLD OUT</span>}
                          {isFree(e.price_min, e.price_max) ? <span style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.15)', padding: '4px 8px', borderRadius: '6px' }}>FREE</span> : formatPrice(e.price_min, e.price_max) && <span style={{ fontSize: '12px', color: '#999', fontWeight: 600 }}>{formatPrice(e.price_min, e.price_max)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <EmptyStateNoEvents 
                  filterLabel={filterLabel} 
                  onReset={() => { setDateFilter('today'); setActiveGenre(null); setShowFreeOnly(false) }} 
                />
              )}
            </div>
          </div>
        )}

        {/* Cluster Selection Sheet */}
        {viewMode === 'cluster' && (
          <div onClick={(e: React.MouseEvent) => e.stopPropagation()} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, background: '#141416', borderRadius: '24px 24px 0 0',
            padding: '12px 20px 40px', paddingBottom: 'max(40px, env(safe-area-inset-bottom))', zIndex: 30,
            ...getSheetStyle(sheetVisible), ...getDismissTransform(),
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ width: '44px' }} />
              <div onClick={closeSheet} style={{ width: '48px', height: '5px', background: dismissProgress > 0.5 ? '#ab67f7' : '#777', borderRadius: '3px', cursor: 'pointer' }} />
              <button onClick={closeSheet} style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#999', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ab67f7', marginBottom: '14px' }}>{clusterEvents.length} events here</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '50vh', overflowY: 'auto' }}>
              {clusterEvents.map((e: Event) => (
                <div key={e.id} onClick={() => selectEvent(e)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', minHeight: '64px', background: '#1e1e24', borderRadius: '14px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '13px', color: '#ab67f7', fontWeight: 700, minWidth: '48px' }}>{formatTime(e.start_time)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>{e.title}</div>
                    <div style={{ fontSize: '12px', color: '#22d3ee' }}>{getGenres(e.genres)}</div>
                  </div>
                  {isFree(e.price_min, e.price_max) ? <span style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.15)', padding: '4px 8px', borderRadius: '6px' }}>FREE</span> : formatPrice(e.price_min, e.price_max) && <span style={{ fontSize: '12px', color: '#999' }}>{formatPrice(e.price_min, e.price_max)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview Card Sheet */}
        {viewMode === 'preview' && current && (
          <div
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, background: '#141416', borderRadius: '24px 24px 0 0',
              padding: '12px 20px 40px', paddingBottom: 'max(40px, env(safe-area-inset-bottom))', zIndex: 30,
              minHeight: '320px', maxHeight: '380px',
              ...noSelectStyle, ...getSheetStyle(sheetVisible),
              ...(dragDirection === 'horizontal' ? getCardTransform() : getDismissTransform()),
            }}
          >
            {/* Peek indicators */}
            {showPrevPeek && prevEvent && <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(171,103,247,0.9)', borderRadius: '4px', padding: '4px 8px', opacity: peekProgress * 0.9, fontSize: '11px', fontWeight: 600, color: 'white' }}>← {prevEvent.title.slice(0, 12)}...</div>}
            {showNextPeek && nextEvent && <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(171,103,247,0.9)', borderRadius: '4px', padding: '4px 8px', opacity: peekProgress * 0.9, fontSize: '11px', fontWeight: 600, color: 'white' }}>{nextEvent.title.slice(0, 12)}... →</div>}

            {/* Handle */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 0' }}>
              <div style={{ width: '44px' }} />
              <div onClick={closeSheet} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <div style={{ width: '48px', height: '5px', background: dismissProgress > 0.8 ? '#ab67f7' : '#777', borderRadius: '3px' }} />
                <span style={{ fontSize: '10px', color: dismissProgress > 0.8 ? '#ab67f7' : '#666' }}>{dismissProgress > 0.8 ? 'Release to close' : 'Pull down to close'}</span>
              </div>
              <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); closeSheet() }} style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#999', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '14px', marginTop: '8px' }}>
              {filtered.slice(0, 8).map((_: Event, i: number) => <div key={i} style={{ width: i === currentIndex ? '20px' : '6px', height: '6px', borderRadius: '3px', background: i === currentIndex ? '#ab67f7' : 'rgba(255,255,255,0.15)' }} />)}
              {filtered.length > 8 && <span style={{ fontSize: '10px', color: '#555' }}>+{filtered.length - 8}</span>}
            </div>

            {/* Content */}
            <div style={{ display: 'flex', gap: '14px', ...noSelectStyle }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 700, marginBottom: '6px' }}>{formatTime(current.start_time)} · {getDateLabel(current.start_time)}</p>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                  {current.so_pick && <img src="/so-icon.png" alt="Curated" style={{ height: '18px', width: 'auto', flexShrink: 0, marginTop: '3px', opacity: 0.9 }} />}
                  <h3 style={{ fontSize: '20px', fontWeight: 800, lineHeight: 1.2 }}>{current.title}</h3>
                </div>
                <p style={{ fontSize: '14px', color: '#999', marginBottom: '10px' }}>{current.venue?.name}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {current.sold_out && <span style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#777' }}>SOLD OUT</span>}
                  {isFree(current.price_min, current.price_max) && <span style={{ padding: '5px 10px', background: 'rgba(34,197,94,0.15)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#22c55e' }}>FREE</span>}
                  {formatPrice(current.price_min, current.price_max) && <span style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>{formatPrice(current.price_min, current.price_max)}</span>}
                  {getGenres(current.genres) && <span style={{ padding: '5px 10px', background: 'rgba(171,103,247,0.12)', borderRadius: '8px', fontSize: '12px', color: '#ab67f7' }}>{getGenres(current.genres)}</span>}
                </div>
              </div>
              {/* P1 FIX: Use EventThumbnail with genre placeholder */}
              <EventThumbnail imageUrl={current.image_url} genres={current.genres} size={75} />
            </div>

            {/* Action buttons - P1 FIX: Added save button */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => setViewMode('detail')} style={{ flex: 1, padding: '14px', minHeight: '52px', background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700, color: 'white', cursor: 'pointer' }}>VIEW DETAILS</button>
              <SaveButton eventId={current.id} saved={isEventSaved(current.id)} onToggle={toggleSaveEvent} size="large" />
              <button
                onClick={async (e: React.MouseEvent) => {
                  e.stopPropagation()
                  const shareUrl = `${window.location.origin}/event/${current.id}`
                  trackShareClick(current.id, current.title, 'preview_sheet')
                  try { if (navigator.share) { await navigator.share({ title: current.title, text: `${current.title} at ${current.venue?.name}`, url: shareUrl }) } else { await navigator.clipboard.writeText(shareUrl); alert('Link copied!') } } catch (err) { console.log('Share failed:', err) }
                }}
                style={{ width: '52px', minWidth: '52px', padding: '14px', minHeight: '52px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '14px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >📤</button>
            </div>

            {/* Navigation - P1 FIX: 44px buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '14px' }}>
              <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate('prev') }} disabled={currentIndex === 0} style={{ minHeight: '44px', minWidth: '44px', background: currentIndex === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(171,103,247,0.2)', border: currentIndex === 0 ? 'none' : '1px solid rgba(171,103,247,0.3)', borderRadius: '12px', padding: '12px 18px', color: currentIndex === 0 ? '#444' : '#ab67f7', fontSize: '14px', fontWeight: 600, cursor: currentIndex === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', ...noSelectStyle }}><span style={{ fontSize: '18px' }}>←</span> Prev</button>
              <span style={{ fontSize: '13px', color: '#666' }}>{currentIndex + 1} / {filtered.length}</span>
              <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate('next') }} disabled={currentIndex === filtered.length - 1} style={{ minHeight: '44px', minWidth: '44px', background: currentIndex === filtered.length - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(171,103,247,0.2)', border: currentIndex === filtered.length - 1 ? 'none' : '1px solid rgba(171,103,247,0.3)', borderRadius: '12px', padding: '12px 18px', color: currentIndex === filtered.length - 1 ? '#444' : '#ab67f7', fontSize: '14px', fontWeight: 600, cursor: currentIndex === filtered.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', ...noSelectStyle }}>Next <span style={{ fontSize: '18px' }}>→</span></button>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {viewMode === 'detail' && current && (
          <div onClick={() => setViewMode('preview')} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
            <MobileDetailSheet 
  current={current}
  currentIndex={currentIndex}
  filtered={filtered}
  showAllGenres={showAllGenres}
  setShowAllGenres={setShowAllGenres}
  showDescription={showDescription}
  setShowDescription={setShowDescription}
  setClaimType={setClaimType}
  setShowClaimModal={setShowClaimModal}
  setShowLoginModal={setShowLoginModal}
  navigate={navigate}
  formatTime={formatTime}
  formatPrice={formatPrice}
  getDateLabel={getDateLabel}
  getGenres={getGenres}
  getTicketUrl={getTicketUrl}
  isFree={isFree}
  mapsUrl={mapsUrl}
  noSelectStyle={noSelectStyle}
  onTouchStart={onTouchStart}
  onTouchMove={onTouchMove}
  onTouchEnd={onTouchEnd}
  dragDirection={dragDirection}
  getCardTransform={getCardTransform}
  getDismissTransform={getDismissTransform}
  dismissProgress={dismissProgress}
  getGenreStyle={getGenreStyle}
  isEventSaved={isEventSaved}
  toggleSaveEvent={toggleSaveEvent}
  user={user}
/>
          </div>
        )}

        {/* Menu Slide-over */}
        {showMenu && (
          <>
            <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300 }} />
            <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '280px', maxWidth: '85vw', background: '#0a0a0b', borderLeft: '1px solid rgba(255,255,255,0.08)', padding: '24px', paddingTop: 'max(24px, env(safe-area-inset-top))', zIndex: 301, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <button onClick={() => setShowMenu(false)} style={{ position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', right: '16px', width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#999', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              <img src="/logo.svg" alt="Sounded Out" onClick={handleLogoTap} style={{ height: '24px', width: 'auto', marginBottom: '24px', marginTop: '8px', cursor: 'pointer' }} />
              
              <NavigationLinks onClose={() => setShowMenu(false)} user={user} onSignOut={handleSignOut} />
            </div>
          </>
        )}

        {/* Admin Menu */}
        {showAdminMenu && (
          <div onClick={() => setShowAdminMenu(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div onClick={(e: React.MouseEvent) => e.stopPropagation()} style={{ background: '#1a1a1f', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '320px', border: '1px solid rgba(171,103,247,0.3)' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}><span style={{ fontSize: '32px' }}>🔐</span><h3 style={{ fontSize: '18px', fontWeight: 700, marginTop: '12px' }}>Admin Access</h3></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a href="/admin/analytics" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: 'linear-gradient(135deg, rgba(171,103,247,0.2), rgba(171,103,247,0.1))', border: '1px solid rgba(171,103,247,0.3)', borderRadius: '14px', color: 'white', textDecoration: 'none' }}><span style={{ width: '44px', height: '44px', background: '#ab67f7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📊</span><div><p style={{ fontSize: '15px', fontWeight: 700 }}>Analytics</p><p style={{ fontSize: '12px', color: '#999' }}>Sessions, conversions</p></div></a>
                <a href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: 'white', textDecoration: 'none' }}><span style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>⚙️</span><div><p style={{ fontSize: '15px', fontWeight: 700 }}>Content Admin</p><p style={{ fontSize: '12px', color: '#999' }}>Events, venues</p></div></a>
              </div>
              <button onClick={() => setShowAdminMenu(false)} style={{ width: '100%', marginTop: '16px', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#777', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Claim Modal */}
        {showClaimModal && current && (
          <ClaimModal 
            current={current}
            claimType={claimType}
            claimForm={claimForm}
            setClaimForm={setClaimForm}
            claimSubmitting={claimSubmitting}
            setClaimSubmitting={setClaimSubmitting}
            claimSubmitted={claimSubmitted}
            setClaimSubmitted={setClaimSubmitted}
            claimError={claimError}
            setClaimError={setClaimError}
            onClose={() => { setShowClaimModal(false); setClaimSubmitted(false); setClaimError(''); setClaimForm({ name: '', email: '', role: 'owner', proofUrl: '' }) }}
            formatTime={formatTime}
            getDateLabel={getDateLabel}
          />
        )}

        {/* P1 FIX: Onboarding Modal */}
        {showOnboarding && <OnboardingModal onComplete={completeOnboarding} />}

        {/* Login Prompt Modal */}
<LoginPromptModal
  isOpen={showLoginModal}
  onClose={() => setShowLoginModal(false)}
  action="save"
/>

        <style jsx global>{globalStyles}</style>
      </main>
    </div>
  )
}

// ============================================================================
// MOBILE DETAIL SHEET COMPONENT - P1 FIXES APPLIED
// ============================================================================
function MobileDetailSheet({
  current, currentIndex, filtered, showAllGenres, setShowAllGenres, showDescription, setShowDescription,
  setClaimType, setShowClaimModal, setShowLoginModal, navigate, formatTime, formatPrice, getDateLabel, getGenres, getTicketUrl,
  isFree, mapsUrl, noSelectStyle, onTouchStart, onTouchMove, onTouchEnd, dragDirection, getCardTransform,
  getDismissTransform, dismissProgress, getGenreStyle, isEventSaved, toggleSaveEvent, user,
}: any) {
  return (
    <div
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        width: '100%', maxHeight: '90vh', background: '#141416', borderRadius: '24px 24px 0 0',
        padding: '12px 20px 36px', paddingBottom: 'max(36px, env(safe-area-inset-bottom))',
        overflowY: 'auto', overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch', ...noSelectStyle,
        ...(dragDirection === 'horizontal' ? getCardTransform() : getDismissTransform()),
      }}
    >
      <div style={{ width: '100%', padding: '8px 0 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '48px', height: '5px', background: dismissProgress > 0.8 ? '#ab67f7' : '#777', borderRadius: '3px' }} />
        <span style={{ fontSize: '10px', color: dismissProgress > 0.8 ? '#ab67f7' : '#666' }}>{dismissProgress > 0.8 ? 'Release to close' : 'Pull down to close'}</span>
      </div>

      {/* P1 FIX: Image with genre placeholder */}
      {current.image_url ? (
        <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', marginBottom: '18px' }}>
          <img src={current.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} draggable={false} />
        </div>
      ) : (
        <div style={{ 
          width: '100%', 
          aspectRatio: '16/9', 
          background: getGenreStyle(current.genres).gradient, 
          borderRadius: '16px', 
          marginBottom: '18px', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '48px', opacity: 0.6 }}>{getGenreStyle(current.genres).emoji}</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {current.genres?.split(',')[0]?.trim() || 'Live Event'}
          </span>
        </div>
      )}

      <p style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
        {getDateLabel(current.start_time)} · {formatTime(current.start_time)}
        {current.end_time && ` – ${formatTime(current.end_time)}`}
      </p>

      <h2 style={{ fontSize: '26px', fontWeight: 800, lineHeight: 1.2, marginBottom: '6px', ...noSelectStyle }}>{current.title}</h2>

      {current.so_pick && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <img src="/so-icon.png" alt="Curated" style={{ height: '16px', width: 'auto', opacity: 0.9 }} />
          <span style={{ fontSize: '12px', color: '#999' }}>Curated by Sounded Out</span>
        </div>
      )}

      {current.is_verified && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', background: '#ab67f7', borderRadius: '50%', fontSize: '10px', color: 'white' }}>✓</span>
          <span style={{ fontSize: '12px', color: '#ab67f7', fontWeight: 600 }}>Verified</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '15px', color: '#999' }}>{current.venue?.name}</span>
        {current.venue?.instagram_url && <a href={current.venue.instagram_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '16px' }}>📸</a>}
      </div>

      {(current.no_phones || current.venue?.no_phones) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'rgba(255,200,50,0.08)', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255,200,50,0.15)' }}>
          <span style={{ fontSize: '18px' }}>📵</span>
          <span style={{ fontSize: '13px', color: '#ffc832' }}>No phones policy — enjoy the moment</span>
        </div>
      )}

      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {current.sold_out && <span style={{ padding: '8px 14px', background: 'rgba(248,113,113,0.15)', borderRadius: '10px', fontSize: '14px', fontWeight: 700, color: '#f87171' }}>SOLD OUT</span>}
          {isFree(current.price_min, current.price_max) && <span style={{ padding: '8px 14px', background: 'rgba(34,197,94,0.15)', borderRadius: '10px', fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>FREE</span>}
          {current.genres?.split(',').slice(0, showAllGenres ? undefined : 4).map((g: string, i: number) => (
            <span key={i} style={{ padding: '8px 14px', background: 'rgba(171,103,247,0.12)', borderRadius: '10px', fontSize: '14px', color: '#ab67f7' }}>{g.trim()}</span>
          ))}
          {current.genres && current.genres.split(',').length > 4 && !showAllGenres && (
            <button onClick={() => setShowAllGenres(true)} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '14px', color: '#999', border: 'none', cursor: 'pointer' }}>+{current.genres.split(',').length - 4} more</button>
          )}
          {current.vibe && <span style={{ padding: '8px 14px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '10px', fontSize: '14px', color: '#38bdf8', fontStyle: 'italic' }}>{current.vibe}</span>}
        </div>
      </div>

      {!isFree(current.price_min, current.price_max) && formatPrice(current.price_min, current.price_max) && (
        <p style={{ fontSize: '22px', fontWeight: 700, marginBottom: '16px' }}>{formatPrice(current.price_min, current.price_max)}</p>
      )}

      {current.description && (
        <div style={{ marginBottom: '16px' }}>
          <button onClick={() => setShowDescription(!showDescription)} style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#999', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>More Info</span>
            <span style={{ transform: showDescription ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}>▼</span>
          </button>
          {showDescription && (
            <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '0 0 12px 12px', marginTop: '-1px', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: '14px', color: '#999', lineHeight: 1.6 }}>{current.description}</p>
            </div>
          )}
        </div>
      )}

    <EventActions
  event={{
    id: current.id,
    title: current.title,
    start_time: current.start_time,
    event_url: current.event_url,
    sold_out: current.sold_out,
    price_min: current.price_min,
    price_max: current.price_max,
    venue: current.venue,
  }}
  isSaved={isEventSaved(current.id)}
  isLoggedIn={!!user}
  onSave={toggleSaveEvent}
  onShowLoginModal={() => setShowLoginModal(true)}
  onClaim={() => { setClaimType('event'); setShowClaimModal(true) }}
  formatPrice={formatPrice}
  getDateLabel={getDateLabel}
/>

      {/* P1 FIX: 44px navigation buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate('prev') }} disabled={currentIndex === 0} style={{ minHeight: '44px', minWidth: '44px', background: currentIndex === 0 ? 'transparent' : 'rgba(171,103,247,0.2)', border: currentIndex === 0 ? 'none' : '1px solid rgba(171,103,247,0.3)', borderRadius: '10px', padding: '10px 14px', color: currentIndex === 0 ? '#444' : '#ab67f7', fontSize: '14px', fontWeight: 600, cursor: currentIndex === 0 ? 'default' : 'pointer', ...noSelectStyle }}>← Prev</button>
        <span style={{ fontSize: '13px', color: '#555' }}>{currentIndex + 1} / {filtered.length}</span>
        <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate('next') }} disabled={currentIndex === filtered.length - 1} style={{ minHeight: '44px', minWidth: '44px', background: currentIndex === filtered.length - 1 ? 'transparent' : 'rgba(171,103,247,0.2)', border: currentIndex === filtered.length - 1 ? 'none' : '1px solid rgba(171,103,247,0.3)', borderRadius: '10px', padding: '10px 14px', color: currentIndex === filtered.length - 1 ? '#444' : '#ab67f7', fontSize: '14px', fontWeight: 600, cursor: currentIndex === filtered.length - 1 ? 'default' : 'pointer', ...noSelectStyle }}>Next →</button>
      </div>
    </div>
  )
}

// ============================================================================
// CLAIM MODAL COMPONENT
// ============================================================================
function ClaimModal({
  current, claimType, claimForm, setClaimForm, claimSubmitting, setClaimSubmitting,
  claimSubmitted, setClaimSubmitted, claimError, setClaimError, onClose, formatTime, getDateLabel,
}: any) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={(e: React.MouseEvent) => e.stopPropagation()} style={{ width: '100%', maxWidth: '400px', background: '#1a1a1f', borderRadius: '20px', padding: '20px 24px 28px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Claim this {claimType}</h3>
          <button onClick={onClose} style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#999', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {claimSubmitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: '60px', height: '60px', background: 'rgba(34,197,94,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>✓</div>
            <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#22c55e' }}>Claim Submitted!</h4>
            <p style={{ fontSize: '14px', color: '#999', lineHeight: 1.6, marginBottom: '20px' }}>We&apos;ll review your claim within 24-48 hours. Once approved, sign in at <span style={{ color: '#ab67f7' }}>soundedout.com/portal</span> with your email to manage your listing.</p>
            <button onClick={onClose} style={{ padding: '14px 28px', minHeight: '48px', background: '#ab67f7', border: 'none', borderRadius: '12px', color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ padding: '14px', background: 'rgba(171,103,247,0.1)', borderRadius: '12px', marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', color: '#ab67f7', marginBottom: '4px', fontWeight: 600 }}>{claimType === 'event' ? current.title : current.venue?.name}</p>
              <p style={{ fontSize: '12px', color: '#999', lineHeight: 1.5 }}>Fill out the form below to claim this listing. Once approved, you&apos;ll be able to edit details and get a Verified badge.</p>
            </div>

            {claimError && <div style={{ padding: '12px', background: 'rgba(248,113,113,0.15)', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', color: '#f87171' }}>{claimError}</div>}

            <form onSubmit={async (e: React.FormEvent) => {
              e.preventDefault()
              setClaimSubmitting(true)
              setClaimError('')
              try {
                const { error } = await supabase.from('claim_requests').insert({
                  claim_type: claimType,
                  event_id: claimType === 'event' ? current.id : null,
                  venue_id: claimType === 'venue' ? current.venue?.id : null,
                  requested_by_name: claimForm.name,
                  requested_by_email: claimForm.email,
                  role: claimForm.role,
                  proof_url: claimForm.proofUrl || null,
                  status: 'pending',
                })
                if (error) throw error
                setClaimSubmitted(true)
                trackClaimSubmit(claimType, current.title, current.id)
              } catch (err: any) { setClaimError(err.message || 'Something went wrong. Please try again.') }
              setClaimSubmitting(false)
            }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '6px' }}>Your Name *</label>
                <input type="text" required value={claimForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClaimForm({ ...claimForm, name: e.target.value })} placeholder="John Smith" style={{ width: '100%', padding: '12px 14px', minHeight: '48px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '14px', outline: 'none' }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '6px' }}>Your Email *</label>
                <input type="email" required value={claimForm.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClaimForm({ ...claimForm, email: e.target.value })} placeholder="you@email.com" style={{ width: '100%', padding: '12px 14px', minHeight: '48px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '14px', outline: 'none' }} />
                <p style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>You&apos;ll use this email to sign in and manage your listing</p>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '6px' }}>Your Role *</label>
                <select required value={claimForm.role} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setClaimForm({ ...claimForm, role: e.target.value })} style={{ width: '100%', padding: '12px 14px', minHeight: '48px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '14px', outline: 'none' }}>
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="promoter">Promoter</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '6px' }}>Proof Link (Instagram, website, etc.)</label>
                <input type="url" value={claimForm.proofUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClaimForm({ ...claimForm, proofUrl: e.target.value })} placeholder="https://instagram.com/yourvenue" style={{ width: '100%', padding: '12px 14px', minHeight: '48px', background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '14px', outline: 'none' }} />
              </div>
              <button type="submit" disabled={claimSubmitting} style={{ width: '100%', padding: '14px', minHeight: '52px', background: claimSubmitting ? '#666' : 'linear-gradient(135deg, #ab67f7, #d7b3ff)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '15px', fontWeight: 700, cursor: claimSubmitting ? 'not-allowed' : 'pointer' }}>{claimSubmitting ? 'Submitting...' : 'Submit Claim'}</button>
            </form>
            <p style={{ fontSize: '11px', color: '#666', textAlign: 'center', marginTop: '16px', lineHeight: 1.5 }}>We&apos;ll review your claim within 24-48 hours.</p>
          </>
        )}
      </div>
    </div>
  )
}
