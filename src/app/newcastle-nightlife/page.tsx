'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

// ============================================================================
// NEWCASTLE NIGHTLIFE - £500K Mobile-First Premium Landing
// Updates: Fixed event carousel, ambient floating orbs
// ============================================================================

type Event = {
  id: string
  name: string
  title?: string
  start_time: string
  venue_id: string
  genres?: string
  is_so_pick?: boolean
  so_pick?: boolean
  venue?: { id: string; name: string }
}

type Stats = {
  tonight: number
  tomorrow: number
  weekend: number
  venues: number
  events: Event[]
}

export default function NewcastleNightlifePage() {
  const [stats, setStats] = useState<Stats>({ tonight: 0, tomorrow: 0, weekend: 0, venues: 0, events: [] })
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [activeCard, setActiveCard] = useState<number | null>(null)
  const [showContact, setShowContact] = useState(false)
  const [copied, setCopied] = useState(false)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  const EMAIL = 'oliver@soundedout.com'
  const WHATSAPP = '447584426424'

  useEffect(() => {
    setMounted(true)
    const html = document.documentElement
    const body = document.body
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
    }
    html.style.overflow = 'auto'
    body.style.overflow = 'auto'
    return () => {
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = cardRefs.current.findIndex((ref) => ref === entry.target)
            if (index !== -1) setActiveCard(index)
          }
        })
      },
      { threshold: 0.7, rootMargin: '-20% 0px -20% 0px' }
    )

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [mounted])

  useEffect(() => {
    async function load() {
      try {
        const now = new Date()
        const today = now.toISOString().split('T')[0]
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]

        const { data: events } = await supabase
          .from('events')
          .select('*, venue:venues(*)')
          .eq('status', 'published')
          .gte('start_time', today)
          .order('start_time')
          .limit(20)

        if (events) {
          const friday = new Date(now)
          const day = friday.getDay()
          if (day < 5) friday.setDate(friday.getDate() + (5 - day))
          friday.setHours(0, 0, 0, 0)
          const sunday = new Date(friday)
          sunday.setDate(friday.getDate() + 2)
          sunday.setHours(23, 59, 59)

          setStats({
            tonight: events.filter((e: Event) => e.start_time.startsWith(today)).length,
            tomorrow: events.filter((e: Event) => e.start_time.startsWith(tomorrowStr)).length,
            weekend: events.filter((e: Event) => {
              const d = new Date(e.start_time)
              return d >= friday && d <= sunday
            }).length,
            venues: new Set(events.map((e: Event) => e.venue_id)).size,
            events: events as Event[],
          })
        }
      } catch (e) { // log stripped }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  
  // Get event title (handles both 'title' and 'name' fields)
  const getEventTitle = (e: Event) => e.title || e.name || 'Untitled Event'
  
  // Get first 2 genres as pills
  const getGenrePills = (genres: string | undefined) => {
    if (!genres) return []
    return genres.split(',').map(g => g.trim()).filter(Boolean).slice(0, 2)
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = EMAIL
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const valueProps = [
    { icon: '◉', title: 'Live map', desc: 'Every venue, every event, plotted in real-time. Filter by genre, date, or vibe. See exactly what\'s happening across Newcastle tonight.' },
    { icon: '✦', title: 'SO Picks', desc: 'Events we think stand out — for the music, the atmosphere, or the community. Not paid placements. Just genuine recommendations from people who go out.' },
    { icon: '↻', title: 'Updated daily', desc: 'New events added as they\'re announced. Past events removed automatically. Nothing stale, nothing missed, always current.' },
    { icon: '♫', title: 'Filter by sound', desc: 'Techno, house, drum and bass, disco, indie, R&B — find exactly what you\'re in the mood for. Your music, your night.' },
  ]

  // Floating Orb component
  const FloatingOrb = ({ size, top, left, delay, duration, color }: { 
    size: number, top: string, left: string, delay: number, duration: number, color: string 
  }) => (
    <div style={{
      position: 'absolute',
      width: `${size}px`,
      height: `${size}px`,
      top,
      left,
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      borderRadius: '50%',
      filter: 'blur(40px)',
      opacity: 0.6,
      animation: `floatOrb ${duration}s ease-in-out ${delay}s infinite`,
      pointerEvents: 'none',
    }} />
  )

  return (
    <>
      <style>{`
        html, body { height: auto !important; overflow: auto !important; }
        body { position: static !important; }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
        body { 
          background: #000; 
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
          line-height: 1.5;
        }

        .headline-xl {
          font-size: clamp(2.5rem, 12vw, 5.5rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 0.95;
        }
        .headline-lg {
          font-size: clamp(1.75rem, 6vw, 3rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .headline-md {
          font-size: clamp(1.25rem, 4vw, 1.75rem);
          font-weight: 600;
          letter-spacing: -0.01em;
        }
        .body-lg { font-size: clamp(1rem, 3vw, 1.25rem); line-height: 1.6; }
        .body-md { font-size: clamp(0.9rem, 2.5vw, 1rem); line-height: 1.6; }
        .caption { font-size: 0.75rem; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 600; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(171,103,247,0.3); }
          50% { box-shadow: 0 0 40px rgba(171,103,247,0.5); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes floatOrb {
          0%, 100% { 
            transform: translate(0, 0) scale(1); 
            opacity: 0.4;
          }
          25% { 
            transform: translate(30px, -20px) scale(1.1); 
            opacity: 0.6;
          }
          50% { 
            transform: translate(-20px, 30px) scale(0.9); 
            opacity: 0.5;
          }
          75% { 
            transform: translate(20px, 20px) scale(1.05); 
            opacity: 0.7;
          }
        }
        @keyframes floatOrbSlow {
          0%, 100% { 
            transform: translate(0, 0) rotate(0deg); 
            opacity: 0.3;
          }
          33% { 
            transform: translate(50px, -30px) rotate(120deg); 
            opacity: 0.5;
          }
          66% { 
            transform: translate(-30px, 40px) rotate(240deg); 
            opacity: 0.4;
          }
        }

        .animate-fade-up { opacity: 0; animation: fadeUp 0.6s ease-out forwards; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }

        .scroll-x {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          padding: 8px 0;
        }
        .scroll-x::-webkit-scrollbar { display: none; }
        .scroll-x > * { scroll-snap-align: start; flex-shrink: 0; }

        .card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          transition: all 0.3s ease;
        }
        .card:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.12);
        }

        .value-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          transition: all 0.4s ease;
          cursor: pointer;
        }
        .value-card:hover, .value-card.active {
          background: linear-gradient(135deg, rgba(171,103,247,0.15) 0%, rgba(171,103,247,0.05) 100%);
          border-color: rgba(171,103,247,0.3);
        }
        .value-card:hover .value-icon, .value-card.active .value-icon {
          background: rgba(171,103,247,0.25);
          color: #ab67f7;
        }
        .value-card:hover .value-title, .value-card.active .value-title {
          color: #ab67f7;
        }

        .value-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.06);
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 20px;
          color: #fff;
          transition: all 0.3s ease;
        }
        .value-title {
          transition: color 0.3s ease;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 28px;
          background: #ab67f7;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-primary:hover { background: #9b4de8; transform: translateY(-1px); }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 28px;
          background: rgba(255,255,255,0.06);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-secondary:hover { background: rgba(255,255,255,0.1); }

        .section { padding: 80px 20px; position: relative; overflow: hidden; }
        @media (min-width: 768px) { .section { padding: 120px 40px; } }

        .container { max-width: 1200px; margin: 0 auto; position: relative; z-index: 1; }

        .text-accent { color: #ab67f7; }
        .text-muted { color: rgba(255,255,255,0.5); }
        .text-muted-2 { color: rgba(255,255,255,0.3); }

        details summary { cursor: pointer; list-style: none; }
        details summary::-webkit-details-marker { display: none; }

        .event-card {
          width: 300px;
          padding: 20px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .event-card:hover {
          background: rgba(171,103,247,0.08);
          border-color: rgba(171,103,247,0.2);
          transform: translateY(-2px);
        }

        .genre-pill {
          display: inline-block;
          padding: 4px 10px;
          background: rgba(34, 211, 238, 0.1);
          border: 1px solid rgba(34, 211, 238, 0.2);
          border-radius: 100px;
          font-size: 0.7rem;
          font-weight: 600;
          color: #22d3ee;
          text-transform: lowercase;
        }

        a:focus-visible, button:focus-visible {
          outline: 2px solid #ab67f7;
          outline-offset: 2px;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }
        .modal-content {
          background: #111;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 32px;
          max-width: 400px;
          width: 100%;
          animation: scaleIn 0.2s ease-out;
        }
        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 24px;
          cursor: pointer;
          padding: 8px;
          line-height: 1;
        }
        .modal-close:hover { color: #fff; }

        .contact-option {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          text-align: left;
          color: #fff;
          text-decoration: none;
        }
        .contact-option:hover {
          background: rgba(171,103,247,0.1);
          border-color: rgba(171,103,247,0.2);
        }
        .contact-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.06);
          border-radius: 10px;
          font-size: 20px;
        }

        .ambient-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }
      `}</style>

      {/* Contact Modal */}
      {showContact && (
        <div className="modal-overlay" onClick={() => setShowContact(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
            <button className="modal-close" onClick={() => setShowContact(false)}>×</button>
            
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Get in touch</h3>
            <p className="text-muted" style={{ marginBottom: '24px' }}>Choose how you&apos;d like to contact us</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="contact-option" onClick={copyEmail}>
                <div className="contact-icon">✉️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                    {copied ? 'Copied!' : 'Copy email'}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>{EMAIL}</div>
                </div>
                <span style={{ color: '#ab67f7', fontSize: '0.875rem' }}>
                  {copied ? '✓' : 'Copy'}
                </span>
              </button>

              <a href={`mailto:${EMAIL}`} className="contact-option">
                <div className="contact-icon">📧</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '2px' }}>Open email app</div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>Opens your default mail client</div>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>→</span>
              </a>

              <a 
                href={`https://wa.me/${WHATSAPP}?text=Hi%20Oliver%2C%20I%27m%20interested%20in%20Sounded%20Out`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="contact-option"
              >
                <div className="contact-icon">💬</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '2px' }}>WhatsApp</div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>Message on WhatsApp</div>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>→</span>
              </a>
            </div>
          </div>
        </div>
      )}

      <div style={{ minHeight: '100dvh', overflowX: 'hidden' }}>
        {/* NAV */}
        <nav style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '16px 20px',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/" aria-label="Sounded Out Home">
              <img src="/logo.svg" alt="Sounded Out" style={{ height: '24px' }} />
            </Link>
            <Link href="/" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.875rem' }}>
              Open Map
            </Link>
          </div>
        </nav>

        {/* HERO */}
        <section style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '100px 20px 60px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Ambient background orbs */}
          <div className="ambient-bg">
            <FloatingOrb size={400} top="-10%" left="60%" delay={0} duration={20} color="rgba(171,103,247,0.15)" />
            <FloatingOrb size={300} top="60%" left="-10%" delay={2} duration={25} color="rgba(171,103,247,0.1)" />
            <FloatingOrb size={200} top="30%" left="80%" delay={5} duration={18} color="rgba(34,211,238,0.08)" />
            <FloatingOrb size={150} top="70%" left="70%" delay={8} duration={22} color="rgba(171,103,247,0.12)" />
          </div>

          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <div className={mounted ? 'animate-fade-up' : ''} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              background: 'rgba(171,103,247,0.1)',
              border: '1px solid rgba(171,103,247,0.2)',
              borderRadius: '100px',
              marginBottom: '24px',
            }}>
              <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
              <span className="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {loading ? 'Loading...' : `${stats.tonight + stats.tomorrow} events this week`}
              </span>
            </div>

            <h1 className={`headline-xl ${mounted ? 'animate-fade-up delay-1' : ''}`} style={{ marginBottom: '20px' }}>
              The new way to
              <br />
              <span className="text-accent">find your night</span>
            </h1>

            <p className={`body-lg text-muted ${mounted ? 'animate-fade-up delay-2' : ''}`} style={{ maxWidth: '500px', marginBottom: '32px' }}>
              Every club, DJ set, and late-night venue in Newcastle. 
              Curated daily by people who actually go out.
            </p>

            <div className={mounted ? 'animate-fade-up delay-3' : ''} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '48px' }}>
              <Link href="/" className="btn-primary" style={{ animation: 'glow 3s infinite' }}>
                Explore Tonight
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <Link href="#events" className="btn-secondary">
                See what&apos;s on
              </Link>
            </div>

            <div className={mounted ? 'animate-fade-up delay-4' : ''} style={{
              display: 'flex',
              gap: '32px',
              paddingTop: '32px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}>
              {[
                { n: stats.tonight, l: 'Tonight' },
                { n: stats.weekend, l: 'Weekend' },
                { n: stats.venues, l: 'Venues' },
              ].map((s) => (
                <div key={s.l}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ab67f7', lineHeight: 1 }}>
                    {loading ? '–' : s.n}
                  </div>
                  <div className="caption text-muted" style={{ marginTop: '4px' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* EVENTS CAROUSEL */}
        <section id="events" style={{ padding: '48px 0', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', position: 'relative', overflow: 'hidden' }}>
          {/* Subtle ambient orb */}
          <div className="ambient-bg">
            <FloatingOrb size={250} top="20%" left="90%" delay={3} duration={30} color="rgba(171,103,247,0.08)" />
          </div>
          
          <div className="container" style={{ padding: '0 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 className="headline-md" style={{ marginBottom: '4px' }}>Coming up</h2>
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>Click any event to see it on the map</p>
              </div>
              <Link href="/" style={{ color: '#ab67f7', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}>
                View all →
              </Link>
            </div>
            
            <div className="scroll-x">
              {stats.events.length > 0 ? stats.events.slice(0, 8).map((event, i) => (
                <Link
                  key={event.id}
                  href={`/?event=${event.id}`}
                  className="event-card"
                  style={{
                    animation: mounted ? `slideIn 0.4s ease-out ${i * 0.05}s forwards` : 'none',
                    opacity: mounted ? 0 : 1,
                  }}
                >
                  {/* Top row: Date + Time + SO Pick */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        padding: '5px 10px',
                        background: 'rgba(171,103,247,0.1)',
                        borderRadius: '6px',
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        color: '#ab67f7',
                        textTransform: 'uppercase',
                      }}>
                        {formatDate(event.start_time)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                        {formatTime(event.start_time)}
                      </span>
                    </div>
                    {(event.is_so_pick || event.so_pick) && (
                      <span style={{
                        padding: '4px 8px',
                        background: 'rgba(171,103,247,0.2)',
                        borderRadius: '6px',
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        color: '#ab67f7',
                        letterSpacing: '0.02em',
                      }}>
                        SO PICK
                      </span>
                    )}
                  </div>

                  {/* Event title - THE MAIN FOCUS */}
                  <h3 style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 700, 
                    lineHeight: 1.3,
                    color: '#fff',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {getEventTitle(event)}
                  </h3>

                  {/* Genre pills */}
                  {event.genres && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {getGenrePills(event.genres).map((genre, idx) => (
                        <span key={idx} className="genre-pill">{genre}</span>
                      ))}
                    </div>
                  )}

                  {/* Venue - secondary info */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    marginTop: 'auto',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>📍</span>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                      {event.venue?.name || 'Venue TBA'}
                    </span>
                  </div>
                </Link>
              )) : (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="event-card" style={{ opacity: 0.5 }}>
                    <div style={{ height: '20px', width: '120px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', marginBottom: '12px' }} />
                    <div style={{ height: '24px', width: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '8px' }} />
                    <div style={{ height: '20px', width: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', marginBottom: '12px' }} />
                    <div style={{ height: '16px', width: '140px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* VALUE PROPS */}
        <section className="section" style={{ background: '#000' }}>
          {/* Ambient orbs */}
          <div className="ambient-bg">
            <FloatingOrb size={350} top="10%" left="-5%" delay={0} duration={28} color="rgba(171,103,247,0.1)" />
            <FloatingOrb size={200} top="60%" left="85%" delay={4} duration={22} color="rgba(34,211,238,0.06)" />
          </div>
          
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <h2 className="headline-lg" style={{ marginBottom: '16px' }}>
                Built for people who
                <br />
                <span className="text-accent">care about their nights</span>
              </h2>
              <p className="body-md text-muted" style={{ maxWidth: '480px', margin: '0 auto' }}>
                Everything you need to decide, all in one place.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}>
              {valueProps.map((item, i) => (
                <div
                  key={item.title}
                  ref={(el) => { cardRefs.current[i] = el }}
                  className={`value-card ${activeCard === i ? 'active' : ''}`}
                  style={{ padding: '32px' }}
                  onMouseEnter={() => setActiveCard(i)}
                  onMouseLeave={() => setActiveCard(null)}
                  onClick={() => setActiveCard(activeCard === i ? null : i)}
                >
                  <div className="value-icon">{item.icon}</div>
                  <h3 className="value-title" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>
                    {item.title}
                  </h3>
                  <p className="body-md text-muted" style={{ lineHeight: 1.7 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ABOUT / SEO */}
        <section className="section" style={{ background: 'rgba(255,255,255,0.02)' }}>
          {/* Ambient orbs */}
          <div className="ambient-bg">
            <FloatingOrb size={300} top="50%" left="80%" delay={2} duration={25} color="rgba(171,103,247,0.1)" />
            <FloatingOrb size={180} top="20%" left="10%" delay={6} duration={20} color="rgba(171,103,247,0.08)" />
          </div>
          
          <div className="container">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '48px',
              alignItems: 'center',
            }}>
              <div>
                <span className="caption text-accent" style={{ display: 'block', marginBottom: '12px' }}>About</span>
                <h2 className="headline-lg" style={{ marginBottom: '24px' }}>
                  What is Sounded Out?
                </h2>
                <div className="body-md text-muted" style={{ lineHeight: 1.8 }}>
                  <p style={{ marginBottom: '20px' }}>
                    <strong style={{ color: '#fff' }}>Sounded Out helps you choose a good night out, without the guesswork.</strong> We bring what&apos;s happening tonight, this weekend, and beyond into one clear map. Real events, real times, and the details you actually need to decide.
                  </p>
                  <p style={{ marginBottom: '20px' }}>
                    No endless scrolling. No half-answers. Just open the map, see what's on, and go.
                  </p>
                  <p className="text-muted-2">
                    Built in Newcastle. Updated daily. Free forever.
                  </p>
                </div>
              </div>

              <div style={{
                background: 'rgba(171,103,247,0.05)',
                border: '1px solid rgba(171,103,247,0.1)',
                borderRadius: '24px',
                padding: '40px',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                  {[
                    { n: '1000+', l: 'Events listed' },
                    { n: '50+', l: 'Venues mapped' },
                    { n: 'Daily', l: 'Updates' },
                    { n: 'Free', l: 'Forever' },
                  ].map((stat) => (
                    <div key={stat.l}>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ab67f7', lineHeight: 1, marginBottom: '4px' }}>
                        {stat.n}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.875rem' }}>{stat.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOR VENUES / PROMOTERS */}
        <section className="section" style={{ background: '#000' }}>
          {/* Ambient orbs */}
          <div className="ambient-bg">
            <FloatingOrb size={250} top="30%" left="5%" delay={1} duration={24} color="rgba(171,103,247,0.1)" />
            <FloatingOrb size={200} top="70%" left="75%" delay={5} duration={28} color="rgba(34,211,238,0.05)" />
          </div>
          
          <div className="container">
            <div style={{
              background: 'linear-gradient(135deg, rgba(171,103,247,0.1) 0%, rgba(171,103,247,0.02) 100%)',
              border: '1px solid rgba(171,103,247,0.2)',
              borderRadius: '24px',
              padding: '48px 32px',
              textAlign: 'center',
            }}>
              <span className="caption text-accent" style={{ display: 'block', marginBottom: '12px' }}>For venues & promoters</span>
              <h2 className="headline-md" style={{ marginBottom: '16px', maxWidth: '500px', margin: '0 auto 16px' }}>
                Run a venue? Promote events?
              </h2>
              <p className="body-md text-muted" style={{ maxWidth: '500px', margin: '0 auto 32px' }}>
                Get your events in front of thousands of people looking for their next night out. Claim your venue, add events, or explore partnership opportunities.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/about" className="btn-primary">
                  Learn more
                </Link>
                <button onClick={() => setShowContact(true)} className="btn-secondary">
                  Get in touch
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section" style={{ background: 'rgba(255,255,255,0.02)' }}>
          {/* Ambient orbs */}
          <div className="ambient-bg">
            <FloatingOrb size={300} top="10%" left="70%" delay={3} duration={26} color="rgba(171,103,247,0.08)" />
            <FloatingOrb size={180} top="80%" left="20%" delay={7} duration={22} color="rgba(171,103,247,0.06)" />
          </div>
          
          <div className="container" style={{ maxWidth: '700px' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 className="headline-lg">Frequently Asked Questions</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { 
                  q: "What's on in Newcastle tonight?", 
                  a: "Sounded Out shows all live clubs, DJ events, and venues happening in Newcastle tonight. We update the map daily with events across every genre — techno, house, drum and bass, disco, indie, R&B, and more. Just open the map, see what's on, and find your night." 
                },
                { 
                  q: "Is Sounded Out free to use?", 
                  a: "Yes, completely free. No account needed, no sign-up required. Just open the map and start exploring. We believe everyone deserves to know what's happening in their city without barriers." 
                },
                { 
                  q: "What are SO Picks?", 
                  a: "SO Picks are events we think stand out — whether for the music, the atmosphere, the lineup, or the community. These aren't paid placements or sponsored posts. They're genuine recommendations from people who actually go to these events and know the scene." 
                },
                { 
                  q: "How often is the map updated?", 
                  a: "Daily. We add new events as soon as they're announced and automatically remove events once they've passed. Our goal is to show you exactly what's happening right now — nothing stale, nothing outdated." 
                },
                { 
                  q: "How do I get my venue or event listed?", 
                  a: "We're always looking to add great venues and events to the map. If you run a venue or promote events in Newcastle, get in touch at oliver@soundedout.com. We'll review your venue and get you set up — it's free to be listed." 
                },
                { 
                  q: "Can I claim my venue?", 
                  a: "Yes! If your venue is already on the map, you can claim it to update information, add upcoming events, and make sure everything is accurate. Contact us at oliver@soundedout.com with your venue name and we'll verify ownership." 
                },
                { 
                  q: "Do you offer sponsorship or featured placements?", 
                  a: "We're exploring ways to help venues and promoters reach more people while keeping the platform authentic. If you're interested in partnership opportunities, reach out to oliver@soundedout.com and let's talk." 
                },
                { 
                  q: "What areas does Sounded Out cover?", 
                  a: "Right now, we're focused on Newcastle and the surrounding area — including the city centre, Ouseburn, Quayside, and beyond. We're planning to expand to more cities soon." 
                },
              ].map((faq, i) => (
                <details key={i} className="card" style={{ borderRadius: '16px' }}>
                  <summary style={{
                    padding: '24px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                  }}>
                    <span>{faq.q}</span>
                    <span className="text-accent" style={{ fontSize: '1.5rem', flexShrink: 0 }}>+</span>
                  </summary>
                  <div className="body-md text-muted" style={{ padding: '0 24px 24px', lineHeight: 1.8 }}>
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="section" style={{
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          paddingTop: '100px',
          paddingBottom: '100px',
        }}>
          {/* Multiple ambient orbs for dramatic effect */}
          <div className="ambient-bg">
            <FloatingOrb size={500} top="40%" left="50%" delay={0} duration={30} color="rgba(171,103,247,0.12)" />
            <FloatingOrb size={300} top="20%" left="20%" delay={2} duration={25} color="rgba(171,103,247,0.08)" />
            <FloatingOrb size={250} top="60%" left="80%" delay={4} duration={22} color="rgba(34,211,238,0.06)" />
          </div>

          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <h2 className="headline-lg" style={{ marginBottom: '16px' }}>
              Your night out,
              <br />
              <span className="text-accent">figured out.</span>
            </h2>
            <p className="body-lg text-muted" style={{ marginBottom: '32px' }}>
              {stats.tonight > 0 ? `${stats.tonight} events happening in Newcastle tonight.` : 'See what\'s on in Newcastle tonight.'}
            </p>
            <Link href="/" className="btn-primary" style={{ animation: 'glow 3s infinite' }}>
              Open the Map
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <p className="caption text-muted-2" style={{ marginTop: '20px' }}>
              Free forever. No account needed.
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ padding: '40px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
          {/* Subtle footer orb */}
          <div className="ambient-bg">
            <FloatingOrb size={200} top="50%" left="10%" delay={0} duration={35} color="rgba(171,103,247,0.05)" />
          </div>
          
          <div className="container" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            alignItems: 'center',
            textAlign: 'center',
          }}>
            <img src="/logo.svg" alt="Sounded Out" style={{ height: '20px', opacity: 0.5 }} />
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/about" className="text-muted" style={{ fontSize: '0.875rem', textDecoration: 'none' }}>About</Link>
              <Link href="/terms" className="text-muted" style={{ fontSize: '0.875rem', textDecoration: 'none' }}>Terms</Link>
              <Link href="/privacy" className="text-muted" style={{ fontSize: '0.875rem', textDecoration: 'none' }}>Privacy</Link>
              <button 
                onClick={() => setShowContact(true)} 
                className="text-muted" 
                style={{ fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Contact
              </button>
              <a href="https://instagram.com/sounded.out" target="_blank" rel="noopener noreferrer" className="text-muted" style={{ fontSize: '0.875rem', textDecoration: 'none' }}>Instagram</a>
            </div>
            <p className="text-muted-2" style={{ fontSize: '0.75rem' }}>
              © {new Date().getFullYear()} Sounded Out. Newcastle&apos;s live nightlife map.
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
