'use client'

import posthog from 'posthog-js'
import { supabase } from '@/lib/supabase'

// ============================================================================
// SOUNDED OUT ANALYTICS - COMPREHENSIVE TRACKING
// Tracks EVERYTHING to PostHog + Supabase
// ============================================================================

let initialized = false

// Get or create anonymous user ID (persists across sessions)
function getAnonId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('so_anon_id')
  if (!id) {
    id = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2)
    localStorage.setItem('so_anon_id', id)
  }
  return id
}

// Get or create session ID (new each browser session)
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let session = sessionStorage.getItem('so_session')
  if (!session) {
    session = 'ses_' + Date.now() + '_' + Math.random().toString(36).slice(2)
    sessionStorage.setItem('so_session', session)
  }
  return session
}

// Get device info
function getDevice(): { type: string; browser: string; os: string; screen: string } {
  if (typeof window === 'undefined') return { type: 'unknown', browser: 'unknown', os: 'unknown', screen: 'unknown' }
  const ua = navigator.userAgent
  
  let type = 'desktop'
  if (/mobile|android|iphone/i.test(ua)) type = 'mobile'
  else if (/tablet|ipad/i.test(ua)) type = 'tablet'
  
  let browser = 'other'
  if (ua.includes('Chrome') && !ua.includes('Edge')) browser = 'chrome'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'safari'
  else if (ua.includes('Firefox')) browser = 'firefox'
  else if (ua.includes('Edge')) browser = 'edge'
  
  let os = 'other'
  if (ua.includes('Windows')) os = 'windows'
  else if (ua.includes('Mac')) os = 'mac'
  else if (ua.includes('Android')) os = 'android'
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'ios'
  else if (ua.includes('Linux')) os = 'linux'
  
  const screen = window.innerWidth + 'x' + window.innerHeight
  
  return { type, browser, os, screen }
}

// Get referrer info
function getReferrer(): { source: string; medium: string; campaign: string } {
  if (typeof window === 'undefined') return { source: 'direct', medium: 'none', campaign: '' }
  
  const params = new URLSearchParams(window.location.search)
  const utmSource = params.get('utm_source')
  const utmMedium = params.get('utm_medium')
  const utmCampaign = params.get('utm_campaign')
  
  if (utmSource) {
    return { source: utmSource, medium: utmMedium || 'unknown', campaign: utmCampaign || '' }
  }
  
  const ref = document.referrer
  if (!ref) return { source: 'direct', medium: 'none', campaign: '' }
  
  if (ref.includes('google')) return { source: 'google', medium: 'organic', campaign: '' }
  if (ref.includes('instagram')) return { source: 'instagram', medium: 'social', campaign: '' }
  if (ref.includes('facebook')) return { source: 'facebook', medium: 'social', campaign: '' }
  if (ref.includes('twitter') || ref.includes('x.com')) return { source: 'twitter', medium: 'social', campaign: '' }
  if (ref.includes('tiktok')) return { source: 'tiktok', medium: 'social', campaign: '' }
  if (ref.includes('linkedin')) return { source: 'linkedin', medium: 'social', campaign: '' }
  
  return { source: 'referral', medium: 'website', campaign: '' }
}

// Initialize analytics
export function initAnalytics(): void {
  if (typeof window === 'undefined' || initialized) return
  initialized = true
  
  // Initialize PostHog
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (key) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com',
      capture_pageview: true,
      autocapture: true,
      persistence: 'localStorage',
    })
  }
  
  // Track session start
  const device = getDevice()
  const referrer = getReferrer()
  
  track('session_start', {
    device_type: device.type,
    browser: device.browser,
    os: device.os,
    screen_size: device.screen,
    referrer_source: referrer.source,
    referrer_medium: referrer.medium,
    utm_campaign: referrer.campaign,
    landing_page: window.location.pathname,
  })
}

// Main track function - sends to PostHog + Supabase
export async function track(eventName: string, data: Record<string, any> = {}): Promise<void> {
  if (typeof window === 'undefined') return
  
  const payload = {
    ...data,
    anon_id: getAnonId(),
    session_id: getSessionId(),
    page_path: window.location.pathname,
    page_url: window.location.href,
    timestamp: new Date().toISOString(),
  }
  
  // PostHog
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (key) {
    posthog.capture(eventName, payload)
  }
  
  // Supabase - your own data warehouse
  try {
    await supabase.from('analytics_events').insert({
      event_name: eventName,
      properties: payload,
      session_id: payload.session_id,
      page_url: payload.page_url,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    })
  } catch (err) {
    // Silent fail - don't break the app
    console.log('Analytics insert failed:', err)
  }
}

// ============================================================================
// TRACKING FUNCTIONS - Call these throughout your app
// ============================================================================

// SESSION & PAGE
export function trackPageView(pageName: string): void {
  track('page_view', { page_name: pageName })
}

// MAP
export function trackMapLoaded(eventCount: number, venueCount: number): void {
  track('map_loaded', { event_count: eventCount, venue_count: venueCount })
}

export function trackMapMoved(center: { lat: number; lng: number }, zoom: number): void {
  track('map_moved', { center_lat: center.lat, center_lng: center.lng, zoom_level: zoom })
}

// MARKERS & EVENTS
export function trackMarkerClick(eventId: string, eventTitle: string, venueName: string): void {
  track('marker_click', { event_id: eventId, event_title: eventTitle, venue_name: venueName })
}

export function trackEventView(eventId: string, eventTitle: string, venueName: string, source: string): void {
  track('event_view', { event_id: eventId, event_title: eventTitle, venue_name: venueName, source: source })
}

export function trackEventSwipe(direction: string, fromEventId: string, toEventId: string): void {
  track('event_swipe', { direction: direction, from_event_id: fromEventId, to_event_id: toEventId })
}

// CONVERSIONS - THE MONEY EVENTS 💰
export function trackTicketClick(eventId: string, eventTitle: string, ticketUrl: string, venueName: string): void {
  track('ticket_click', { event_id: eventId, event_title: eventTitle, ticket_url: ticketUrl, venue_name: venueName })
}

export function trackDirectionsClick(venueName: string, venueId: string): void {
  track('directions_click', { venue_name: venueName, venue_id: venueId })
}

export function trackShareClick(eventId: string, eventTitle: string, shareMethod: string): void {
  track('share_click', { event_id: eventId, event_title: eventTitle, share_method: shareMethod })
}

// FILTERS
export function trackDateFilter(filterValue: string, resultCount: number): void {
  track('date_filter', { filter_value: filterValue, result_count: resultCount })
}

export function trackGenreFilter(genre: string, resultCount: number): void {
  track('genre_filter', { genre: genre, result_count: resultCount })
}

export function trackSearch(query: string, resultCount: number): void {
  track('search', { query: query, result_count: resultCount })
}

// LIST VIEW
export function trackListOpen(eventCount: number): void {
  track('list_open', { event_count: eventCount })
}

export function trackListScroll(scrollPercent: number, eventsVisible: number): void {
  track('list_scroll', { scroll_percent: scrollPercent, events_visible: eventsVisible })
}

// CLAIMS - B2B INTEREST 🏢
export function trackClaimStart(claimType: string, entityName: string, entityId: string): void {
  track('claim_start', { claim_type: claimType, entity_name: entityName, entity_id: entityId })
}

export function trackClaimSubmit(claimType: string, entityName: string, entityId: string): void {
  track('claim_submit', { claim_type: claimType, entity_name: entityName, entity_id: entityId })
}

export function trackClaimApproved(claimType: string, entityName: string, entityId: string): void {
  track('claim_approved', { claim_type: claimType, entity_name: entityName, entity_id: entityId })
}

// CONTACT
export function trackContactOpen(source: string): void {
  track('contact_open', { source: source })
}

export function trackContactMethod(method: string): void {
  track('contact_method', { method: method })
}

// LANDING PAGE
export function trackLandingView(page: string): void {
  track('landing_view', { page: page })
}

export function trackCTAClick(ctaName: string, ctaLocation: string): void {
  track('cta_click', { cta_name: ctaName, cta_location: ctaLocation })
}

export function trackCarouselClick(eventId: string, eventTitle: string, position: number): void {
  track('carousel_click', { event_id: eventId, event_title: eventTitle, position: position })
}

// MENU
export function trackMenuOpen(): void {
  track('menu_open', {})
}

export function trackMenuItem(itemName: string): void {
  track('menu_item', { item_name: itemName })
}

// LOCATION
export function trackLocationEnabled(): void {
  track('location_enabled', {})
}

export function trackLocationDenied(): void {
  track('location_denied', {})
}

// ERRORS
export function trackError(errorType: string, errorMessage: string, context: string): void {
  track('error', { error_type: errorType, error_message: errorMessage, context: context })
}

// EMAIL SIGNUP
export function trackEmailSignup(source: string): void {
  track('email_signup', { source: source })
}
