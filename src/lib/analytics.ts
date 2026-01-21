// src/lib/analytics.ts

// ============================================================================
// ANALYTICS INITIALIZATION
// ============================================================================
export const initAnalytics = (): void => {
  if (typeof window === 'undefined') return
  
  // Initialize PostHog or your analytics platform here
  console.log('📊 Analytics initialized')
}

// ============================================================================
// MAP & DISCOVERY EVENTS
// ============================================================================
export const trackMapLoaded = (eventCount: number, venueCount: number): void => {
  console.log('🗺️ Map loaded', { eventCount, venueCount })
  // Add your analytics call here
}

export const trackMarkerClick = (eventId: string, eventTitle: string, venueName: string): void => {
  console.log('📍 Marker clicked', { eventId, eventTitle, venueName })
}

export const trackLocationEnabled = (): void => {
  console.log('📍 User location enabled')
}

export const trackLocationDenied = (): void => {
  console.log('🚫 User location denied')
}

// ============================================================================
// EVENT INTERACTIONS
// ============================================================================
export const trackEventView = (
  eventId: string, 
  eventTitle: string, 
  venueName: string, 
  source: 'list' | 'map_pin' | 'search' | 'recommendation'
): void => {
  console.log('👁️ Event viewed', { eventId, eventTitle, venueName, source })
}

export const trackTicketClick = (
  eventId: string,
  eventTitle: string,
  ticketUrl: string,
  ticketSource: string
): void => {
  console.log('🎫 Ticket link clicked', { eventId, eventTitle, ticketUrl, ticketSource })
}

export const trackDirectionsClick = (
  venueId: string,
  venueName: string,
  eventId?: string
): void => {
  console.log('🗺️ Directions clicked', { venueId, venueName, eventId })
}

export const trackShareClick = (
  eventId: string,
  eventTitle: string,
  shareMethod: 'native' | 'copy_link'
): void => {
  console.log('🔗 Share clicked', { eventId, eventTitle, shareMethod })
}

// ============================================================================
// FILTERS & DISCOVERY
// ============================================================================
export const trackDateFilter = (filter: string, resultCount: number): void => {
  console.log('📅 Date filter applied', { filter, resultCount })
}

export const trackGenreFilter = (genre: string, resultCount: number): void => {
  console.log('🎵 Genre filter applied', { genre, resultCount })
}

export const trackListOpen = (eventCount: number): void => {
  console.log('📋 List view opened', { eventCount })
}

// ============================================================================
// USER ACTIONS
// ============================================================================
export const trackMenuOpen = (): void => {
  console.log('☰ Menu opened')
}

export const trackCTAClick = (
  ctaType: 'ticket' | 'directions' | 'share' | 'claim' | 'save',
  eventId: string,
  eventTitle: string
): void => {
  console.log('🎯 CTA clicked', { ctaType, eventId, eventTitle })
}

// ============================================================================
// CLAIMS & PARTNER FEATURES
// ============================================================================
export const trackClaimStart = (
  claimType: 'event' | 'venue',
  itemId: string,
  itemName: string
): void => {
  console.log('📝 Claim started', { claimType, itemId, itemName })
}

export const trackClaimSubmit = (
  claimType: string,
  itemName: string,
  itemId: string
): void => {
  console.log('✅ Claim submitted', { claimType, itemName, itemId })
}

// ============================================================================
// SAVE & FAVORITES
// ============================================================================
export const trackSaveEvent = (
  eventId: string,
  eventTitle: string,
  action: 'save' | 'unsave'
): void => {
  console.log('❤️ Event saved/unsaved', { eventId, eventTitle, action })
}

// ============================================================================
// AUTHENTICATION EVENTS
// ============================================================================
export const trackSignupStart = (source: 'menu' | 'save' | 'claim'): void => {
  console.log('🔐 Signup started', { source })
}

export const trackLoginSuccess = (method: 'google' | 'email'): void => {
  console.log('✅ Login successful', { method })
}

export const trackLoginModalShown = (trigger: 'save' | 'claim' | 'manual'): void => {
  console.log('🔓 Login modal shown', { trigger })
}

// ============================================================================
// ONBOARDING
// ============================================================================
export const trackOnboardingComplete = (): void => {
  console.log('👋 Onboarding completed')
}

export const trackOnboardingSkip = (): void => {
  console.log('⏭️ Onboarding skipped')
}
