'use client'

import posthog from 'posthog-js'
import { supabase } from '@/lib/supabase'

// ============================================================================
// SOUNDED OUT ANALYTICS
// Tracks to PostHog + Supabase
// ============================================================================

let initialized = false

function getAnonId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('so_anon_id')
  if (!id) {
    id = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`
    localStorage.setItem('so_anon_id', id)
  }
  return id
}

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let session = sessionStorage.getItem('so_session')
  if (!session) {
    session = `ses_${Date.now()}_${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem('so_session', session)
  }
  return session
}

function getDevice() {
  if (typeof window === 'undefined') return { type: 'unknown', browser: 'unknown', os: 'unknown' }
  const ua = navigator.userAgent
  return {
    type: /mobile|android|iphone/i.test(ua) ? 'mobile' : /tablet|ipad/i.test(ua) ? 'tablet' : 'desktop',
    browser: ua.includes('Chrome') ? 'Chrome' : ua.includes('Safari') ? 'Safari' : ua.includes('Firefox') ? 'Firefox' : 'Other',
    os: ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'Mac' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : 'Other',
  }
}

export function initAnalytics() {
  if (typeof window === 'undefined' || initialized) return
  initialized = true
  
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (key) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com',
      capture_pageview: true,
      autocapture: true,
    })
  }
  
  track('session_start', getDevice())
}

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
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture(eventName, payload)
  }
  
  // Supabase
  try {
    await supabase.from('analytics_events').insert({
      event_name: eventName,
      properties: payload,
      session_id: payload.session_id,
      page_url: window.location.href,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    })
  } catch (e) {
    // Silent fail
  }
}

// Pre-built tracking functions
export const trackPageView = (page: string) => track('page_view', { page })
export const trackMapLoaded = (eventCount: number) => track('map_loaded', { event_count: eventCount })
export const trackMarkerClick = (eventId: string, eventTitle: string, venueName: string) => 
  track('marker_click', { event_id: eventId, event_title: eventTitle, venue_name: venueName })
export const trackEventView = (eventId: string, eventTitle: string, venueName: string, source: string) =>
  track('event_view', { event_id: eventId, event_title: eventTitle, venue_name: venueName, source })
export const trackTicketClick = (eventId: string, eventTitle: string, url: string) =>
  track('ticket_click', { event_id: eventId, event_title: eventTitle, ticket_url: url })
export const trackDirections = (venueName: string) => track('directions_click', { venue_name: venueName })
export const trackShare = (eventId: string, method: string) => track('share', { event_id: eventId, method })
export const trackDateFilter = (filter: string, resultCount: number) => track('date_filter', { filter, result_count: resultCount })
export const trackGenreFilter = (genre: string, resultCount: number) => track('genre_filter', { genre, result_count: resultCount })
export const trackListOpen = (eventCount: number) => track('list_open', { event_count: eventCount })
export const trackSwipe = (direction: string) => track('swipe', { direction })
export const trackClaimStart = (type: string, name: string) => track('claim_start', { type, name })
export const trackClaimSubmit = (type: string, name: string) => track('claim_submit', { type, name })
export const trackContactOpen = () => track('contact_open', {})
export const trackContactMethod = (method: string) => track('contact_method', { method })
export const trackCTAClick = (cta: string, location: string) => track('cta_click', { cta, location })
export const trackMenuOpen = () => track('menu_open', {})
export const trackError = (error: string, context: string) => track('error', { error, context })
