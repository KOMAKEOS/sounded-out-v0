'use client'

// ============================================================================
// SOUNDED OUT ANALYTICS - SIMPLE VERSION
// Just works. Tracks everything to PostHog + Supabase.
// ============================================================================

let posthog: any = null
let initialized = false

// Get or create anonymous user ID
function getAnonId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('so_anon_id')
  if (!id) {
    id = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`
    localStorage.setItem('so_anon_id', id)
  }
  return id
}

// Get or create session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let session = sessionStorage.getItem('so_session')
  if (!session) {
    session = `ses_${Date.now()}_${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem('so_session', session)
  }
  return session
}

// Device info
function getDevice() {
  if (typeof window === 'undefined') return { type: 'unknown', browser: 'unknown', os: 'unknown' }
  const ua = navigator.userAgent
  return {
    type: /mobile|android|iphone/i.test(ua) ? 'mobile' : /tablet|ipad/i.test(ua) ? 'tablet' : 'desktop',
    browser: ua.includes('Chrome') ? 'Chrome' : ua.includes('Safari') ? 'Safari' : ua.includes('Firefox') ? 'Firefox' : 'Other',
    os: ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'Mac' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : 'Other',
  }
}

// Initialize PostHog
export async function initAnalytics() {
  if (typeof window === 'undefined' || initialized) return
  
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (key) {
    try {
      // Dynamic import of posthog
      const posthogModule = await import('posthog-js')
      const ph = posthogModule.default
      ph.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com',
        capture_pageview: true,
        autocapture: true,
      })
      posthog = ph
      console.log('[Analytics] PostHog ready')
    } catch (e) {
      console.log('[Analytics] PostHog not installed - skipping')
    }
  }
  
  initialized = true
  track('session_start', getDevice())
}

// Main track function - sends to PostHog + Supabase
export async function track(eventName: string, data: Record<string, any> = {}) {
  if (typeof window === 'undefined') return
  
  const payload = {
    ...data,
    anon_id: getAnonId(),
    session_id: getSessionId(),
    page: window.location.pathname,
    timestamp: new Date().toISOString(),
  }
  
  // PostHog
  if (posthog) {
    posthog.capture(eventName, payload)
  }
  
  // Supabase - store in your own database
  try {
    const { supabase } = await import('@/lib/supabase')
    await supabase.from('analytics_events').insert({
      event_name: eventName,
      properties: payload,
      session_id: payload.session_id,
      page_url: window.location.href,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    })
  } catch (e) {
    // Silent fail - Supabase tracking is optional
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[Track]', eventName, payload)
  }
}

// ============================================================================
// PRE-BUILT TRACKING FUNCTIONS
// ============================================================================

// Page views
export const trackPageView = (page: string) => track('page_view', { page })

// Map interactions
export const trackMapLoaded = (eventCount: number) => track('map_loaded', { event_count: eventCount })
export const trackMarkerClick = (eventId: string, eventTitle: string, venueName: string) => 
  track('marker_click', { event_id: eventId, event_title: eventTitle, venue_name: venueName })

// Event engagement
export const trackEventView = (eventId: string, eventTitle: string, venueName: string, source: string) =>
  track('event_view', { event_id: eventId, event_title: eventTitle, venue_name: venueName, source })
export const trackEventDetail = (eventId: string, eventTitle: string) =>
  track('event_detail', { event_id: eventId, event_title: eventTitle })
export const trackTicketClick = (eventId: string, eventTitle: string, url: string) =>
  track('ticket_click', { event_id: eventId, event_title: eventTitle, ticket_url: url })
export const trackDirections = (venueName: string) =>
  track('directions_click', { venue_name: venueName })
export const trackShare = (eventId: string, method: string) =>
  track('share', { event_id: eventId, method })

// Filters
export const trackDateFilter = (filter: string, resultCount: number) =>
  track('date_filter', { filter, result_count: resultCount })
export const trackGenreFilter = (genre: string, resultCount: number) =>
  track('genre_filter', { genre, result_count: resultCount })

// List view
export const trackListOpen = (eventCount: number) => track('list_open', { event_count: eventCount })
export const trackListScroll = (depth: number) => track('list_scroll', { scroll_depth: depth })

// Navigation
export const trackSwipe = (direction: string) => track('swipe', { direction })

// Location
export const trackLocationOn = () => track('location_enabled', {})
export const trackLocationOff = () => track('location_disabled', {})

// Claims
export const trackClaimStart = (type: string, name: string) => track('claim_start', { type, name })
export const trackClaimSubmit = (type: string, name: string) => track('claim_submit', { type, name })

// Contact
export const trackContactOpen = () => track('contact_open', {})
export const trackContactMethod = (method: string) => track('contact_method', { method })

// Landing page
export const trackLandingView = (page: string) => track('landing_view', { page })
export const trackCTAClick = (cta: string, location: string) => track('cta_click', { cta, location })
export const trackCarouselClick = (eventId: string, position: number) => track('carousel_click', { event_id: eventId, position })

// Menu
export const trackMenuOpen = () => track('menu_open', {})
export const trackMenuItem = (item: string) => track('menu_item', { item })

// Errors
export const trackError = (error: string, context: string) => track('error', { error, context })
