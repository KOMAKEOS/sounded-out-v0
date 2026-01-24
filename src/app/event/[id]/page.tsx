'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { UniversalShareButton, WhatsAppShareButton, StoryCardGenerator } from '@/components/viral'

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

type Venue = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  venue_type: string;
  instagram_url: string | null;
  website_url: string | null;
};

type Brand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_verified: boolean;
  tagline: string | null;
};

type Event = {
  id: string;
  venue_id: string;
  brand_id: string | null;
  title: string;
  start_time: string;
  end_time: string | null;
  genres: string | null;
  vibe: string | null;
  event_url: string | null;
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
};

// ============================================================================
// DATE FORMATTING (UK)
// ============================================================================

function formatUKDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Reset time to compare dates only
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) {
    return 'TODAY';
  } else if (date.getTime() === tomorrow.getTime()) {
    return 'TOMORROW';
  } else {
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const day = dayNames[date.getDay()];
    const dateNum = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
    return `${day} ${dateNum} ${month}`;
  }
}

function formatUKTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatPrice(priceMin: number | null, priceMax: number | null, priceType: string | null): string {
  if (priceType === 'free') return 'FREE';
  if (priceType === 'tba') return 'TBA';
  if (priceMin === null && priceMax === null) return 'TBA';
  if (priceMin === priceMax || priceMax === null) {
    return `£${priceMin?.toFixed(2)}`;
  }
  return `£${priceMin?.toFixed(2)} - £${priceMax?.toFixed(2)}`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);

  const supabase = createClient();

  // ============================================================================
  // LOAD EVENT DATA
  // ============================================================================

  useEffect(() => {
    async function loadEvent() {
      try {
        // Get current user
        const { data: { user: currentUser } } = await this.supabase.auth.getUser();
        setUser(currentUser);

        // Load event with venue and brand
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select(`
            *,
            venue:venues(*),
            brand:brands(*)
          `)
          .eq('id', eventId)
          .single();

        if (eventError) throw eventError;
        
        setEvent(eventData);

        // Track event view
        if (eventData) {
          await trackEventView(
            eventData.id,
            eventData.title,
            eventData.venue_id,
            eventData.venue?.name || 'Unknown Venue',
            'direct'
          );
        }

        // Check if saved
        if (currentUser && eventData) {
          const { data: savedData } = await supabase
            .from('saved_events')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('event_id', eventData.id)
            .single();

          setIsSaved(!!savedData);
        }
      } catch (error) {
        console.error('Error loading event:', error);
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [eventId]);

  // ============================================================================
  // INITIALIZE MAP
  // ============================================================================

  useEffect(() => {
    if (!event?.venue || mapInitialized) return;

    const mapContainer = document.getElementById('event-map');
    if (!mapContainer) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    const map = new mapboxgl.Map({
      container: 'event-map',
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [event.venue.lng, event.venue.lat],
      zoom: 15,
      interactive: false, // Static screenshot-style map
    });

    // Add venue marker
    new mapboxgl.Marker({ color: '#ab67f7' })
      .setLngLat([event.venue.lng, event.venue.lat])
      .addTo(map);

    setMapInitialized(true);

    return () => map.remove();
  }, [event, mapInitialized]);

  // ============================================================================
  // SAVE/UNSAVE EVENT
  // ============================================================================

  async function handleSaveToggle() {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!event) return;

    if (isSaved) {
      // Unsave
      await supabase
        .from('saved_events')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', event.id);

      setIsSaved(false);
      await trackEventUnsave(event.id, event.title);
    } else {
      // Save
      await supabase
        .from('saved_events')
        .insert({
          user_id: user.id,
          event_id: event.id,
        });

      setIsSaved(true);
      await trackEventSave(event.id, event.title);
    }
  }

  // ============================================================================
  // SHARE FUNCTIONS
  // ============================================================================

  async function handleShare(method: 'link' | 'whatsapp' | 'instagram' | 'twitter' | 'facebook') {
    if (!event) return;

    const shareUrl = window.location.href;
    const shareText = `Check out ${event.title} at ${event.venue?.name}! 🎵`;

    await trackEventShare(event.id, event.title, method, shareUrl);

    if (method === 'link') {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } else if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`);
    } else if (method === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`);
    } else if (method === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
    }

    setShowShareMenu(false);
  }

  // ============================================================================
  // TICKET CLICK
  // ============================================================================

  async function handleTicketClick() {
    if (!event || !event.event_url) return;

    await trackTicketClick(
      event.id,
      event.title,
      event.event_url,
      event.venue_id,
      event.venue?.name || 'Unknown Venue',
      event.price_min,
      event.event_url.includes('skiddle') ? 'skiddle' : 
      event.event_url.includes('dice') ? 'dice' : 
      event.event_url.includes('fixr') ? 'fixr' : 'other'
    );

    window.open(event.event_url, '_blank');
  }

  // ============================================================================
  // DIRECTIONS CLICK
  // ============================================================================

  async function handleDirectionsClick() {
    if (!event?.venue) return;

    await trackDirectionsClick(
      event.id,
      event.venue_id,
      event.venue.name
    );

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${event.venue.lat},${event.venue.lng}`;
    window.open(mapsUrl, '_blank');
  }

  // ============================================================================
  // CLAIM
  // ============================================================================

  async function handleClaim() {
    if (!event) return;
    
    await trackClaimStarted('event', event.id, event.title);
    
    // Navigate to claim page or show modal
    router.push(`/claim/event/${event.id}`);
  }

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#141416',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        Loading event...
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#141416',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'JetBrains Mono, monospace',
        gap: '20px',
      }}>
        <p>Event not found</p>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '12px 24px',
            background: '#ab67f7',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Back to Map
        </button>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div style={{
      minHeight: '100vh',
      background: '#141416',
      color: '#fff',
      fontFamily: 'JetBrains Mono, monospace',
      paddingBottom: '40px',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            color: '#ab67f7',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <div style={{ fontSize: '14px', fontWeight: 600 }}>SOUNDED OUT</div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
      }}>
        {/* Event Image */}
        {event.image_url && (
          <div style={{
            width: '100%',
            height: '400px',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '24px',
          }}>
            <img
              src={event.image_url}
              alt={event.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        )}

        {/* Date and Time */}
        <div style={{
          fontSize: '13px',
          color: '#ab67f7',
          fontWeight: 700,
          marginBottom: '12px',
          textTransform: 'uppercase',
        }}>
          {formatUKDate(event.start_time)} · {formatUKTime(event.start_time)}
          {event.end_time && ` - ${formatUKTime(event.end_time)}`}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          marginBottom: '12px',
          lineHeight: '1.2',
        }}>
          {event.title}
        </h1>

        {/* Brand Name (if custom event brand name) */}
        {event.brand && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}>
            {event.brand.logo_url && (
              <img
                src={event.brand.logo_url}
                alt={event.brand.name}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  objectFit: 'cover',
                }}
              />
            )}
            <span style={{ fontSize: '14px', color: '#999' }}>
              Presented by <strong style={{ color: '#fff' }}>{event.brand.name}</strong>
              {event.brand.is_verified && ' ✓'}
            </span>
          </div>
        )}

        {/* Venue Name */}
        <div style={{
          fontSize: '18px',
          color: '#ccc',
          marginBottom: '20px',
        }}>
          📍 {event.venue?.name}
        </div>

        {/* Genres and Vibes */}
        {(event.genres || event.vibe) && (
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '20px',
          }}>
            {event.genres?.split(',').map((genre, i) => (
              <span
                key={`genre-${i}`}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(171,103,247,0.1)',
                  border: '1px solid rgba(171,103,247,0.3)',
                  borderRadius: '20px',
                  fontSize: '12px',
                  color: '#ab67f7',
                }}
              >
                {genre.trim()}
              </span>
            ))}
            {event.vibe?.split(',').map((vibe, i) => (
              <span
                key={`vibe-${i}`}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px',
                  fontSize: '12px',
                  color: '#999',
                }}
              >
                {vibe.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <div style={{
          fontSize: '20px',
          fontWeight: 700,
          marginBottom: '32px',
          color: '#ab67f7',
        }}>
          {formatPrice(event.price_min, event.price_max, event.price_type)}
        </div>

        {/* Description */}
        {event.description && (
          <div style={{
            fontSize: '15px',
            lineHeight: '1.6',
            color: '#ccc',
            marginBottom: '32px',
            whiteSpace: 'pre-wrap',
          }}>
            {event.description}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '32px',
        }}>
          {/* Get Ticket */}
          {event.event_url && (
            <button
              onClick={handleTicketClick}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #ab67f7 0%, #8b4bd5 100%)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(171,103,247,0.4)',
              }}
            >
              GET TICKETS
            </button>
          )}

          {/* Secondary Actions */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}>
            {/* Save */}
            <button
              onClick={handleSaveToggle}
              style={{
                padding: '12px',
                background: isSaved ? 'rgba(171,103,247,0.2)' : 'rgba(255,255,255,0.05)',
                border: isSaved ? '1px solid rgba(171,103,247,0.5)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: isSaved ? '#ab67f7' : '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isSaved ? '💜 SAVED' : '🤍 SAVE'}
            </button>

            {/* Share */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                📤 SHARE
              </button>

              {showShareMenu && (
                <div style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  background: 'rgba(20,20,22,0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  zIndex: 100,
                }}>
                  <button
                    onClick={() => handleShare('link')}
                    style={{
                      padding: '10px',
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: '6px',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    {copySuccess ? '✓ COPIED!' : '🔗 COPY LINK'}
                  </button>
                  <button
                    onClick={() => handleShare('whatsapp')}
                    style={{
                      padding: '10px',
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: '6px',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    💬 WHATSAPP
                  </button>
                  <button
                    onClick={() => handleShare('instagram')}
                    style={{
                      padding: '10px',
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: '6px',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    📷 INSTAGRAM
                  </button>
                  <button
                    onClick={() => handleShare('twitter')}
                    style={{
                      padding: '10px',
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: '6px',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    🐦 TWITTER
                  </button>
                </div>
              )}
            </div>

            {/* Directions */}
            <button
              onClick={handleDirectionsClick}
              style={{
                padding: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🧭 DIRECTIONS
            </button>

            {/* Claim (if applicable) */}
            <button
              onClick={handleClaim}
              style={{
                padding: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⭐ CLAIM
            </button>
          </div>
        </div>

        {/* Map Screenshot */}
        {event.venue && (
          <div style={{
            marginBottom: '32px',
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 700,
              marginBottom: '12px',
            }}>
              LOCATION
            </h3>
            <div
              id="event-map"
              style={{
                width: '100%',
                height: '300px',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            />
            <div style={{
              marginTop: '8px',
              fontSize: '13px',
              color: '#999',
            }}>
              {event.venue.address}
            </div>
          </div>
        )}

        {/* Are You the Organiser? */}
        <div style={{
          padding: '20px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: '14px',
            marginBottom: '12px',
            color: '#999',
          }}>
            Are you the organiser of this event?
          </p>
          <button
            onClick={handleClaim}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: '1px solid #ab67f7',
              borderRadius: '8px',
              color: '#ab67f7',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            CLAIM THIS EVENT
          </button>
        </div>
      </div>
    </div>
  );
}
