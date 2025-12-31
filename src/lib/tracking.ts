// ============================================
// SOUNDED OUT - INTERACTION TRACKING
// Tracks all user behavior for personalization
// ============================================

import { supabase } from './supabase'
import type { 
  TrackInteractionParams, 
  InteractionType,
  TargetType,
  SourcePage,
  SourceComponent,
  DeviceType 
} from './types'

// ============================================
// SESSION MANAGEMENT
// ============================================

let sessionId: string | null = null

function getSessionId(): string {
  if (sessionId) return sessionId
  
  // Check localStorage for existing session
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('so_session_id')
    const storedTime = localStorage.getItem('so_session_time')
    
    // Session expires after 30 minutes of inactivity
    if (stored && storedTime) {
      const elapsed = Date.now() - parseInt(storedTime, 10)
      if (elapsed < 30 * 60 * 1000) {
        sessionId = stored
        localStorage.setItem('so_session_time', Date.now().toString())
        return sessionId
      }
    }
    
    // Create new session
    sessionId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9)
    localStorage.setItem('so_session_id', sessionId)
    localStorage.setItem('so_session_time', Date.now().toString())
  } else {
    sessionId = 'ssr_' + Date.now().toString(36)
  }
  
  return sessionId
}

function getDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop'
  
  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

// ============================================
// MAIN TRACKING FUNCTION
// ============================================

export async function trackInteraction(params: TrackInteractionParams): Promise<void> {
  const {
    interaction_type,
    target_type,
    target_id,
    target_data,
    source_page,
    source_component,
    view_duration_ms
  } = params
  
  try {
    // Get current user (might be null for anonymous)
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id || null
    
    const interaction = {
      user_id: userId,
      session_id: getSessionId(),
      interaction_type: interaction_type,
      target_type: target_type,
      target_id: target_id || null,
      target_data: target_data || null,
      source_page: source_page || null,
      source_component: source_component || null,
      view_duration_ms: view_duration_ms || null,
      device_type: getDeviceType()
    }
    
    await supabase.from('user_interactions').insert(interaction)
    
    // Also update preference scores in background
    if (userId && target_id) {
      updatePreferenceScores(userId, interaction_type, target_type, target_id, target_data)
    }
  } catch (error) {
    // Silently fail - don't break UX for tracking
    console.error('Tracking error:', error)
  }
}

// ============================================
// PREFERENCE SCORE UPDATES
// ============================================

async function updatePreferenceScores(
  userId: string,
  interactionType: InteractionType,
  targetType: TargetType,
  targetId: string,
  targetData: Record<string, unknown> | null | undefined
): Promise<void> {
  // Score weights for different interactions
  const weights: Record<InteractionType, number> = {
    view: 1,
    click: 3,
    save: 10,
    unsave: -5,
    share: 8,
    interested: 12,
    going: 20,
    attend: 25,
    hide: -15,
    search: 2
  }
  
  const weight = weights[interactionType] || 1
  
  // Update venue preference if interacting with event
  if (targetType === 'event' && targetData && targetData.venue_id) {
    const venueId = targetData.venue_id as string
    await updateVenuePreference(userId, venueId, interactionType, weight)
  }
  
  // Update venue preference directly
  if (targetType === 'venue') {
    await updateVenuePreference(userId, targetId, interactionType, weight)
  }
  
  // Update genre preferences
  if (targetData && targetData.genres) {
    const genresStr = targetData.genres as string
    const genres = genresStr.split(',')
    for (let i = 0; i < genres.length; i++) {
      const genre = genres[i].trim().toLowerCase()
      if (genre) {
        await updateGenrePreference(userId, genre, interactionType, weight)
      }
    }
  }
}

async function updateVenuePreference(
  userId: string,
  venueId: string,
  interactionType: InteractionType,
  weight: number
): Promise<void> {
  // Get current preference
  const { data: existing } = await supabase
    .from('user_venue_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('venue_id', venueId)
    .single()
  
  if (existing) {
    // Update existing
    const updates: Record<string, unknown> = {
      preference_score: Math.min(100, Math.max(0, existing.preference_score + weight))
    }
    
    if (interactionType === 'click') {
      updates.click_count = existing.click_count + 1
    } else if (interactionType === 'view') {
      updates.view_count = existing.view_count + 1
    } else if (interactionType === 'save') {
      updates.event_save_count = existing.event_save_count + 1
    } else if (interactionType === 'going' || interactionType === 'attend') {
      updates.event_attend_count = existing.event_attend_count + 1
    } else if (interactionType === 'hide') {
      updates.is_hidden = true
    }
    
    await supabase
      .from('user_venue_preferences')
      .update(updates)
      .eq('id', existing.id)
  } else {
    // Create new
    await supabase.from('user_venue_preferences').insert({
      user_id: userId,
      venue_id: venueId,
      preference_score: 50 + weight,
      click_count: interactionType === 'click' ? 1 : 0,
      view_count: interactionType === 'view' ? 1 : 0,
      event_save_count: interactionType === 'save' ? 1 : 0,
      event_attend_count: (interactionType === 'going' || interactionType === 'attend') ? 1 : 0,
      is_hidden: interactionType === 'hide'
    })
  }
}

async function updateGenrePreference(
  userId: string,
  genre: string,
  interactionType: InteractionType,
  weight: number
): Promise<void> {
  // Get current preference
  const { data: existing } = await supabase
    .from('user_genre_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('genre', genre)
    .single()
  
  if (existing) {
    // Don't override manual preferences
    if (existing.is_manual) return
    
    const updates: Record<string, unknown> = {
      preference_score: Math.min(100, Math.max(0, existing.preference_score + weight))
    }
    
    if (interactionType === 'click') {
      updates.click_count = existing.click_count + 1
    } else if (interactionType === 'view') {
      updates.view_count = existing.view_count + 1
    } else if (interactionType === 'save') {
      updates.save_count = existing.save_count + 1
    } else if (interactionType === 'going' || interactionType === 'attend') {
      updates.attend_count = existing.attend_count + 1
    }
    
    await supabase
      .from('user_genre_preferences')
      .update(updates)
      .eq('id', existing.id)
  } else {
    // Create new
    await supabase.from('user_genre_preferences').insert({
      user_id: userId,
      genre: genre,
      preference_score: 50 + weight,
      click_count: interactionType === 'click' ? 1 : 0,
      view_count: interactionType === 'view' ? 1 : 0,
      save_count: interactionType === 'save' ? 1 : 0,
      attend_count: (interactionType === 'going' || interactionType === 'attend') ? 1 : 0
    })
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export function trackEventView(
  eventId: string, 
  eventData: { venue_id?: string; genres?: string },
  sourcePage: SourcePage,
  sourceComponent: SourceComponent
): void {
  trackInteraction({
    interaction_type: 'view',
    target_type: 'event',
    target_id: eventId,
    target_data: eventData,
    source_page: sourcePage,
    source_component: sourceComponent
  })
}

export function trackEventClick(
  eventId: string,
  eventData: { venue_id?: string; genres?: string },
  sourcePage: SourcePage,
  sourceComponent: SourceComponent
): void {
  trackInteraction({
    interaction_type: 'click',
    target_type: 'event',
    target_id: eventId,
    target_data: eventData,
    source_page: sourcePage,
    source_component: sourceComponent
  })
}

export function trackEventSave(
  eventId: string,
  eventData: { venue_id?: string; genres?: string }
): void {
  trackInteraction({
    interaction_type: 'save',
    target_type: 'event',
    target_id: eventId,
    target_data: eventData
  })
}

export function trackEventUnsave(
  eventId: string
): void {
  trackInteraction({
    interaction_type: 'unsave',
    target_type: 'event',
    target_id: eventId
  })
}

export function trackEventInterested(
  eventId: string,
  eventData: { venue_id?: string; genres?: string }
): void {
  trackInteraction({
    interaction_type: 'interested',
    target_type: 'event',
    target_id: eventId,
    target_data: eventData
  })
}

export function trackEventGoing(
  eventId: string,
  eventData: { venue_id?: string; genres?: string }
): void {
  trackInteraction({
    interaction_type: 'going',
    target_type: 'event',
    target_id: eventId,
    target_data: eventData
  })
}

export function trackVenueView(
  venueId: string,
  sourcePage: SourcePage
): void {
  trackInteraction({
    interaction_type: 'view',
    target_type: 'venue',
    target_id: venueId,
    source_page: sourcePage
  })
}

export function trackVenueClick(
  venueId: string,
  sourcePage: SourcePage,
  sourceComponent: SourceComponent
): void {
  trackInteraction({
    interaction_type: 'click',
    target_type: 'venue',
    target_id: venueId,
    source_page: sourcePage,
    source_component: sourceComponent
  })
}

export function trackSearch(
  query: string,
  resultCount: number
): void {
  trackInteraction({
    interaction_type: 'search',
    target_type: 'search',
    target_data: { query, result_count: resultCount }
  })
}

export function trackShare(
  targetType: TargetType,
  targetId: string
): void {
  trackInteraction({
    interaction_type: 'share',
    target_type: targetType,
    target_id: targetId
  })
}

export function trackHide(
  targetType: TargetType,
  targetId: string,
  reason?: string
): void {
  trackInteraction({
    interaction_type: 'hide',
    target_type: targetType,
    target_id: targetId,
    target_data: reason ? { reason } : undefined
  })
}

// ============================================
// VIEW DURATION TRACKING
// ============================================

interface ViewTracker {
  targetType: TargetType
  targetId: string
  targetData?: Record<string, unknown>
  sourcePage: SourcePage
  sourceComponent: SourceComponent
  startTime: number
}

let currentViewTracker: ViewTracker | null = null

export function startViewTracking(
  targetType: TargetType,
  targetId: string,
  targetData: Record<string, unknown> | undefined,
  sourcePage: SourcePage,
  sourceComponent: SourceComponent
): void {
  // End previous tracking if exists
  endViewTracking()
  
  currentViewTracker = {
    targetType,
    targetId,
    targetData,
    sourcePage,
    sourceComponent,
    startTime: Date.now()
  }
}

export function endViewTracking(): void {
  if (!currentViewTracker) return
  
  const duration = Date.now() - currentViewTracker.startTime
  
  // Only track if viewed for at least 500ms
  if (duration >= 500) {
    trackInteraction({
      interaction_type: 'view',
      target_type: currentViewTracker.targetType,
      target_id: currentViewTracker.targetId,
      target_data: currentViewTracker.targetData,
      source_page: currentViewTracker.sourcePage,
      source_component: currentViewTracker.sourceComponent,
      view_duration_ms: duration
    })
  }
  
  currentViewTracker = null
}

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', endViewTracking)
  window.addEventListener('pagehide', endViewTracking)
}
