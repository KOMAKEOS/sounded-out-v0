// lib/analytics-advanced.ts
// ADVANCED ANALYTICS - Tracks everything for data-driven decisions

import { supabase } from '@/lib/supabase';

interface TrackEventParams {
  eventType: 'event_view' | 'ticket_click' | 'share' | 'page_view';
  eventId?: string;
  eventName?: string;
  venueName?: string;
  venueId?: string;
  genreSlug?: string;
  genreName?: string;
  promoterId?: string;
  promoterName?: string;
  ticketPrice?: number;
  ticketUrl?: string;
  eventStartTime?: string;
  clickSource?: string;
  metadata?: Record<string, any>;
}

class AdvancedAnalytics {
  private sessionId: string | null = null;
  private supabase = createClient();

  constructor() {
    if (typeof window === 'undefined') return;
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    const key = 'sounded_out_session';
    const timeout = 30 * 60 * 1000;
    
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.ts < timeout) {
          parsed.ts = Date.now();
          localStorage.setItem(key, JSON.stringify(parsed));
          return parsed.id;
        }
      } catch (e) {}
    }
    
    const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(key, JSON.stringify({ id: newId, ts: Date.now() }));
    return newId;
  }

  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    if (typeof window === 'undefined') return 'desktop';
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
    return 'desktop';
  }

  private getBrowser(): string {
    if (typeof window === 'undefined') return 'Unknown';
    const ua = navigator.userAgent;
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('SamsungBrowser') > -1) return 'Samsung';
    if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
    if (ua.indexOf('Trident') > -1) return 'IE';
    if (ua.indexOf('Edge') > -1) return 'Edge';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    return 'Unknown';
  }

  private getOS(): string {
    if (typeof window === 'undefined') return 'Unknown';
    const ua = navigator.userAgent;
    if (ua.indexOf('Win') > -1) return 'Windows';
    if (ua.indexOf('Mac') > -1) return 'MacOS';
    if (ua.indexOf('Linux') > -1) return 'Linux';
    if (ua.indexOf('Android') > -1) return 'Android';
    if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
    return 'Unknown';
  }

  private getUTM(): { source: string | null; medium: string | null; campaign: string | null } {
    if (typeof window === 'undefined') return { source: null, medium: null, campaign: null };
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source'),
      medium: params.get('utm_medium'),
      campaign: params.get('utm_campaign'),
    };
  }

  private getTimeData(eventStartTime?: string): { hour: number; dayOfWeek: number } {
    const eventTime = eventStartTime ? new Date(eventStartTime) : new Date();
    return {
      hour: eventTime.getHours(),
      dayOfWeek: eventTime.getDay(),
    };
  }

  async track(params: TrackEventParams): Promise<void> {
    if (!this.sessionId) return;

    const utm = this.getUTM();
    const timeData = this.getTimeData(params.eventStartTime);

    const data: any = {
      session_id: this.sessionId,
      event_type: params.eventType,
      event_id: params.eventId || null,
      event_name: params.eventName || null,
      venue_name: params.venueName || null,
      venue_id: params.venueId || null,
      genre_slug: params.genreSlug || null,
      genre_name: params.genreName || null,
      promoter_id: params.promoterId || null,
      promoter_name: params.promoterName || null,
      ticket_price: params.ticketPrice || null,
      ticket_url: params.ticketUrl || null,
      event_start_time: params.eventStartTime || null,
      event_hour: timeData.hour,
      event_day_of_week: timeData.dayOfWeek,
      device_type: this.getDeviceType(),
      browser: this.getBrowser(),
      os: this.getOS(),
      referrer: typeof window !== 'undefined' ? document.referrer || null : null,
      utm_source: utm.source,
      utm_medium: utm.medium,
      utm_campaign: utm.campaign,
      click_source: params.clickSource || null,
      metadata: params.metadata || null,
      created_at: new Date().toISOString(),
    };

    try {
      const result = await this.supabase.from('analytics_events').insert(data);
      if (result.error) {
        console.error('Analytics error:', result.error);
      }
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  async trackEventView(
    eventId: string,
    eventName: string,
    venueName: string,
    venueId: string,
    genreSlug: string,
    genreName: string,
    promoterId: string,
    promoterName: string,
    eventStartTime: string,
    ticketPrice?: number
  ): Promise<void> {
    await this.track({
      eventType: 'event_view',
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
    });
  }

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
    await this.track({
      eventType: 'ticket_click',
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
      clickSource,
    });
  }

  async refreshStats(): Promise<void> {
    try {
      await this.supabase.rpc('update_analytics_stats');
    } catch (error) {
      console.error('Stats refresh error:', error);
    }
  }
}

export const analytics = typeof window !== 'undefined' ? new AdvancedAnalytics() : null;

export const trackEventView = (
  eventId: string,
  eventName: string,
  venueName: string,
  venueId: string,
  genreSlug: string,
  genreName: string,
  promoterId: string,
  promoterName: string,
  eventStartTime: string,
  ticketPrice?: number
): void => {
  analytics?.trackEventView(
    eventId,
    eventName,
    venueName,
    venueId,
    genreSlug,
    genreName,
    promoterId,
    promoterName,
    eventStartTime,
    ticketPrice
  );
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

export const refreshStats = (): void => {
  analytics?.refreshStats();
};
