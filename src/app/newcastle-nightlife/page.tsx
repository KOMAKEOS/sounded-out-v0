'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

// ============================================================================
// NEWCASTLE NIGHTLIFE - Premium SEO Landing Page
// Target keywords: "newcastle nightlife", "newcastle tonight", "what's on newcastle"
// ============================================================================

type EventStats = {
  tonight: number
  tomorrow: number
  weekend: number
  totalVenues: number
  genres: string[]
}

export default function NewcastleNightlifePage() {
  const [stats, setStats] = useState<EventStats>({
    tonight: 0,
    tomorrow: 0,
    weekend: 0,
    totalVenues: 0,
    genres: [],
  })
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Load live stats from database
  useEffect(() => {
    async function loadStats() {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]
      
      // Get Friday of this week
      const friday = new Date(now)
      const dayOfWeek = friday.getDay()
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7
      if (dayOfWeek >= 5) friday.setDate(friday.getDate())
      else friday.setDate(friday.getDate() + daysUntilFriday)
      friday.setHours(0, 0, 0, 0)
      
      const sunday = new Date(friday)
      sunday.setDate(friday.getDate() + (7 - friday.getDay()))
      sunday.setHours(23, 59, 59)

      // Fetch events
      const { data: events } = await supabase
        .from('events')
        .select('*, venue:venues(*)')
        .eq('status', 'published')
        .gte('start_time', today)
        .order('start_time')

      if (events) {
        const tonightCount = events.filter(e => 
          e.start_time.startsWith(today)
        ).length

        const tomorrowCount = events.filter(e => 
          e.start_time.startsWith(tomorrowStr)
        ).length

        const weekendCount = events.filter(e => {
          const d = new Date(e.start_time)
          return d >= friday && d <= sunday
        }).length

        // Count unique venues
        const uniqueVenues = new Set(events.map(e => e.venue_id))
        
        // Get unique genres
        const allGenres = new Set<string>()
        events.forEach(e => {
          if (e.genres) {
            e.genres.split(',').forEach((g: string) => allGenres.add(g.trim().toLowerCase()))
          }
        })

        setStats({
          tonight: tonightCount,
          tomorrow: tomorrowCount,
          weekend: weekendCount,
          totalVenues: uniqueVenues.size,
          genres: Array.from(allGenres).slice(0, 8),
        })
      }
      setLoading(false)
    }

    loadStats()
    
    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0b',
      color: 'white',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      {/* Animated Background Orbs */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
        <div className="orb orb4" />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        
        {/* Header */}
        <header style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <Link href="/">
            <img src="/logo.svg" alt="Sounded Out" style={{ height: '28px', cursor: 'pointer' }} />
          </Link>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ 
              fontSize: '12px', 
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                background: '#22c55e',
                borderRadius: '50%',
                animation: 'pulse 2s infinite',
              }} />
              Live
            </span>
            <Link 
              href="/"
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 700,
                boxShadow: '0 4px 20px rgba(171,103,247,0.3)',
              }}
            >
              Open Map
            </Link>
          </div>
        </header>

        {/* Hero Section - Above the fold, featured snippet optimized */}
        <section style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '60px 24px 80px',
          textAlign: 'center',
        }}>
          {/* Live timestamp - freshness signal for Google */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '20px',
            marginBottom: '24px',
            fontSize: '13px',
            color: '#888',
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              background: '#22c55e',
              borderRadius: '50%',
            }} />
            Updated {formatDate(currentTime)} at {formatTime(currentTime)}
          </div>

          {/* H1 - Primary keyword target */}
          <h1 style={{
            fontSize: 'clamp(36px, 8vw, 64px)',
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: '20px',
            background: 'linear-gradient(135deg, #ffffff 0%, #ab67f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Newcastle Nightlife Tonight
          </h1>

          {/* H2 - Secondary keywords */}
          <h2 style={{
            fontSize: 'clamp(18px, 3vw, 24px)',
            fontWeight: 500,
            color: '#888',
            marginBottom: '40px',
            maxWidth: '600px',
            margin: '0 auto 40px',
          }}>
            Live clubs, DJ events & late-night venues — updated daily
          </h2>

          {/* Featured snippet trap - bullet list format */}
          <div style={{
            background: 'rgba(20,20,22,0.8)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '500px',
            margin: '0 auto 48px',
            textAlign: 'left',
          }}>
            <p style={{ 
              fontSize: '16px', 
              color: '#ccc', 
              marginBottom: '16px',
              fontWeight: 500,
            }}>
              Looking for what's happening in Newcastle tonight?
            </p>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>Sounded Out shows:</p>
            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              {[
                'Clubs open tonight',
                'Live DJ events',
                'Late-night venues',
                'What\'s actually worth going to',
              ].map((item, i) => (
                <li key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  color: '#ab67f7',
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    background: '#ab67f7',
                    borderRadius: '50%',
                    flexShrink: 0,
                  }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Live Stats - Dynamic data from database */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '16px',
            maxWidth: '600px',
            margin: '0 auto 48px',
          }}>
            {[
              { label: 'Tonight', value: stats.tonight, href: '/?filter=today' },
              { label: 'Tomorrow', value: stats.tomorrow, href: '/?filter=tomorrow' },
              { label: 'This Weekend', value: stats.weekend, href: '/?filter=weekend' },
              { label: 'Venues', value: stats.totalVenues, href: '/' },
            ].map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                style={{
                  background: 'rgba(171,103,247,0.08)',
                  border: '1px solid rgba(171,103,247,0.2)',
                  borderRadius: '16px',
                  padding: '20px',
                  textDecoration: 'none',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(171,103,247,0.15)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(171,103,247,0.08)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#ab67f7',
                  marginBottom: '4px',
                }}>
                  {loading ? '—' : stat.value}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#888',
                  fontWeight: 500,
                }}>
                  {stat.label}
                </div>
              </Link>
            ))}
          </div>

          {/* Primary CTA */}
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '18px 40px',
              background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
              borderRadius: '16px',
              color: 'white',
              textDecoration: 'none',
              fontSize: '18px',
              fontWeight: 700,
              boxShadow: '0 8px 32px rgba(171,103,247,0.4)',
              transition: 'all 200ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(171,103,247,0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(171,103,247,0.4)'
            }}
          >
            Explore the Map
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </section>

        {/* Genre Section - Targets genre-specific searches */}
        {stats.genres.length > 0 && (
          <section style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 24px 80px',
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              Find Events By Genre
            </h3>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '10px',
            }}>
              {stats.genres.map((genre) => (
                <Link
                  key={genre}
                  href={`/?genre=${encodeURIComponent(genre)}`}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '20px',
                    color: '#888',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                    transition: 'all 200ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(171,103,247,0.15)'
                    e.currentTarget.style.borderColor = 'rgba(171,103,247,0.3)'
                    e.currentTarget.style.color = '#ab67f7'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.color = '#888'
                  }}
                >
                  {genre} Newcastle
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* What is Sounded Out - Authority section */}
        <section style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '0 24px 80px',
        }}>
          <div style={{
            background: 'rgba(20,20,22,0.6)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            padding: '40px',
          }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '16px',
            }}>
              What is Sounded Out?
            </h3>
            <p style={{
              fontSize: '16px',
              color: '#999',
              lineHeight: 1.8,
              marginBottom: '20px',
            }}>
              <strong style={{ color: '#ccc' }}>Sounded Out is Newcastle's live nightlife map.</strong> We show what's actually happening tonight — clubs, DJ events, live music, and late-night venues — updated daily.
            </p>
            <p style={{
              fontSize: '16px',
              color: '#999',
              lineHeight: 1.8,
              marginBottom: '20px',
            }}>
              No more scrolling through Instagram stories or outdated listings. Find events with clear details: what's free, what runs late, and what's genuinely worth going to.
            </p>
            <p style={{
              fontSize: '14px',
              color: '#666',
              fontStyle: 'italic',
            }}>
              Built in Newcastle. Used by thousands planning nights out across the city.
            </p>
          </div>
        </section>

        {/* FAQ Section - Targets "People Also Ask" */}
        <section style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '0 24px 80px',
        }}>
          <h3 style={{
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            Frequently Asked Questions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              {
                q: "What's on in Newcastle tonight?",
                a: "Sounded Out shows all live clubs, DJ events, and late-night venues happening in Newcastle tonight. Our map updates daily with events across the city — from techno and house to drum and bass, indie nights, and more."
              },
              {
                q: "What are the best clubs in Newcastle?",
                a: "Newcastle has a thriving club scene with venues like Digital, Riverside, World Headquarters, and more. Sounded Out maps all club nights so you can see what's actually happening tonight, not just venue listings."
              },
              {
                q: "Where can I find drum and bass events in Newcastle?",
                a: "Newcastle has regular drum and bass nights at venues across the city. Use Sounded Out to filter by genre and find DnB events happening tonight or this weekend."
              },
              {
                q: "Is Sounded Out free to use?",
                a: "Yes, Sounded Out is completely free. We're building the best way to discover nightlife in Newcastle — no account required, no paywalls, just clarity on what's happening tonight."
              },
            ].map((faq, i) => (
              <details
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                <summary style={{
                  padding: '18px 20px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#ccc',
                  listStyle: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  {faq.q}
                  <span style={{ color: '#ab67f7', fontSize: '18px' }}>+</span>
                </summary>
                <div style={{
                  padding: '0 20px 18px',
                  fontSize: '14px',
                  color: '#888',
                  lineHeight: 1.7,
                }}>
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px 100px',
          textAlign: 'center',
        }}>
          <h3 style={{
            fontSize: '28px',
            fontWeight: 700,
            marginBottom: '12px',
          }}>
            Ready to find your night?
          </h3>
          <p style={{
            fontSize: '16px',
            color: '#888',
            marginBottom: '32px',
          }}>
            {stats.tonight > 0 
              ? `${stats.tonight} events happening in Newcastle tonight`
              : 'Explore what\'s happening in Newcastle'
            }
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '18px 40px',
              background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
              borderRadius: '16px',
              color: 'white',
              textDecoration: 'none',
              fontSize: '18px',
              fontWeight: 700,
              boxShadow: '0 8px 32px rgba(171,103,247,0.4)',
            }}
          >
            Open the Map
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </section>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '40px 24px',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap',
            marginBottom: '20px',
          }}>
            <Link href="/about" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>
              About
            </Link>
            <Link href="/terms" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>
              Terms
            </Link>
            <Link href="/privacy" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>
              Privacy
            </Link>
            <a 
              href="https://instagram.com/sounded.out" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}
            >
              Instagram
            </a>
          </div>
          <p style={{ fontSize: '12px', color: '#444' }}>
            © {new Date().getFullYear()} Sounded Out. Newcastle's live nightlife map.
          </p>
        </footer>
      </div>

      {/* CSS Animations */}
      <style>{`
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
        }
        
        .orb1 {
          top: -20%;
          left: -10%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(171,103,247,0.25) 0%, rgba(171,103,247,0.08) 40%, transparent 70%);
          animation: floatOrb1 20s ease-in-out infinite;
        }
        
        .orb2 {
          top: 10%;
          right: -15%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(171,103,247,0.2) 0%, rgba(171,103,247,0.06) 40%, transparent 70%);
          animation: floatOrb2 25s ease-in-out infinite;
        }
        
        .orb3 {
          top: 60%;
          left: 20%;
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(171,103,247,0.15) 0%, rgba(171,103,247,0.04) 40%, transparent 70%);
          animation: floatOrb3 28s ease-in-out infinite;
        }
        
        .orb4 {
          bottom: -15%;
          right: 10%;
          width: 550px;
          height: 550px;
          background: radial-gradient(circle, rgba(171,103,247,0.2) 0%, rgba(171,103,247,0.06) 40%, transparent 70%);
          animation: floatOrb4 22s ease-in-out infinite;
        }
        
        @keyframes floatOrb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(60px, -80px) scale(1.15); }
          50% { transform: translate(-40px, 40px) scale(0.9); }
          75% { transform: translate(80px, 30px) scale(1.1); }
        }
        
        @keyframes floatOrb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-70px, 60px) scale(1.12); }
          66% { transform: translate(50px, -50px) scale(0.88); }
        }
        
        @keyframes floatOrb3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, 70px) scale(1.2); }
          66% { transform: translate(-80px, -40px) scale(0.85); }
        }
        
        @keyframes floatOrb4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-60px, 80px) scale(1.18); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        details summary::-webkit-details-marker {
          display: none;
        }
        
        details[open] summary span {
          transform: rotate(45deg);
        }
      `}</style>
    </div>
  )
}
