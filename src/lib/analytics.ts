// src/lib/analytics.ts
// Complete analytics file with all tracking functions

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

  // Track generic event
  async trackEvent(eventType: string, eventId: string, eventName: string, venueName: string): Promise<void> {
    try {
      await supabase.from('analytics_events').insert({
        session_id: this.sessionId,
        event_type: eventType,
        event_id: eventId,
        event_name: eventName,
        venue_name: venueName,
        device_type: this.getDeviceType(),
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Analytics event error:', e);
    }
  }

  // Track ticket click - FULL VERSION
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

  // Track event view
  async trackEventView(eventId: string, eventName: string, venueName: string): Promise<void> {
    await this.trackEvent('event_view', eventId, eventName, venueName);
  }

  // Map interactions
  async trackMapLoaded(): Promise<void> {
    await this.trackEvent('map_loaded', '', '', '');
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

  // Menu interactions
  async trackMenuOpen(): Promise<void> {
    await this.trackEvent('menu_open', '', '', '');
  }

  async trackListOpen(): Promise<void> {
    await this.trackEvent('list_open', '', '', '');
  }

  // Filter interactions
  async trackDateFilter(filter: string): Promise<void> {
    await this.trackEvent('date_filter', '', filter, '');
  }

  async trackGenreFilter(genre: string): Promise<void> {
    await this.trackEvent('genre_filter', '', genre, '');
  }

  // Claim submission
  async trackClaimSubmit(type: string, id: string): Promise<void> {
    await this.trackEvent('claim_submit', id, type, '');
  }
}

// Singleton instance
export const analytics = typeof window !== 'undefined' ? new Analytics() : null;

// Initialize analytics (for backwards compatibility)
export const initAnalytics = (): void => {
  // Analytics auto-initializes on import
};

// Export all tracking functions
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

export const trackEventView = (
  eventId: string,
  eventName: string,
  venueName: string
): void => {
  analytics?.trackEventView(eventId, eventName, venueName);
};

export const trackMapLoaded = (): void => {
  analytics?.trackMapLoaded();
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

export const trackClaimSubmit = (type: string, id: string): void => {
  analytics?.trackClaimSubmit(type, id);
};
