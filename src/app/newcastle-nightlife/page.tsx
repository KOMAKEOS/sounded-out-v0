'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

// ============================================================================
// NEWCASTLE NIGHTLIFE - £200K Premium Landing Page
// Inspired by: Linear, RA, Stripe, Vercel
// Features: Floating UI, event carousel, grain texture, bento grid, animations
// ============================================================================

type Event = {
  id: string
  name: string
  start_time: string
  venue_id: string
  genres?: string
  price_pounds?: number
  is_free?: boolean
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
  const [scrollY, setScrollY] = useState(0)
  const heroRef = useRef<HTMLElement>(null)

  // Scroll listener for parallax
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Force scroll unlock
  useEffect(() => {
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflow = 'auto'
    document.documentElement.style.height = 'auto'
    document.body.style.height = 'auto'
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
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
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const formatEventDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const formatEventTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      {/* Global styles */}
      <style>{`
        * { box-sizing: border-box; }
        html, body { 
          margin: 0; padding: 0; 
          background: #000;
          overflow-x: hidden;
        }
        
        /* Grain texture overlay */
        .grain {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          z-index: 1000;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }
        
        /* Smooth scroll */
        html { scroll-behavior: smooth; }
        
        /* Animated gradient */
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        /* Float animation */
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(1deg); }
        }
        
        /* Pulse glow */
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 40px rgba(171,103,247,0.3); }
          50% { box-shadow: 0 0 80px rgba(171,103,247,0.5); }
        }
        
        /* Marquee */
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        /* Fade in up */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .fade-in { animation: fadeInUp 0.8s ease-out forwards; }
        .fade-in-delay-1 { animation-delay: 0.1s; opacity: 0; }
        .fade-in-delay-2 { animation-delay: 0.2s; opacity: 0; }
        .fade-in-delay-3 { animation-delay: 0.3s; opacity: 0; }
        .fade-in-delay-4 { animation-delay: 0.4s; opacity: 0; }
        
        /* Card hover */
        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        
        /* Button glow */
        .btn-glow {
          position: relative;
          overflow: hidden;
        }
        .btn-glow::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s ease;
        }
        .btn-glow:hover::before {
          left: 100%;
        }
      `}</style>

      {/* Grain overlay */}
      <div className="grain" />

      <div style={{ background: '#000', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh' }}>
        
        {/* ===== NAVIGATION ===== */}
        <nav style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '16px 24px',
          background: scrollY > 50 ? 'rgba(0,0,0,0.9)' : 'transparent',
          backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
          borderBottom: scrollY > 50 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <img src="/logo.svg" alt="Sounded Out" style={{ height: '28px' }} />
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <Link href="/about" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>About</Link>
              <Link href="/" className="btn-glow" style={{
                padding: '12px 24px',
                background: '#fff',
                borderRadius: '100px',
                color: '#000',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
              }}>
                Open Map
              </Link>
            </div>
          </div>
        </nav>

        {/* ===== HERO SECTION ===== */}
        <section ref={heroRef} style={{
          minHeight: '100vh',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          padding: '120px 24px 80px',
          overflow: 'hidden',
        }}>
          {/* Animated gradient background */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(171,103,247,0.15), transparent)',
            pointerEvents: 'none',
          }} />
          
          {/* Floating orb */}
          <div style={{
            position: 'absolute',
            top: '20%',
            right: '10%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(171,103,247,0.2) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            animation: 'float 8s ease-in-out infinite',
            transform: `translateY(${scrollY * 0.1}px)`,
          }} />

          <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
            {/* Left: Copy */}
            <div>
              {/* Eyebrow */}
              <div className="fade-in" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                background: 'rgba(171,103,247,0.1)',
                border: '1px solid rgba(171,103,247,0.2)',
                borderRadius: '100px',
                marginBottom: '24px',
              }}>
                <span style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>
                  LIVE NOW
                </span>
              </div>

              {/* Headline */}
              <h1 className="fade-in fade-in-delay-1" style={{
                fontSize: 'clamp(48px, 7vw, 80px)',
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: '-3px',
                margin: '0 0 24px 0',
              }}>
                The intelligent
                <br />
                <span style={{
                  background: 'linear-gradient(135deg, #ab67f7, #fff, #ab67f7)',
                  backgroundSize: '200% 200%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'gradientShift 4s ease infinite',
                }}>nightlife map</span>
              </h1>

              {/* Subheadline */}
              <p className="fade-in fade-in-delay-2" style={{
                fontSize: '18px',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.6,
                margin: '0 0 32px 0',
                maxWidth: '480px',
              }}>
                Every club, DJ set, and late-night venue in Newcastle. 
                Curated daily. No algorithms. No noise.
              </p>

              {/* CTA */}
              <div className="fade-in fade-in-delay-3" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <Link href="/" className="btn-glow" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '16px 32px',
                  background: '#ab67f7',
                  borderRadius: '12px',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  animation: 'pulseGlow 3s ease-in-out infinite',
                }}>
                  Explore Tonight
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
                <Link href="#events" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '16px 32px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: 500,
                }}>
                  See what&apos;s on
                </Link>
              </div>

              {/* Stats row */}
              <div className="fade-in fade-in-delay-4" style={{
                display: 'flex',
                gap: '32px',
                marginTop: '48px',
                paddingTop: '32px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}>
                {[
                  { value: stats.tonight, label: 'Tonight' },
                  { value: stats.weekend, label: 'This weekend' },
                  { value: stats.venues, label: 'Venues' },
                ].map((s) => (
                  <div key={s.label}>
                    <div style={{ fontSize: '32px', fontWeight: 700, color: '#ab67f7' }}>
                      {loading ? '—' : s.value}
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Floating UI mockup */}
            <div style={{ position: 'relative', height: '500px' }}>
              {/* Main card */}
              <div className="hover-lift" style={{
                position: 'absolute',
                top: '10%',
                left: '10%',
                width: '280px',
                background: 'rgba(20,20,25,0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '20px',
                animation: 'float 6s ease-in-out infinite',
                transform: `translateY(${scrollY * -0.05}px)`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div style={{
                    padding: '4px 10px',
                    background: 'rgba(171,103,247,0.2)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#ab67f7',
                  }}>
                    SO PICK
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Tonight</div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Warehouse Project</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>Digital • 23:00</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Techno</span>
                  <span style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>House</span>
                </div>
              </div>

              {/* Secondary card */}
              <div className="hover-lift" style={{
                position: 'absolute',
                top: '35%',
                right: '5%',
                width: '240px',
                background: 'rgba(20,20,25,0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '16px',
                animation: 'float 7s ease-in-out infinite',
                animationDelay: '-2s',
                transform: `translateY(${scrollY * -0.08}px)`,
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Friday Night Session</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Riverside • 22:00</div>
                <div style={{ fontSize: '11px', color: '#22c55e' }}>£8 before 11pm</div>
              </div>

              {/* Map pin indicator */}
              <div style={{
                position: 'absolute',
                bottom: '20%',
                left: '30%',
                width: '48px',
                height: '48px',
                background: '#ab67f7',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 30px rgba(171,103,247,0.5)',
                animation: 'float 5s ease-in-out infinite',
                animationDelay: '-1s',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* ===== MARQUEE EVENTS ===== */}
        <section id="events" style={{
          padding: '40px 0',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            animation: 'marquee 30s linear infinite',
            width: 'fit-content',
          }}>
            {[...stats.events, ...stats.events].map((event, i) => (
              <div key={`${event.id}-${i}`} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                padding: '0 48px',
                whiteSpace: 'nowrap',
              }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{event.name}</span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                  {event.venue?.name} • {formatEventDate(event.start_time)}
                </span>
                {event.is_so_pick && (
                  <span style={{
                    padding: '2px 8px',
                    background: 'rgba(171,103,247,0.2)',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#ab67f7',
                  }}>
                    SO PICK
                  </span>
                )}
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>◆</span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== BENTO GRID ===== */}
        <section style={{ padding: '120px 24px', background: '#000' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, letterSpacing: '-1px', margin: '0 0 16px 0' }}>
                Built for people who
                <br />
                <span style={{ color: '#ab67f7' }}>care about their nights</span>
              </h2>
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', maxWidth: '500px', margin: '0 auto' }}>
                Not another event aggregator. A curated guide to what&apos;s actually worth going to.
              </p>
            </div>

            {/* Bento grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(2, 280px)',
              gap: '16px',
            }}>
              {/* Live map - large */}
              <div className="hover-lift" style={{
                gridColumn: 'span 2',
                background: 'linear-gradient(135deg, rgba(171,103,247,0.1), rgba(20,20,25,0.8))',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#ab67f7', letterSpacing: '1px', marginBottom: '8px' }}>LIVE MAP</div>
                  <h3 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>See everything at a glance</h3>
                </div>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: '400px', position: 'relative', zIndex: 1 }}>
                  Every venue, every event, plotted in real-time. Filter by genre, date, or vibe.
                </p>
                {/* Decorative map dots */}
                <div style={{ position: 'absolute', right: '40px', bottom: '40px', opacity: 0.3 }}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} style={{
                      position: 'absolute',
                      width: '8px',
                      height: '8px',
                      background: '#ab67f7',
                      borderRadius: '50%',
                      top: `${Math.random() * 100}px`,
                      left: `${Math.random() * 100}px`,
                    }} />
                  ))}
                </div>
              </div>

              {/* SO Picks */}
              <div className="hover-lift" style={{
                background: 'rgba(20,20,25,0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#ab67f7', letterSpacing: '1px', marginBottom: '8px' }}>CURATION</div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>SO Picks</h3>
                </div>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                  Events worth going to. Not paid placements — genuine recommendations.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ padding: '4px 10px', background: 'rgba(171,103,247,0.2)', borderRadius: '6px', fontSize: '11px', fontWeight: 600, color: '#ab67f7' }}>✦ Curated</span>
                </div>
              </div>

              {/* Updated daily */}
              <div className="hover-lift" style={{
                background: 'rgba(20,20,25,0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e', letterSpacing: '1px', marginBottom: '8px' }}>FRESH</div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Updated daily</h3>
                </div>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                  New events added as they&apos;re announced. Nothing stale.
                </p>
              </div>

              {/* Genre filter */}
              <div className="hover-lift" style={{
                gridColumn: 'span 2',
                background: 'rgba(20,20,25,0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#ab67f7', letterSpacing: '1px', marginBottom: '8px' }}>FILTER</div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Find your sound</h3>
                </div>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                  Techno, house, DnB, disco, indie — filter by what you&apos;re actually in the mood for.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Techno', 'House', 'DnB', 'Disco', 'Indie', 'R&B'].map((g) => (
                    <span key={g} style={{
                      padding: '6px 12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '100px',
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.7)',
                    }}>{g}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== ABOUT / SEO ===== */}
        <section style={{ padding: '120px 24px', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-1px', margin: '0 0 16px 0' }}>
                What is Sounded Out?
              </h2>
            </div>
            <div style={{ fontSize: '17px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>
              <p style={{ marginBottom: '24px' }}>
                <strong style={{ color: '#fff' }}>Sounded Out is Newcastle&apos;s live nightlife map.</strong> We show what&apos;s actually happening tonight — clubs, DJ events, live music, and late-night venues — updated daily.
              </p>
              <p style={{ marginBottom: '24px' }}>
                Stop scrolling through Instagram stories. Stop asking group chats &quot;what&apos;s on?&quot;. Just open the map and see everything in one place — with prices, times, and honest recommendations.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>
                Built in Newcastle. Used by thousands. Free forever.
              </p>
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section style={{ padding: '120px 24px', background: '#000' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: 700, marginBottom: '48px' }}>
              Frequently Asked Questions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { q: "What's on in Newcastle tonight?", a: "Sounded Out shows all live clubs, DJ events, and venues happening tonight. Updated daily with events from techno and house to drum and bass and indie." },
                { q: "Is Sounded Out free?", a: "Yes, completely free. No account needed. Just open the map." },
                { q: "What are SO Picks?", a: "Events we think stand out — for the music, atmosphere, or community. Not paid placements." },
                { q: "How often is it updated?", a: "Daily. New events added as announced, old ones removed automatically." },
              ].map((faq, i) => (
                <details key={i} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                }}>
                  <summary style={{
                    padding: '20px 24px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#fff',
                    listStyle: 'none',
                  }}>{faq.q}</summary>
                  <div style={{ padding: '0 24px 20px', fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{faq.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section style={{
          padding: '160px 24px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Glow */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(171,103,247,0.15) 0%, transparent 60%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{
              fontSize: 'clamp(36px, 6vw, 64px)',
              fontWeight: 800,
              letterSpacing: '-2px',
              margin: '0 0 24px 0',
            }}>
              Your night out,
              <br />
              <span style={{ color: '#ab67f7' }}>figured out.</span>
            </h2>
            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)', marginBottom: '40px' }}>
              {stats.tonight > 0 ? `${stats.tonight} events happening in Newcastle tonight.` : 'See what\'s on in Newcastle tonight.'}
            </p>
            <Link href="/" className="btn-glow" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '20px 40px',
              background: '#ab67f7',
              borderRadius: '14px',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '18px',
              fontWeight: 600,
              animation: 'pulseGlow 3s ease-in-out infinite',
            }}>
              Open the Map
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <p style={{ marginTop: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
              Free forever. No account needed.
            </p>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer style={{
          padding: '48px 24px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '24px',
          }}>
            <div>
              <img src="/logo.svg" alt="Sounded Out" style={{ height: '18px', opacity: 0.5, marginBottom: '8px' }} />
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>Newcastle&apos;s live nightlife map</p>
            </div>
            <div style={{ display: 'flex', gap: '24px' }}>
              <Link href="/about" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>About</Link>
              <Link href="/terms" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>Terms</Link>
              <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>Privacy</Link>
              <a href="https://instagram.com/sounded.out" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>Instagram</a>
            </div>
          </div>
          <div style={{ maxWidth: '1200px', margin: '32px auto 0', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>© {new Date().getFullYear()} Sounded Out</p>
          </div>
        </footer>
      </div>
    </>
  )
}
