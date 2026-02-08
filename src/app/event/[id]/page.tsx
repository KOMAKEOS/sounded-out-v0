'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import {
  trackEventView,
  trackEventSave,
  trackEventUnsave,
  trackTicketClick,
  trackDirectionsClick,
  trackEventShare,
  trackClaimStarted,
} from '@/lib/analytics';

// ============================================================================
// TYPES
// ============================================================================

interface Venue {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  venue_type: string;
  instagram_url: string | null;
  website_url: string | null;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_verified: boolean;
  tagline: string | null;
}

interface Event {
  id: string;
  venue_id: string;
  brand_id: string | null;
  title: string;
  start_time: string;
  end_time: string | null;
  genres: string | null;
  vibe: string | null;
  event_url: string | null;
  ticket_source: string | null;
  image_url: string | null;
  price_min: number | null;
  price_max: number | null;
  price_type: string | null;
  description: string | null;
  venue?: Venue;
  brand?: Brand;
  so_pick?: boolean;
  sold_out?: boolean;
  no_phones?: boolean;
}

interface RelatedEvent {
  id: string;
  title: string;
  start_time: string;
  genres: string | null;
}

// ============================================================================
// DATE HELPERS
// ============================================================================

function getDateLabel(dateString: string): string {
  const eventDate = new Date(dateString);
  const now = new Date();

  const eventDay = new Date(eventDate.toLocaleString('en-GB', { timeZone: 'Europe/London' }));
  const todayStr = now.toLocaleDateString('en-GB', { timeZone: 'Europe/London' });
  const eventStr = eventDate.toLocaleDateString('en-GB', { timeZone: 'Europe/London' });

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('en-GB', { timeZone: 'Europe/London' });

  if (eventStr === todayStr) return 'TODAY';
  if (eventStr === tomorrowStr) return 'TOMORROW';

  return eventDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/London',
  }).toUpperCase();
}

function getTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/London',
  });
}

function getRelatedDateLabel(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/London',
  });
}

function formatPrice(min: number | null, max: number | null, priceType: string | null): string {
  if (priceType === 'free' || (min === 0 && (max === null || max === 0))) return 'Free Entry';
  if (priceType === 'tba' || (min === null && max === null)) return 'Price TBA';
  if (min !== null && max !== null && min === max) return '\u00A3' + min.toFixed(2);
  if (min !== null && max !== null) return '\u00A3' + min.toFixed(2) + ' \u2013 \u00A3' + max.toFixed(2);
  if (min !== null) return 'From \u00A3' + min.toFixed(2);
  return 'Price TBA';
}

function getTicketSourceLabel(source: string | null, url: string | null): string {
  if (source) {
    const s = source.toLowerCase();
    if (s.includes('resident') || s.includes('ra')) return 'RA';
    if (s.includes('skiddle')) return 'Skiddle';
    if (s.includes('dice')) return 'DICE';
    if (s.includes('fatsoma')) return 'Fatsoma';
    if (s.includes('eventbrite')) return 'Eventbrite';
    if (s.includes('fixr')) return 'Fixr';
    return source;
  }
  if (url) {
    if (url.includes('ra.co')) return 'RA';
    if (url.includes('skiddle')) return 'Skiddle';
    if (url.includes('dice')) return 'DICE';
    if (url.includes('fatsoma')) return 'Fatsoma';
    if (url.includes('eventbrite')) return 'Eventbrite';
    if (url.includes('fixr')) return 'Fixr';
  }
  return '';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const mapRef = useRef<HTMLDivElement>(null);

  const [event, setEvent] = useState<Event | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<RelatedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // ============================================================================
  // LOAD DATA
  // ============================================================================

  useEffect(() => {
    async function loadEvent() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*, venue:venues(*), brand:brands(*)')
          .eq('id', eventId)
          .single();

        if (eventError) throw eventError;

        // Handle array wrapping from Supabase joins
        const cleaned: Event = {
          ...eventData,
          venue: Array.isArray(eventData.venue) ? eventData.venue[0] || null : eventData.venue,
          brand: Array.isArray(eventData.brand) ? eventData.brand[0] || null : eventData.brand,
        } as unknown as Event;

        setEvent(cleaned);

        // Track view
        if (cleaned) {
          await trackEventView(
            cleaned.id,
            cleaned.title,
            cleaned.venue?.name || 'Unknown Venue',
            cleaned.venue_id || 'unknown',
            cleaned.genres?.split(',')[0] || 'unknown',
            cleaned.genres || 'Unknown',
            'direct',
            'Sounded Out',
            cleaned.start_time || new Date().toISOString(),
            cleaned.price_min || 0,
            cleaned.event_url || '',
            'event_page'
          );
        }

        // Check saved
        if (currentUser && cleaned) {
          const { data: savedData } = await supabase
            .from('saved_events')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('event_id', cleaned.id)
            .single();
          setIsSaved(!!savedData);
        }

        // Load related events at same venue
        if (cleaned.venue_id) {
          const { data: related } = await supabase
            .from('events')
            .select('id, title, start_time, genres')
            .eq('venue_id', cleaned.venue_id)
            .eq('status', 'published')
            .neq('id', cleaned.id)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(4);

          if (related) {
            const r: RelatedEvent[] = [];
            for (let i = 0; i < related.length; i++) {
              r.push(related[i] as unknown as RelatedEvent);
            }
            setRelatedEvents(r);
          }
        }
      } catch (error) {
        // log stripped;
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [eventId]);

  // ============================================================================
  // MAP
  // ============================================================================

  useEffect(() => {
    if (!event?.venue || mapReady) return;

    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [event.venue!.lng, event.venue!.lat],
        zoom: 15,
        interactive: false,
      });

      new mapboxgl.Marker({ color: '#ab67f7' })
        .setLngLat([event.venue!.lng, event.venue!.lat])
        .addTo(map);

      setMapReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [event, mapReady]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  async function handleSaveToggle() {
    if (!user) { router.push('/login'); return; }
    if (!event) return;

    if (isSaved) {
      await supabase.from('saved_events').delete().eq('user_id', user.id).eq('event_id', event.id);
      setIsSaved(false);
      await trackEventUnsave(event.id, event.title);
    } else {
      await supabase.from('saved_events').insert({ user_id: user.id, event_id: event.id });
      setIsSaved(true);
      await trackEventSave(event.id, event.title);
    }
  }

  async function handleShare() {
    if (!event) return;
    const url = window.location.href;
    const text = event.title + ' at ' + (event.venue?.name || '') + ' \uD83C\uDFB5';

    await trackEventShare(event.id, event.title, 'native', url);

    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: text, url: url });
      } catch (e) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }

  async function handleTicketClick() {
    if (!event || !event.event_url) return;
    await trackTicketClick(
      event.id, event.title, event.venue?.name || 'Unknown Venue',
      event.venue_id || 'unknown', event.genres?.split(',')[0] || 'unknown',
      event.genres || 'Unknown', 'event_page', 'Sounded Out',
      event.start_time || new Date().toISOString(), event.price_min || 0,
      event.event_url || '', 'ticket_button'
    );
    window.open(event.event_url, '_blank');
  }

  async function handleDirectionsClick() {
    if (!event?.venue) return;
    await trackDirectionsClick(event.id, event.venue_id, event.venue.name);
    window.open('https://www.google.com/maps/dir/?api=1&destination=' + event.venue.lat + ',' + event.venue.lng, '_blank');
  }

  async function handleClaim() {
    if (!event) return;
    await trackClaimStarted('event', event.id, event.title);
    router.push('/portal');
  }

  // ============================================================================
  // LOADING / NOT FOUND
  // ============================================================================

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(171,103,247,0.2)', borderTopColor: '#ab67f7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: '16px' }}>
        <p style={{ fontSize: '16px', fontWeight: 600 }}>Event not found</p>
        <button onClick={() => router.push('/')} style={{ padding: '12px 24px', background: '#ab67f7', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
          Back to Map
        </button>
      </div>
    );
  }

  // ============================================================================
  // DERIVED
  // ============================================================================

  const dateLabel = getDateLabel(event.start_time);
  const startTime = getTime(event.start_time);
  const endTime = event.end_time ? getTime(event.end_time) : null;
  const timeString = dateLabel + ' \u00B7 ' + startTime + (endTime ? ' \u2013 ' + endTime : '');
  const priceString = formatPrice(event.price_min, event.price_max, event.price_type);
  const ticketSource = getTicketSourceLabel(event.ticket_source || null, event.event_url);
  const isFree = priceString === 'Free Entry';

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: '#fff' }}>

      {/* ── HERO IMAGE WITH FADE ── */}
      <div style={{ position: 'relative', width: '100%', height: '420px', overflow: 'hidden' }}>
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(171,103,247,0.3) 0%, rgba(20,20,22,1) 100%)' }} />
        )}
        {/* Gradient fade to black */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '200px', background: 'linear-gradient(transparent, #0a0a0b)' }} />

        {/* Back button */}
        <button onClick={() => window.history.length > 1 ? router.back() : router.push('/')} style={{ position: 'absolute', top: '16px', left: '16px', padding: '8px 16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          Back
        </button>

        {/* Ticket source badge */}
        {ticketSource && (
          <div style={{ position: 'absolute', top: '16px', right: '16px', padding: '6px 12px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '11px', fontWeight: 700, color: '#fff', zIndex: 10, display: 'flex', alignItems: 'center', gap: '4px' }}>
            🎫 {ticketSource}
          </div>
        )}

        {/* SO Pick / Sold Out badges */}
        <div style={{ position: 'absolute', bottom: '80px', left: '20px', display: 'flex', gap: '8px', zIndex: 10 }}>
          {event.so_pick && (
            <span style={{ padding: '4px 10px', background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '12px', fontSize: '11px', fontWeight: 700, color: '#22c55e' }}>SO PICK</span>
          )}
          {event.sold_out && (
            <span style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '12px', fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>SOLD OUT</span>
          )}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 20px 40px' }}>

        {/* Date/Time */}
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#ab67f7', letterSpacing: '0.5px', marginBottom: '10px' }}>
          {timeString}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1.15, marginBottom: '10px', letterSpacing: '-0.5px' }}>
          {event.title}
        </h1>

        {/* Venue link */}
        {event.venue && (
          <button onClick={() => router.push('/venue/' + event.venue!.id)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '15px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
            <span>📍</span>
            <span>{event.venue.name}</span>
            <span style={{ color: '#6b7280' }}>→</span>
          </button>
        )}

        {/* Brand */}
        {event.brand && (
          <button onClick={() => router.push('/brand/' + event.brand!.slug)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            {event.brand.logo_url && (
              <img src={event.brand.logo_url} alt={event.brand.name} style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }} />
            )}
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>
              by <strong style={{ color: '#ab67f7' }}>{event.brand.name}</strong>
              {event.brand.is_verified && <span style={{ marginLeft: '4px', color: '#ab67f7' }}>✓</span>}
            </span>
          </button>
        )}

        {/* Genre tags */}
        {event.genres && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {event.genres.split(',').map((g: string, i: number) => (
              <span key={i} style={{ padding: '5px 12px', background: 'rgba(171,103,247,0.08)', border: '1px solid rgba(171,103,247,0.2)', borderRadius: '16px', fontSize: '12px', fontWeight: 500, color: '#ab67f7' }}>
                {g.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{ padding: '6px 14px', background: isFree ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', border: isFree ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: isFree ? '#22c55e' : '#ab67f7' }}>
            {priceString}
          </span>
        </div>

        {/* Description */}
        {event.description && (
          <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#b0b0b0', marginBottom: '28px', whiteSpace: 'pre-wrap' }}>
            {event.description}
          </p>
        )}

        {/* ── GET TICKETS CTA ── */}
        {event.event_url && (
          <button onClick={handleTicketClick} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #ab67f7 0%, #8b44e0 100%)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 32px rgba(171,103,247,0.3)', letterSpacing: '0.3px' }}>
            Get Tickets
            {ticketSource && (
              <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px', fontSize: '11px', fontWeight: 600 }}>via {ticketSource}</span>
            )}
          </button>
        )}

        {/* ── ACTION ROW ── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          <button onClick={handleSaveToggle} style={{ flex: 1, padding: '12px', background: isSaved ? 'rgba(171,103,247,0.12)' : 'rgba(255,255,255,0.04)', border: isSaved ? '1px solid rgba(171,103,247,0.3)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: isSaved ? '#ab67f7' : '#e5e7eb', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {isSaved ? '💜' : '🤍'} {isSaved ? 'Saved' : 'Save'}
          </button>
          <button onClick={handleShare} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#e5e7eb', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            🪩 {copySuccess ? 'Copied!' : 'Share'}
          </button>
          <button onClick={handleDirectionsClick} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#e5e7eb', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            🗺️ Directions
          </button>
        </div>

        {/* ── VENUE CARD ── */}
        {event.venue && (
          <div style={{ marginBottom: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 16px 12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', letterSpacing: '0.5px', marginBottom: '10px' }}>VENUE</div>
              <button onClick={() => router.push('/venue/' + event.venue!.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(171,103,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📍</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{event.venue.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{event.venue.address}</div>
                  </div>
                </div>
                <span style={{ color: '#6b7280', fontSize: '18px' }}>→</span>
              </button>
            </div>
            {/* Mini map */}
            <div ref={mapRef} style={{ width: '100%', height: '160px' }} />
          </div>
        )}

        {/* ── CLAIM / ORGANIZER CTA ── */}
        <div style={{ marginBottom: '24px', padding: '20px', background: 'rgba(171,103,247,0.04)', border: '1px solid rgba(171,103,247,0.12)', borderRadius: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#ab67f7', marginBottom: '4px' }}>Are you the organizer?</p>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '14px' }}>Verify & manage this event to get a Verified badge.</p>
          <button onClick={handleClaim} style={{ padding: '10px 20px', background: 'none', border: '1px solid rgba(171,103,247,0.3)', borderRadius: '10px', color: '#ab67f7', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Verify & Manage →
          </button>
        </div>

        {/* ── MORE AT VENUE ── */}
        {relatedEvents.length > 0 && event.venue && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', letterSpacing: '0.5px', marginBottom: '12px' }}>
              MORE AT {event.venue.name.toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
              {relatedEvents.map((re: RelatedEvent) => (
                <button key={re.id} onClick={() => router.push('/event/' + re.id)} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: 'none', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#ab67f7', minWidth: '42px' }}>{getTime(re.start_time)}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{re.title}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{getRelatedDateLabel(re.start_time)}</div>
                  </div>
                  <span style={{ color: '#6b7280', fontSize: '16px' }}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
