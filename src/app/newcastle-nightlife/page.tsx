'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

// ============================================================================
// NEWCASTLE NIGHTLIFE - £500K Mobile-First Premium Landing
// Psychology: Social proof, urgency, curation, cultural credibility
// Design: Editorial typography, vertical rhythm, purposeful motion
// ============================================================================

type Event = {
  id: string
  name: string
  start_time: string
  venue_id: string
  genres?: string
  is_so_pick?: boolean
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

  // Trigger animations after mount
  useEffect(() => {
    setMounted(true)
    // Force scroll unlock
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
    document.body.style.position = ''
  }, [])

  // Load data
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
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { 
          scroll-behavior: smooth;
          -webkit-text-size-adjust: 100%;
        }
        body { 
          background: #000; 
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
          line-height: 1.5;
        }
        
        /* Typography scale - mobile first */
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
        .body-lg {
          font-size: clamp(1rem, 3vw, 1.25rem);
          line-height: 1.6;
        }
        .body-md {
          font-size: clamp(0.9rem, 2.5vw, 1rem);
          line-height: 1.6;
        }
        .caption {
          font-size: 0.75rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-weight: 600;
        }
        
        /* Animations */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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
        
        .animate-fade-up {
          opacity: 0;
          animation: fadeUp 0.6s ease-out forwards;
        }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }
        .delay-5 { animation-delay: 0.5s; }
        
        /* Horizontal scroll container */
        .scroll-x {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          padding: 4px;
          margin: 0 -20px;
          padding-left: 20px;
          padding-right: 20px;
        }
        .scroll-x::-webkit-scrollbar { display: none; }
        .scroll-x > * { scroll-snap-align: start; flex-shrink: 0; }
        
        /* Card styles */
        .card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          transition: all 0.2s ease;
        }
        .card:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.12);
        }
        
        /* Button styles */
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
        .btn-primary:hover {
          background: #9b4de8;
          transform: translateY(-1px);
        }
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
        .btn-secondary:hover {
          background: rgba(255,255,255,0.1);
        }
        
        /* Section spacing */
        .section {
          padding: 80px 20px;
        }
        @media (min-width: 768px) {
          .section { padding: 120px 40px; }
        }
        
        /* Container */
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        /* Accent color */
        .text-accent { color: #ab67f7; }
        .bg-accent { background: #ab67f7; }
        
        /* Muted text */
        .text-muted { color: rgba(255,255,255,0.5); }
        .text-muted-2 { color: rgba(255,255,255,0.3); }
        
        /* FAQ */
        details summary { cursor: pointer; list-style: none; }
        details summary::-webkit-details-marker { display: none; }
        
        /* Focus states */
        a:focus-visible, button:focus-visible {
          outline: 2px solid #ab67f7;
          outline-offset: 2px;
        }
      `}</style>

      {/* ===== NAV ===== */}
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

      {/* ===== HERO ===== */}
      <section style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '100px 20px 60px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '150%',
          maxWidth: '800px',
          aspectRatio: '1',
          background: 'radial-gradient(circle, rgba(171,103,247,0.12) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          {/* Live badge */}
          <div 
            className={mounted ? 'animate-fade-up' : ''}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              background: 'rgba(171,103,247,0.1)',
              border: '1px solid rgba(171,103,247,0.2)',
              borderRadius: '100px',
              marginBottom: '24px',
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              background: '#22c55e',
              borderRadius: '50%',
              animation: 'pulse 2s infinite',
            }} />
            <span className="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {loading ? 'Loading...' : `${stats.tonight + stats.tomorrow} events this week`}
            </span>
          </div>

          {/* Headline */}
          <h1 
            className={`headline-xl ${mounted ? 'animate-fade-up delay-1' : ''}`}
            style={{ marginBottom: '20px' }}
          >
            The new way to
            <br />
            <span className="text-accent">find your night</span>
          </h1>

          {/* Subheadline */}
          <p 
            className={`body-lg text-muted ${mounted ? 'animate-fade-up delay-2' : ''}`}
            style={{ maxWidth: '500px', marginBottom: '32px' }}
          >
            Every club, DJ set, and late-night venue in Newcastle. 
            Curated daily by people who actually go out.
          </p>

          {/* CTAs */}
          <div 
            className={mounted ? 'animate-fade-up delay-3' : ''}
            style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '48px' }}
          >
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

          {/* Stats */}
          <div 
            className={mounted ? 'animate-fade-up delay-4' : ''}
            style={{
              display: 'flex',
              gap: '32px',
              paddingTop: '32px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
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

      {/* ===== EVENTS CAROUSEL ===== */}
      <section id="events" style={{ padding: '40px 0', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ padding: '0 20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="headline-md">Coming up</h2>
            <Link href="/" style={{ color: '#ab67f7', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
        </div>
        
        <div className="scroll-x">
          {stats.events.length > 0 ? stats.events.slice(0, 8).map((event, i) => (
            <Link
              key={event.id}
              href="/"
              className="card"
              style={{
                width: '260px',
                padding: '20px',
                textDecoration: 'none',
                color: 'inherit',
                animation: mounted ? `slideIn 0.4s ease-out ${i * 0.05}s forwards` : 'none',
                opacity: mounted ? 0 : 1,
              }}
            >
              {event.is_so_pick && (
                <div style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  background: 'rgba(171,103,247,0.15)',
                  borderRadius: '6px',
                  marginBottom: '12px',
                }}>
                  <span className="caption" style={{ color: '#ab67f7', letterSpacing: '0.02em' }}>SO Pick</span>
                </div>
              )}
              <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '6px' }}>{event.name}</div>
              <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '8px' }}>
                {event.venue?.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#ab67f7' }}>
                {formatDate(event.start_time)} • {formatTime(event.start_time)}
              </div>
            </Link>
          )) : (
            // Skeleton cards
            [...Array(4)].map((_, i) => (
              <div key={i} className="card" style={{ width: '260px', padding: '20px' }}>
                <div style={{ height: '20px', width: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '12px' }} />
                <div style={{ height: '20px', width: '180px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '8px' }} />
                <div style={{ height: '16px', width: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
              </div>
            ))
          )}
        </div>
      </section>

      {/* ===== VALUE PROPS ===== */}
      <section className="section" style={{ background: '#000' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 className="headline-lg" style={{ marginBottom: '16px' }}>
              Built for people who
              <br />
              <span className="text-accent">care about their nights</span>
            </h2>
            <p className="body-md text-muted" style={{ maxWidth: '480px', margin: '0 auto' }}>
              Not another event aggregator. A curated guide to what&apos;s actually worth going to.
            </p>
          </div>

          {/* Value prop cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {[
              {
                icon: '◉',
                title: 'Live map',
                desc: 'Every venue, every event, in real-time. Filter by genre, date, or vibe.',
                accent: true,
              },
              {
                icon: '✦',
                title: 'SO Picks',
                desc: 'Events worth going to. Not paid placements — genuine recommendations.',
                accent: false,
              },
              {
                icon: '↻',
                title: 'Updated daily',
                desc: 'New events added as they\'re announced. Nothing stale, nothing missed.',
                accent: false,
              },
              {
                icon: '♫',
                title: 'Filter by sound',
                desc: 'Techno, house, DnB, disco — find exactly what you\'re in the mood for.',
                accent: false,
              },
            ].map((item) => (
              <div 
                key={item.title}
                className="card"
                style={{
                  padding: '28px',
                  background: item.accent ? 'linear-gradient(135deg, rgba(171,103,247,0.1) 0%, rgba(171,103,247,0.02) 100%)' : undefined,
                  borderColor: item.accent ? 'rgba(171,103,247,0.2)' : undefined,
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: item.accent ? 'rgba(171,103,247,0.2)' : 'rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  fontSize: '18px',
                  color: item.accent ? '#ab67f7' : '#fff',
                }}>
                  {item.icon}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>{item.title}</h3>
                <p className="body-md text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ABOUT / SEO ===== */}
      <section className="section" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="container" style={{ maxWidth: '700px' }}>
          <h2 className="headline-lg" style={{ textAlign: 'center', marginBottom: '32px' }}>
            What is Sounded Out?
          </h2>
          <div className="body-md text-muted" style={{ lineHeight: 1.8 }}>
            <p style={{ marginBottom: '20px' }}>
              <strong style={{ color: '#fff' }}>Sounded Out is Newcastle&apos;s live nightlife map.</strong> We show what&apos;s actually happening tonight — clubs, DJ events, live music, and late-night venues — updated daily.
            </p>
            <p style={{ marginBottom: '20px' }}>
              Stop scrolling through Instagram stories. Stop asking group chats &quot;what&apos;s on?&quot;. Just open the map and see everything in one place — with prices, times, and honest recommendations.
            </p>
            <p className="text-muted-2">
              Built in Newcastle. Used by thousands. Free forever.
            </p>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="section" style={{ background: '#000' }}>
        <div className="container" style={{ maxWidth: '600px' }}>
          <h2 className="headline-lg" style={{ textAlign: 'center', marginBottom: '40px' }}>
            FAQ
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { q: "What's on in Newcastle tonight?", a: "Sounded Out shows all live clubs, DJ events, and venues happening tonight. Updated daily with events from techno and house to drum and bass and indie." },
              { q: "Is Sounded Out free?", a: "Yes, completely free. No account needed. Just open the map." },
              { q: "What are SO Picks?", a: "Events we think stand out — for the music, atmosphere, or community. Not paid placements." },
              { q: "How often is it updated?", a: "Daily. New events added as announced, old ones removed automatically." },
            ].map((faq, i) => (
              <details key={i} className="card" style={{ borderRadius: '12px' }}>
                <summary style={{
                  padding: '20px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  {faq.q}
                  <span className="text-accent" style={{ fontSize: '1.25rem' }}>+</span>
                </summary>
                <div className="body-md text-muted" style={{ padding: '0 20px 20px', lineHeight: 1.7 }}>
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="section" style={{
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: '100px',
        paddingBottom: '100px',
      }}>
        {/* Glow */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: '500px',
          aspectRatio: '1',
          background: 'radial-gradient(circle, rgba(171,103,247,0.15) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

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

      {/* ===== FOOTER ===== */}
      <footer style={{
        padding: '40px 20px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
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
            <a href="https://instagram.com/sounded.out" target="_blank" rel="noopener noreferrer" className="text-muted" style={{ fontSize: '0.875rem', textDecoration: 'none' }}>Instagram</a>
          </div>
          <p className="text-muted-2" style={{ fontSize: '0.75rem' }}>
            © {new Date().getFullYear()} Sounded Out. Newcastle&apos;s live nightlife map.
          </p>
        </div>
      </footer>
    </>
  )
}
