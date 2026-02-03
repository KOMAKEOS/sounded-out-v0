// ============================================================================
// SOUNDED OUT - MAXIMUM DATA ANALYTICS LIBRARY
// Matches your existing function calls with 12 parameters
// ============================================================================

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// ============================================================================
// CORE TRACKING INFRASTRUCTURE
// ============================================================================

let sessionId: string | null = null

const generateSessionId = (): string => {
  if (typeof window === 'undefined') return `server_${Date.now()}`
  if (sessionId) return sessionId
  
  sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  return sessionId
}

const getDeviceType = (): string => {
  if (typeof window === 'undefined') return 'server'
  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

const getUserId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
  } catch {
    return null
  }
}

// Core tracking function
const track = async (eventName: string, eventData: Record<string, any> = {}): Promise<void> => {
  try {
    const userId = await getUserId()
    const currentSessionId = generateSessionId()
    
    // Store in analytics_events table
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        event_name: eventName,
        event_data: eventData,
        user_id: userId,
        session_id: currentSessionId,
        page_url: typeof window !== 'undefined' ? window.location.href : undefined,
        device_type: getDeviceType(),
        browser: typeof window !== 'undefined' ? navigator.userAgent : undefined,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Analytics tracking error:', error)
    } else {
      console.log(`📊 TRACKED: ${eventName}`, eventData)
    }
  } catch (error) {
    console.error('Analytics error:', error)
  }
}

// Specialized tracking for event interactions
const trackEventInteraction = async (
  interactionType: string,
  eventId: string,
  eventTitle: string,
  venueName: string,
  venueId: string,
  genre: string,
  genreFull: string,
  source: string,
  brandName: string,
  startTime: string,
  price: number,
  eventUrl: string,
  clickSource: string
): Promise<void> => {
  try {
    const userId = await getUserId()
    const currentSessionId = generateSessionId()
    
    // Store in event_interactions table for detailed analysis
    const { error } = await supabase
      .from('event_interactions')
      .insert({
        user_id: userId,
        session_id: currentSessionId,
        event_id: eventId,
        event_title: eventTitle,
        venue_name: venueName,
        venue_id: venueId,
        genre_primary: genre,
        genre_full: genreFull,
        brand_name: brandName,
        start_time: startTime,
        price: price,
        event_url: eventUrl,
        interaction_type: interactionType,
        source: source,
        click_source: clickSource,
        revenue_potential: interactionType === 'ticket_click' ? price : 0,
        conversion_value: interactionType === 'ticket_click' ? 'high' : 'medium',
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Event interaction tracking error:', error)
    } else {
      console.log(`🎯 EVENT INTERACTION: ${interactionType}`, {
        eventId,
        eventTitle,
        venueName,
        price,
        source: clickSource
      })
    }
  } catch (error) {
    console.error('Event interaction error:', error)
  }
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export const initAnalytics = (): void => {
  if (typeof window === 'undefined') return
  
  const currentSessionId = generateSessionId()
  
  // Track session start
  track('session_start', {
    session_id: currentSessionId,
    referrer: document.referrer,
    landing_page: window.location.pathname,
    user_agent: navigator.userAgent,
    screen_width: window.innerWidth,
    screen_height: window.innerHeight,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    device_type: getDeviceType()
  })

  // Store session data
  supabase
    .from('user_sessions')
    .insert({
      session_id: currentSessionId,
      device_type: getDeviceType(),
      browser: navigator.userAgent,
      screen_width: window.innerWidth,
      screen_height: window.innerHeight,
      started_at: new Date().toISOString()
    })
    .then(({ error }) => {
      if (error) console.error('Session tracking error:', error)
    })

  // Track visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      track('session_pause', { session_id: currentSessionId })
    } else {
      track('session_resume', { session_id: currentSessionId })
    }
  })

  // Track session end
  window.addEventListener('beforeunload', () => {
    track('session_end', { session_id: currentSessionId })
  })
}

// ============================================================================
// EVENT TRACKING WITH 12 PARAMETERS (MAXIMUM DATA)
// ============================================================================

export const trackEventView = (
  eventId: string,
  eventTitle: string,
  venueName: string,
  venueId: string,
  genre: string,
  genreFull: string,
  source: string,
  brandName: string,
  startTime: string,
  price: number,
  eventUrl: string,
  viewSource: string
): void => {
  trackEventInteraction(
    'view',
    eventId,
    eventTitle,
    venueName,
    venueId,
    genre,
    genreFull,
    source,
    brandName,
    startTime,
    price,
    eventUrl,
    viewSource
  )
}

export const trackTicketClick = (
  eventId: string,
  eventTitle: string,
  venueName: string,
  venueId: string,
  genre: string,
  genreFull: string,
  source: string,
  brandName: string,
  startTime: string,
  price: number,
  eventUrl: string,
  clickSource: string
): void => {
  trackEventInteraction(
    'ticket_click',
    eventId,
    eventTitle,
    venueName,
    venueId,
    genre,
    genreFull,
    source,
    brandName,
    startTime,
    price,
    eventUrl,
    clickSource
  )
}

// ============================================================================
// SAVE/UNSAVE FUNCTIONS
// ============================================================================

export const trackSaveEvent = (
  eventId: string,
  eventTitle: string,
  action: 'save' | 'unsave',
  venueName?: string
): void => {
  track('event_save', {
    event_id: eventId,
    event_title: eventTitle,
    action: action,
    venue_name: venueName,
    engagement_level: 'high',
    intent_signal: 'strong'
  })
}

export const trackEventSave = (
  eventId: string,
  eventTitle: string,
  venueName?: string
): void => {
  trackSaveEvent(eventId, eventTitle, 'save', venueName)
}

export const trackEventUnsave = (
  eventId: string,
  eventTitle: string,
  venueName?: string
): void => {
  trackSaveEvent(eventId, eventTitle, 'unsave', venueName)
}

// ============================================================================
// SHARE FUNCTIONS
// ============================================================================

export const trackShareClick = (
  eventId: string,
  eventTitle: string,
  shareMethod: string,
  venueName?: string
): void => {
  track('share_click', {
    event_id: eventId,
    event_title: eventTitle,
    share_method: shareMethod,
    venue_name: venueName,
    viral_potential: 'high',
    organic_growth: true
  })
}

export const trackEventShare = (
  eventId: string,
  eventTitle: string,
  shareMethod: string,
  venueName?: string
): void => {
  trackShareClick(eventId, eventTitle, shareMethod, venueName)
}

// ============================================================================
// ADDITIONAL INTERACTION TRACKING
// ============================================================================

export const trackDirectionsClick = (
  eventId: string,
  venueName: string,
  venueId?: string,
  eventTitle?: string
): void => {
  track('directions_click', {
    event_id: eventId,
    venue_name: venueName,
    venue_id: venueId,
    event_title: eventTitle,
    intent: 'navigation',
    conversion_signal: 'high'
  })
}

// ============================================================================
// FILTER & SEARCH TRACKING
// ============================================================================

export const trackDateFilter = (filter: string, resultCount: number): void => {
  track('date_filter', {
    filter: filter,
    result_count: resultCount,
    filter_type: 'temporal',
    user_intent: 'discovery'
  })
}

export const trackGenreFilter = (genre: string, resultCount: number): void => {
  track('genre_filter', {
    genre: genre,
    result_count: resultCount,
    filter_type: 'genre',
    user_intent: 'discovery',
    preference_signal: true
  })
}

export const trackSearchQuery = (query: string, resultCount: number): void => {
  track('search_query', {
    query: query,
    result_count: resultCount,
    search_type: 'text',
    user_intent: 'specific_discovery'
  })
}

// ============================================================================
// MAP INTERACTIONS
// ============================================================================

export const trackMapLoaded = (eventCount: number, bounds?: any): void => {
  track('map_loaded', {
    event_count: eventCount,
    bounds: bounds,
    map_provider: 'mapbox',
    ui_component: 'main_map'
  })

  // Also track in map_interactions table
  supabase
    .from('map_interactions')
    .insert({
      session_id: generateSessionId(),
      interaction_type: 'load',
      bounds: bounds,
      created_at: new Date().toISOString()
    })
    .catch(error => console.error('Map interaction error:', error))
}

export const trackMarkerClick = (
  eventId: string,
  eventTitle: string,
  venueName: string,
  venueId: string
): void => {
  track('marker_click', {
    event_id: eventId,
    event_title: eventTitle,
    venue_name: venueName,
    venue_id: venueId,
    interaction_type: 'map_pin',
    discovery_method: 'visual'
  })

  // Track in map_interactions table
  supabase
    .from('map_interactions')
    .insert({
      session_id: generateSessionId(),
      interaction_type: 'marker_click',
      event_id: eventId,
      venue_id: venueId,
      created_at: new Date().toISOString()
    })
    .catch(error => console.error('Map marker error:', error))
}

export const trackMapMove = (newBounds?: any, zoomLevel?: number): void => {
  track('map_move', {
    bounds: newBounds,
    zoom_level: zoomLevel,
    exploration_behavior: 'active',
    engagement_type: 'exploration'
  })

  // Track in map_interactions table
  supabase
    .from('map_interactions')
    .insert({
      session_id: generateSessionId(),
      interaction_type: 'move',
      bounds: newBounds,
      zoom_level: zoomLevel,
      created_at: new Date().toISOString()
    })
    .catch(error => console.error('Map move error:', error))
}

// ============================================================================
// UI INTERACTIONS
// ============================================================================

export const trackListOpen = (eventCount: number): void => {
  track('list_open', {
    event_count: eventCount,
    ui_component: 'event_list',
    interaction_type: 'navigation',
    user_intent: 'browse'
  })
}

export const trackMenuOpen = (): void => {
  track('menu_open', {
    ui_component: 'main_menu',
    interaction_type: 'navigation'
  })
}

export const trackLocationEnabled = (): void => {
  track('location_enabled', {
    permission_granted: true,
    feature: 'geolocation',
    privacy_decision: 'accept'
  })
}

export const trackLocationDenied = (): void => {
  track('location_denied', {
    permission_granted: false,
    feature: 'geolocation',
    privacy_decision: 'deny'
  })
}

// ============================================================================
// BUSINESS METRICS & CLAIMS
// ============================================================================

export const trackClaimStart = (
  claimType: 'event' | 'venue',
  itemId: string,
  itemName: string
): void => {
  track('claim_start', {
    claim_type: claimType,
    item_id: itemId,
    item_name: itemName,
    business_intent: 'partnership',
    conversion_stage: 'interest'
  })

  // Track in business_metrics table
  supabase
    .from('business_metrics')
    .insert({
      session_id: generateSessionId(),
      metric_type: 'claim_start',
      metric_category: 'business',
      item_id: itemId,
      item_name: itemName,
      item_type: claimType,
      business_value: 'high',
      conversion_stage: 'interest',
      created_at: new Date().toISOString()
    })
    .catch(error => console.error('Claim start error:', error))
}

export const trackClaimSubmit = (
  claimType: 'event' | 'venue',
  itemId: string,
  itemName: string,
  contactInfo?: string
): void => {
  track('claim_submit', {
    claim_type: claimType,
    item_id: itemId,
    item_name: itemName,
    business_intent: 'partnership',
    conversion_stage: 'action',
    lead_quality: 'high'
  })

  // Track in business_metrics table
  supabase
    .from('business_metrics')
    .insert({
      session_id: generateSessionId(),
      metric_type: 'claim_submit',
      metric_category: 'business',
      item_id: itemId,
      item_name: itemName,
      item_type: claimType,
      contact_info: contactInfo,
      business_value: 'high',
      conversion_stage: 'action',
      created_at: new Date().toISOString()
    })
    .catch(error => console.error('Claim submit error:', error))
}

// Alias for backward compatibility
export const trackClaimStarted = trackClaimStart

// ============================================================================
// CTA & CONVERSION TRACKING
// ============================================================================

export const trackCTAClick = (
  ctaName: string,
  destination?: string,
  context?: string
): void => {
  track('cta_click', {
    cta_name: ctaName,
    destination: destination,
    context: context,
    conversion_intent: 'high',
    ui_element: 'call_to_action'
  })
}

export const trackPageView = (pageName: string, additionalData?: Record<string, any>): void => {
  track('page_view', {
    page_name: pageName,
    path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    ...additionalData
  })
}

// ============================================================================
// USER AUTHENTICATION TRACKING
// ============================================================================

export const trackSignup = (method: string): void => {
  track('user_signup', {
    signup_method: method,
    user_lifecycle: 'new',
    conversion_value: 'high'
  })

  supabase
    .from('business_metrics')
    .insert({
      session_id: generateSessionId(),
      metric_type: 'signup',
      metric_category: 'user',
      business_value: 'high',
      conversion_stage: 'action',
      created_at: new Date().toISOString()
    })
    .catch(error => console.error('Signup tracking error:', error))
}

export const trackLogin = (method: string): void => {
  track('user_login', {
    login_method: method,
    user_lifecycle: 'returning',
    retention_signal: true
  })
}
