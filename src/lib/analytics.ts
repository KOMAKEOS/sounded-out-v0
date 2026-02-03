// ============================================================================
// SOUNDED OUT - ANALYTICS MODULE
// ============================================================================
// All tracking functions used across the app
// ============================================================================

// Types
interface AnalyticsEvent {
  event: string
  properties?: Record<string, unknown>
  timestamp: string
  sessionId?: string
}

// Session ID for tracking user sessions
let sessionId: string | null = null

const getSessionId = (): string => {
  if (sessionId) return sessionId
  
  if (typeof window !== 'undefined') {
    sessionId = localStorage.getItem('so_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('so_session_id', sessionId)
    }
  } else {
    sessionId = 'server'
  }
  return sessionId
}

// ============================================================================
// CORE TRACKING
// ============================================================================

export const initAnalytics = (): void => {
  if (typeof window === 'undefined') return
  
  console.log('📊 Sounded Out Analytics initialized')
  
  // Track session start
  track('session_start', {
    referrer: document.referrer,
    landing_page: window.location.pathname,
  })
}

const track = (eventName: string, properties?: Record<string, unknown>): void => {
  if (typeof window === 'undefined') return
  
  const event: AnalyticsEvent = {
    event: eventName,
    properties: {
      ...properties,
      url: window.location.href,
      path: window.location.pathname,
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      deviceType: window.innerWidth >= 1024 ? 'desktop' : window.innerWidth >= 768 ? 'tablet' : 'mobile',
    },
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
  }
  
  // Console log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊', eventName, properties || '')
  }
  
  // Store locally for debugging
  try {
    const stored = localStorage.getItem('so_analytics') || '[]'
    const events = JSON.parse(stored) as AnalyticsEvent[]
    events.push(event)
    // Keep only last 200 events
    while (events.length > 200) events.shift()
    localStorage.setItem('so_analytics', JSON.stringify(events))
  } catch {
    // Ignore storage errors
  }
  
  // TODO: Send to analytics backend
  // fetch('/api/analytics', { method: 'POST', body: JSON.stringify(event) })
}

// ============================================================================
// PAGE VIEWS
// ============================================================================

export const trackPageView = (pageName: string, properties?: Record<string, unknown>): void => {
  track('page_view', { page: pageName, ...properties })
}

// ============================================================================
// MAP INTERACTIONS
// ============================================================================

export const trackMapLoaded = (eventCount: number, venueCount?: number): void => {
  track('map_loaded', { event_count: eventCount, venue_count: venueCount })
}

export const trackMarkerClick = (
  eventId: string, 
  eventTitle: string, 
  venueName?: string
): void => {
  track('marker_click', {
    event_id: eventId,
    event_title: eventTitle,
    venue_name: venueName,
  })
}

// ============================================================================
// EVENT INTERACTIONS
// ============================================================================

export const trackEventView = (
  eventId: string,
  eventTitle: string,
  venueName?: string,
  source?: 'map_pin' | 'list' | 'search' | 'direct' | 'cluster'
): void => {
  track('event_view', {
    event_id: eventId,
    event_title: eventTitle,
    venue_name: venueName,
    source,
  })
}

export const trackTicketClick = (
  eventId: string,
  eventTitle: string,
  ticketSource?: string,
  price?: number
): void => {
  track('ticket_click', {
    event_id: eventId,
    event_title: eventTitle,
    ticket_source: ticketSource,
    price,
  })
}

export const trackDirectionsClick = (
  eventId: string,
  venueName?: string
): void => {
  track('directions_click', {
    event_id: eventId,
    venue_name: venueName,
  })
}

export const trackShareClick = (
  eventId: string,
  eventTitle: string,
  shareMethod?: string
): void => {
  track('share_click', {
    event_id: eventId,
    event_title: eventTitle,
    share_method: shareMethod,
  })
}

// Alias for trackShareClick (used in event/[id]/page.tsx)
export const trackEventShare = trackShareClick

// ============================================================================
// FILTER INTERACTIONS
// ============================================================================

export const trackDateFilter = (filter: string, resultCount: number): void => {
  track('date_filter', { filter, result_count: resultCount })
}

export const trackGenreFilter = (genre: string, resultCount: number): void => {
  track('genre_filter', { genre, result_count: resultCount })
}

export const trackListOpen = (eventCount: number): void => {
  track('list_open', { event_count: eventCount })
}

// ============================================================================
// MENU / NAVIGATION
// ============================================================================

export const trackMenuOpen = (): void => {
  track('menu_open')
}

// ============================================================================
// LOCATION
// ============================================================================

export const trackLocationEnabled = (): void => {
  track('location_enabled')
}

export const trackLocationDenied = (): void => {
  track('location_denied')
}

// ============================================================================
// CTA / CONVERSIONS
// ============================================================================

export const trackCTAClick = (ctaName: string, destination?: string): void => {
  track('cta_click', { cta_name: ctaName, destination })
}

// ============================================================================
// CLAIM FLOW
// ============================================================================

export const trackClaimStart = (
  claimType: 'venue' | 'event',
  itemName: string
): void => {
  track('claim_start', { claim_type: claimType, item_name: itemName })
}

// Alias for trackClaimStart (used in event/[id]/page.tsx)
export const trackClaimStarted = trackClaimStart

export const trackClaimSubmit = (
  claimType: 'venue' | 'event',
  itemName: string,
  itemId?: string
): void => {
  track('claim_submit', {
    claim_type: claimType,
    item_name: itemName,
    item_id: itemId,
  })
}

// ============================================================================
// SAVE / BOOKMARK
// ============================================================================

export const trackEventSave = (eventId: string, eventTitle: string): void => {
  track('event_save', { event_id: eventId, event_title: eventTitle })
}

export const trackEventUnsave = (eventId: string, eventTitle: string): void => {
  track('event_unsave', { event_id: eventId, event_title: eventTitle })
}

// ============================================================================
// AUTH
// ============================================================================

export const trackSignupStart = (source?: string): void => {
  track('signup_start', { source })
}

export const trackSignupComplete = (method?: 'email' | 'google' | 'apple'): void => {
  track('signup_complete', { method })
}

export const trackLoginStart = (source?: string): void => {
  track('login_start', { source })
}

export const trackLoginComplete = (method?: 'email' | 'google' | 'apple'): void => {
  track('login_complete', { method })
}

export const trackLogout = (): void => {
  track('logout')
}

// ============================================================================
// ERRORS
// ============================================================================

export const trackError = (
  errorType: string,
  errorMessage: string,
  context?: string
): void => {
  track('error', {
    error_type: errorType,
    error_message: errorMessage,
    context,
  })
}

// ============================================================================
// DEBUG HELPERS
// ============================================================================

export const getAnalyticsLog = (): AnalyticsEvent[] => {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem('so_analytics') || '[]'
    return JSON.parse(stored) as AnalyticsEvent[]
  } catch {
    return []
  }
}

export const clearAnalyticsLog = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('so_analytics')
  console.log('📊 Analytics log cleared')
}

export const getAnalyticsSummary = (): Record<string, number> => {
  const events = getAnalyticsLog()
  const summary: Record<string, number> = {}
  
  for (const event of events) {
    summary[event.event] = (summary[event.event] || 0) + 1
  }
  
  return summary
}
