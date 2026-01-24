/**
 * SOUNDED OUT - COMPREHENSIVE ANALYTICS SYSTEM
 * Tracks all user interactions for DAU/WAU/MAU and viral metrics
 */

import { supabase } from './supabase';
import { useEffect } from 'react';

// ============================================================================
// CORE ANALYTICS ENGINE
// ============================================================================

class AnalyticsEngine {
  private sessionId: string;
  private userId: string | null = null;
  private queue: any[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.initializeUser();
    this.startAutoFlush();
    
    // Track session start
    this.trackSessionStart();
    
    // Track page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.flush(); // Flush when user leaves
        }
      });
    }
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'ssr_session';
    
    let sessionId = sessionStorage.getItem('so_session_id');
    if (!sessionId) {
      sessionId = `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('so_session_id', sessionId);
      sessionStorage.setItem('so_session_start', new Date().toISOString());
    }
    return sessionId;
  }

  private async initializeUser() {
    const { data: { user } } = await supabase.auth.getUser();
    this.userId = user?.id || null;
  }

  private getDeviceInfo() {
    if (typeof window === 'undefined') {
      return { device_type: 'desktop', browser: 'unknown', user_agent: 'server' };
    }

    const width = window.innerWidth;
    const ua = navigator.userAgent;

    return {
      device_type: width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop',
      browser: ua.includes('Chrome') ? 'Chrome' : 
               ua.includes('Safari') ? 'Safari' : 
               ua.includes('Firefox') ? 'Firefox' : 'Other',
      user_agent: ua
    };
  }

  private startAutoFlush() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, 10000); // Flush every 10 seconds
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      // Insert into analytics_events table
      const { error } = await supabase
        .from('analytics_events')
        .insert(events);

      if (error) {
        console.error('Analytics flush error:', error);
        // Don't re-queue to avoid infinite loops
      }
    } catch (e) {
      console.error('Analytics exception:', e);
    }
  }

  async track(eventName: string, properties: Record<string, any> = {}) {
    // Get fresh user ID in case they just logged in
    if (!this.userId) {
      const { data: { user } } = await supabase.auth.getUser();
      this.userId = user?.id || null;
    }

    const deviceInfo = this.getDeviceInfo();

    const event = {
      event_name: eventName,
      user_id: this.userId,
      session_id: this.sessionId,
      properties: {
        ...properties,
        ...deviceInfo,
        page_url: typeof window !== 'undefined' ? window.location.href : '',
        page_path: typeof window !== 'undefined' ? window.location.pathname : '',
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    };

    this.queue.push(event);

    // Also track user interaction if it's a meaningful action
    if (this.shouldTrackInteraction(eventName)) {
      await this.trackInteraction(eventName, properties);
    }

    // Critical events flush immediately
    const criticalEvents = ['signup', 'login', 'ticket_clicked', 'event_shared'];
    if (criticalEvents.includes(eventName)) {
      await this.flush();
    }
  }

  private shouldTrackInteraction(eventName: string): boolean {
    const interactionEvents = [
      'event_viewed', 'event_saved', 'event_unsaved', 'ticket_clicked',
      'directions_clicked', 'event_shared', 'venue_viewed', 'brand_viewed'
    ];
    return interactionEvents.includes(eventName);
  }

  private async trackInteraction(eventName: string, properties: Record<string, any>) {
    const interaction = {
      user_id: this.userId,
      session_id: this.sessionId,
      interaction_type: this.mapEventToInteractionType(eventName),
      target_type: this.extractTargetType(properties),
      target_id: properties.event_id || properties.venue_id || properties.brand_id,
      target_data: properties,
      source_page: properties.source || (typeof window !== 'undefined' ? window.location.pathname : ''),
      source_component: properties.component,
      device_type: this.getDeviceInfo().device_type,
      created_at: new Date().toISOString()
    };

    try {
      await supabase.from('user_interactions').insert(interaction);
    } catch (e) {
      console.error('Interaction tracking error:', e);
    }
  }

  private mapEventToInteractionType(eventName: string): string {
    const map: Record<string, string> = {
      'event_viewed': 'view',
      'event_saved': 'save',
      'event_unsaved': 'unsave',
      'ticket_clicked': 'click',
      'directions_clicked': 'click',
      'event_shared': 'share',
      'venue_viewed': 'view',
      'brand_viewed': 'view'
    };
    return map[eventName] || 'other';
  }

  private extractTargetType(properties: Record<string, any>): string {
    if (properties.event_id) return 'event';
    if (properties.venue_id) return 'venue';
    if (properties.brand_id) return 'brand';
    return 'unknown';
  }

  // Session tracking
  private trackSessionStart() {
    this.track('session_started', {
      is_new_session: true,
      session_id: this.sessionId
    });
  }

  // Cleanup
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Singleton instance
let analyticsInstance: AnalyticsEngine | null = null;

function getAnalytics(): AnalyticsEngine {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsEngine();
  }
  return analyticsInstance;
}

// ============================================================================
// PUBLIC TRACKING FUNCTIONS - USE THESE IN YOUR COMPONENTS
// ============================================================================

// PAGE VIEWS
export async function trackPageView(pageName: string, properties?: Record<string, any>) {
  await getAnalytics().track('page_viewed', {
    page_name: pageName,
    ...properties
  });
}

// USER AUTHENTICATION
export async function trackSignup(method: 'google' | 'email') {
  await getAnalytics().track('signup', { method });
}

export async function trackLogin(method: 'google' | 'email') {
  await getAnalytics().track('login', { method });
}

export async function trackLogout() {
  await getAnalytics().track('logout', {});
}

// MAP INTERACTIONS
export async function trackMapLoaded(bounds: any, zoom: number) {
  await getAnalytics().track('map_loaded', { bounds, zoom });
}

export async function trackMapMoved(bounds: any, zoom: number) {
  await getAnalytics().track('map_moved', { bounds, zoom });
}

export async function trackMarkerClick(eventId: string, eventName: string, venueId: string) {
  await getAnalytics().track('marker_clicked', {
    event_id: eventId,
    event_name: eventName,
    venue_id: venueId,
    source: 'map'
  });
}

// EVENT INTERACTIONS - CORE METRICS
export async function trackEventView(
  eventId: string,
  eventName: string,
  venueId: string,
  venueName: string,
  source: 'map' | 'list' | 'search' | 'share' | 'direct',
  properties?: Record<string, any>
) {
  await getAnalytics().track('event_viewed', {
    event_id: eventId,
    event_name: eventName,
    venue_id: venueId,
    venue_name: venueName,
    source,
    ...properties
  });
}

export async function trackEventSave(eventId: string, eventName: string) {
  await getAnalytics().track('event_saved', {
    event_id: eventId,
    event_name: eventName
  });
}

export async function trackEventUnsave(eventId: string, eventName: string) {
  await getAnalytics().track('event_unsaved', {
    event_id: eventId,
    event_name: eventName
  });
}

// TICKET CLICKS - CRITICAL CONVERSION METRIC
export async function trackTicketClick(
  eventId: string,
  eventName: string,
  ticketUrl: string,
  venueId: string,
  venueName: string,
  price?: number | null,
  ticketPlatform?: string | null
) {
  await getAnalytics().track('ticket_clicked', {
    event_id: eventId,
    event_name: eventName,
    ticket_url: ticketUrl,
    venue_id: venueId,
    venue_name: venueName,
    price,
    ticket_platform: ticketPlatform
  });
}

// DIRECTIONS CLICKS
export async function trackDirectionsClick(
  eventId: string,
  venueId: string,
  venueName: string
) {
  await getAnalytics().track('directions_clicked', {
    event_id: eventId,
    venue_id: venueId,
    venue_name: venueName
  });
}

// SHARING - VIRAL METRIC
export async function trackEventShare(
  eventId: string,
  eventName: string,
  method: 'link' | 'whatsapp' | 'instagram' | 'twitter' | 'facebook' | 'native',
  shareUrl: string
) {
  await getAnalytics().track('event_shared', {
    event_id: eventId,
    event_name: eventName,
    share_method: method,
    share_url: shareUrl
  });
}

// VENUE INTERACTIONS
export async function trackVenueView(
  venueId: string,
  venueName: string,
  source: 'map' | 'event_page' | 'list' | 'search'
) {
  await getAnalytics().track('venue_viewed', {
    venue_id: venueId,
    venue_name: venueName,
    source
  });
}

// BRAND INTERACTIONS
export async function trackBrandView(
  brandId: string,
  brandName: string,
  source: 'event_page' | 'search' | 'direct'
) {
  await getAnalytics().track('brand_viewed', {
    brand_id: brandId,
    brand_name: brandName,
    source
  });
}

// SEARCH
export async function trackSearch(query: string, resultCount: number) {
  await getAnalytics().track('search_performed', {
    search_query: query,
    result_count: resultCount
  });
}

// FILTERS
export async function trackFilterApplied(filterType: string, filterValue: any) {
  await getAnalytics().track('filter_applied', {
    filter_type: filterType,
    filter_value: filterValue
  });
}

// CLAIMS
export async function trackClaimStarted(
  claimType: 'event' | 'venue' | 'brand',
  targetId: string,
  targetName: string
) {
  await getAnalytics().track('claim_started', {
    claim_type: claimType,
    target_id: targetId,
    target_name: targetName
  });
}

export async function trackClaimSubmitted(
  claimType: 'event' | 'venue' | 'brand',
  targetId: string,
  targetName: string
) {
  await getAnalytics().track('claim_submitted', {
    claim_type: claimType,
    target_id: targetId,
    target_name: targetName
  });
}

// React Hook for page tracking
export function usePageTracking(pageName: string, properties?: Record<string, any>) {
  useEffect(() => {
    trackPageView(pageName, properties);
  }, [pageName]);
}

// Cleanup on app unmount
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (analyticsInstance) {
      analyticsInstance.destroy();
    }
  });
}

export { getAnalytics };
