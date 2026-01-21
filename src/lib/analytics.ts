// src/lib/analytics.ts
// FINAL COMPLETE VERSION - All function signatures match your code

import { supabase } from '@/lib/supabase';

class Analytics {
  private sessionId: string;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    
    const stored = localStorage.getItem('sounded_out_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.ts < 30 * 60 * 1000) {
          return parsed.id;
        }
      } catch (e) {}
    }
    
    const newId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    localStorage.setItem('sounded_out_session', JSON.stringify({ id: newId, ts: Date.now() }));
    return newId;
  }

  private getDeviceType(): string {
    if (typeof window === 'undefined') return 'desktop';
    return /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  }

  // Generic track
  private async trackEvent(eventType: string, eventId: string, eventName: string, venueName: string, metadata?: any): Promise<void> {
    try {
      await supabase.from('analytics_events').insert({
        session_id: this.sessionId,
        event_type: eventType,
        event_id: eventId || null,
        event_name: eventName || null,
        venue_name: venueName || null,
        device_type: this.getDeviceType(),
        metadata: metadata || null,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Analytics event error:', e);
    }
  }

  // Event view - UPDATED to accept optional 4th parameter
  async trackEventView(eventId: string, eventName: string, venueName: string, viewSource?: string): Promise<void> {
    await this.trackEvent('event_view', eventId, eventName, venueName, viewSource ? { view_source: viewSource } : null);
  }

  // Ticket click - FULL VERSION with all parameters
  async trackTicketClick(
    eventId: string,
    eventName: string,
    venueName: string,
    venueId: string,
    genreSlug: string,
    genreName: string,
    promoterId: string,
    promoterName: string,
    eventStartTime: string,
    ticketPrice: number,
    ticketUrl: string,
    clickSource: string
  ): Promise<void> {
    try {
      await supabase.from('analytics_ticket_clicks').insert({
        session_id: this.sessionId,
        event_id: eventId,
        event_name: eventName,
        venue_name: venueName,
        ticket_url: ticketUrl,
        click_source: clickSource,
        device_type: this.getDeviceType(),
        created_at: new Date().toISOString(),
      });

      await this.trackEvent('ticket_click', eventId, eventName, venueName);
    } catch (e) {
      console.error('Ticket click tracking error:', e);
    }
  }

  // Map interactions
  async trackMapLoaded(eventCount?: number, venueCount?: number): Promise<void> {
    const metadata: any = {};
    if (eventCount !== undefined) metadata.event_count = eventCount;
    if (venueCount !== undefined) metadata.venue_count = venueCount;
    
    try {
      await supabase.from('analytics_events').insert({
        session_id: this.sessionId,
        event_type: 'map_loaded',
        event_id: '',
        event_name: '',
        venue_name: '',
        device_type: this.getDeviceType(),
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Map loaded tracking error:', e);
    }
  }

  async trackMarkerClick(eventId: string, eventName: string): Promise<void> {
    await this.trackEvent('marker_click', eventId, eventName, '');
  }

  async trackLocationEnabled(): Promise<void> {
    await this.trackEvent('location_enabled', '', '', '');
  }

  async trackLocationDenied(): Promise<void> {
    await this.trackEvent('location_denied', '', '', '');
  }

  // Navigation
  async trackMenuOpen(): Promise<void> {
    await this.trackEvent('menu_open', '', '', '');
  }

  async trackListOpen(): Promise<void> {
    await this.trackEvent('list_open', '', '', '');
  }

  // Filters
  async trackDateFilter(filter: string): Promise<void> {
    await this.trackEvent('date_filter', '', filter, '');
  }

  async trackGenreFilter(genre: string): Promise<void> {
    await this.trackEvent('genre_filter', '', genre, '');
  }

  // Actions
  async trackDirectionsClick(eventId: string, venueName: string): Promise<void> {
    await this.trackEvent('directions_click', eventId, '', venueName);
  }

  async trackShareClick(eventId: string, eventName: string): Promise<void> {
    await this.trackEvent('share_click', eventId, eventName, '');
  }

  async trackCTAClick(ctaType: string, eventId: string): Promise<void> {
    await this.trackEvent('cta_click', eventId, ctaType, '');
  }

  // Claims
  async trackClaimStart(type: string): Promise<void> {
    await this.trackEvent('claim_start', '', type, '');
  }

  async trackClaimSubmit(type: string, id: string): Promise<void> {
    await this.trackEvent('claim_submit', id, type, '');
  }
}

// Singleton
export const analytics = typeof window !== 'undefined' ? new Analytics() : null;

// Initialize
export const initAnalytics = (): void => {
  // Auto-initializes
};

// Exports - ALL WITH CORRECT SIGNATURES
export const trackEventView = (
  eventId: string,
  eventName: string,
  venueName: string,
  viewSource?: string
): void => {
  analytics?.trackEventView(eventId, eventName, venueName, viewSource);
};

export const trackTicketClick = (
  eventId: string,
  eventName: string,
  venueName: string,
  venueId: string,
  genreSlug: string,
  genreName: string,
  promoterId: string,
  promoterName: string,
  eventStartTime: string,
  ticketPrice: number,
  ticketUrl: string,
  clickSource: string = 'event_card'
): void => {
  analytics?.trackTicketClick(
    eventId,
    eventName,
    venueName,
    venueId,
    genreSlug,
    genreName,
    promoterId,
    promoterName,
    eventStartTime,
    ticketPrice,
    ticketUrl,
    clickSource
  );
};

export const trackMapLoaded = (eventCount?: number, venueCount?: number): void => {
  analytics?.trackMapLoaded(eventCount, venueCount);
};

export const trackMarkerClick = (eventId: string, eventName: string): void => {
  analytics?.trackMarkerClick(eventId, eventName);
};

export const trackLocationEnabled = (): void => {
  analytics?.trackLocationEnabled();
};

export const trackLocationDenied = (): void => {
  analytics?.trackLocationDenied();
};

export const trackMenuOpen = (): void => {
  analytics?.trackMenuOpen();
};

export const trackListOpen = (): void => {
  analytics?.trackListOpen();
};

export const trackDateFilter = (filter: string): void => {
  analytics?.trackDateFilter(filter);
};

export const trackGenreFilter = (genre: string): void => {
  analytics?.trackGenreFilter(genre);
};

export const trackDirectionsClick = (eventId: string, venueName: string): void => {
  analytics?.trackDirectionsClick(eventId, venueName);
};

export const trackShareClick = (eventId: string, eventName: string): void => {
  analytics?.trackShareClick(eventId, eventName);
};

export const trackCTAClick = (ctaType: string, eventId: string): void => {
  analytics?.trackCTAClick(ctaType, eventId);
};

export const trackClaimStart = (type: string): void => {
  analytics?.trackClaimStart(type);
};

export const trackClaimSubmit = (type: string, id: string): void => {
  analytics?.trackClaimSubmit(type, id);
};
