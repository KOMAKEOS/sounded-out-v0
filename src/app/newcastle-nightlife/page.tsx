'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

// ============================================================================
// NEWCASTLE NIGHTLIFE - Premium SEO Landing Page
// Design inspired by GoSounded - bold, clear, conversion-focused
// ============================================================================

type Event = {
  id: string
  start_time: string
  venue_id: string
  genres?: string
  name: string
  venue?: {
    id: string
    name: string
  }
}

type EventStats = {
  tonight: number
  tomorrow: number
  weekend: number
  totalVenues: number
}

export default function NewcastleNightlifePage() {
  const [stats, setStats] = useState<EventStats>({
    tonight: 0,
    tomorrow: 0,
    weekend: 0,
    totalVenues: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]
      
      const friday = new Date(now)
      const dayOfWeek = friday.getDay()
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7
      if (dayOfWeek < 5) friday.setDate(friday.getDate() + daysUntilFriday)
      friday.setHours(0, 0, 0, 0)
      
      const sunday = new Date(friday)
      sunday.setDate(friday.getDate() + 2)
      sunday.setHours(23, 59, 59)

      const { data: events } = await supabase
        .from('events')
        .select('*, venue:venues(*)')
        .eq('status', 'published')
        .gte('start_time', today)
        .order('start_time')

      if (events) {
        const tonightCount = events.filter((e: Event) =>
          e.start_time.startsWith(today)
        ).length

        const tomorrowCount = events.filter((e: Event) =>
          e.start_time.startsWith(tomorrowStr)
        ).length

        const weekendCount = events.filter((e: Event) => {
          const d = new Date(e.start_time)
          return d >= friday && d <= sunday
        }).length

        const uniqueVenues = new Set(events.map((e: Event) => e.venue_id))

        setStats({
          tonight: tonightCount,
          tomorrow: tomorrowCount,
          weekend: weekendCount,
          totalVenues: uniqueVenues.size,
        })
      }
      setLoading(false)
    }

    loadStats()
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0b',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      
      {/* Navigation */}
      <nav style={{
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <img src="/logo.svg" alt="Sounded Out" style={{ height: '24px' }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <Link href="/about" style={{ color: '#888', textDecoration: 'none', fontSize: '14px' }}>About</Link>
          <Link 
            href="/"
            style={{
              padding: '10px 20px',
              background: '#ab67f7',
              borderRadius: '8px',
              color: 'white',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Open Map
          </Link>
        </div>
      </nav>

      {/* HERO SECTION - Bold, immediate value prop */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '80px 24px 100px',
        textAlign: 'center',
      }}>
        {/* Eyebrow */}
        <div style={{
          display: 'inline-block',
          padding: '6px 12px',
          background: 'rgba(171,103,247,0.15)',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
          color: '#ab67f7',
          marginBottom: '24px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          Newcastle&apos;s Live Nightlife Map
        </div>

        {/* Main Headline - BOLD */}
        <h1 style={{
          fontSize: 'clamp(40px, 10vw, 72px)',
          fontWeight: 800,
          lineHeight: 1.05,
          marginBottom: '24px',
          letterSpacing: '-2px',
        }}>
          FIND WHAT&apos;S ON<br />
          <span style={{ color: '#ab67f7' }}>TONIGHT</span>
        </h1>

        {/* Subheadline */}
        <p style={{
          fontSize: 'clamp(18px, 3vw, 22px)',
          color: '#888',
          maxWidth: '500px',
          margin: '0 auto 40px',
          lineHeight: 1.5,
        }}>
          Stop scrolling Instagram. See every club, DJ event, and late-night venue in Newcastle — on one map.
        </p>

        {/* Primary CTA */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '18px 36px',
            background: '#ab67f7',
            borderRadius: '12px',
            color: 'white',
            textDecoration: 'none',
            fontSize: '18px',
            fontWeight: 700,
            marginBottom: '16px',
          }}
        >
          Explore the Map →
        </Link>

        <p style={{ fontSize: '13px', color: '#555' }}>
          Free to use. No account needed.
        </p>
      </section>

      {/* LIVE STATS BAR */}
      <section style={{
        background: 'rgba(171,103,247,0.08)',
        borderTop: '1px solid rgba(171,103,247,0.2)',
        borderBottom: '1px solid rgba(171,103,247,0.2)',
        padding: '32px 24px',
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '24px',
          textAlign: 'center',
        }}>
          {[
            { value: stats.tonight, label: 'Tonight' },
            { value: stats.tomorrow, label: 'Tomorrow' },
            { value: stats.weekend, label: 'This Weekend' },
            { value: stats.totalVenues, label: 'Venues' },
          ].map((stat) => (
            <div key={stat.label}>
              <div style={{
                fontSize: '36px',
                fontWeight: 800,
                color: '#ab67f7',
              }}>
                {loading ? '—' : stat.value}
              </div>
              <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SEE IT WORK SECTION */}
      <section style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '100px 24px',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#ab67f7',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          marginBottom: '16px',
        }}>
          See it work. Right now.
        </p>
        <h2 style={{
          fontSize: 'clamp(28px, 5vw, 40px)',
          fontWeight: 700,
          marginBottom: '16px',
        }}>
          One Map. Every Night Out.
        </h2>
        <p style={{
          fontSize: '16px',
          color: '#888',
          maxWidth: '500px',
          margin: '0 auto 40px',
        }}>
          Open the map to see what&apos;s actually happening in Newcastle — updated daily with real events.
        </p>
        
        {/* Map Preview Placeholder */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(171,103,247,0.1) 0%, rgba(20,20,22,0.8) 100%)',
          border: '1px solid rgba(171,103,247,0.2)',
          borderRadius: '16px',
          padding: '60px',
          marginBottom: '32px',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'rgba(171,103,247,0.2)',
            borderRadius: '50%',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ab67f7" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <p style={{ color: '#666', fontSize: '14px' }}>Live map with {loading ? '...' : stats.tonight + stats.tomorrow} upcoming events</p>
        </div>

        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '14px 28px',
            background: 'transparent',
            border: '2px solid #ab67f7',
            borderRadius: '10px',
            color: '#ab67f7',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: 600,
          }}
        >
          ✦ Open the Map →
        </Link>
      </section>

      {/* WITHOUT VS WITH COMPARISON */}
      <section style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '0 24px 100px',
      }}>
        <h2 style={{
          fontSize: 'clamp(24px, 5vw, 36px)',
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: '48px',
        }}>
          WITHOUT SOUNDED OUT VS WITH <span style={{ color: '#ab67f7' }}>SOUNDED OUT</span>
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {/* Without */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '32px',
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#666',
              marginBottom: '24px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Without Sounded Out
            </h3>
            {[
              'Scrolling through Instagram stories',
              'Asking mates "what\'s on?"',
              'Outdated event listings',
              'Guessing what\'s actually good',
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                fontSize: '15px',
                color: '#888',
              }}>
                <span style={{ color: '#ef4444' }}>✕</span>
                {item}
              </div>
            ))}
          </div>

          {/* With */}
          <div style={{
            background: 'rgba(171,103,247,0.08)',
            border: '1px solid rgba(171,103,247,0.3)',
            borderRadius: '16px',
            padding: '32px',
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#ab67f7',
              marginBottom: '24px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              With Sounded Out
            </h3>
            {[
              'Every event on one map',
              'Updated daily',
              'Filter by genre',
              'Know what\'s worth going to',
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                fontSize: '15px',
                color: '#ccc',
              }}>
                <span style={{ color: '#22c55e' }}>✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{
        background: 'rgba(255,255,255,0.02)',
        padding: '100px 24px',
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <p style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#ab67f7',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            How it works
          </p>
          <h2 style={{
            fontSize: 'clamp(28px, 5vw, 40px)',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '60px',
          }}>
            Three Steps to a Better Night
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '40px',
          }}>
            {[
              {
                num: '1',
                title: 'Open the Map',
                desc: 'See every event happening in Newcastle tonight, tomorrow, or this weekend.',
              },
              {
                num: '2',
                title: 'Filter by Vibe',
                desc: 'Techno, house, DnB, indie — find exactly what you\'re in the mood for.',
              },
              {
                num: '3',
                title: 'Choose with Clarity',
                desc: 'See prices, times, and SO Picks — events we think are worth going to.',
              },
            ].map((step) => (
              <div key={step.num} style={{ textAlign: 'center' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#ab67f7',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  fontSize: '20px',
                  fontWeight: 700,
                }}>
                  {step.num}
                </div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  marginBottom: '8px',
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#888',
                  lineHeight: 1.6,
                }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT IS SOUNDED OUT - SEO Content */}
      <section style={{
        maxWidth: '700px',
        margin: '0 auto',
        padding: '100px 24px',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: 'clamp(24px, 5vw, 32px)',
          fontWeight: 700,
          marginBottom: '24px',
        }}>
          What is Sounded Out?
        </h2>
        <p style={{
          fontSize: '16px',
          color: '#999',
          lineHeight: 1.8,
          marginBottom: '20px',
        }}>
          <strong style={{ color: '#fff' }}>Sounded Out is Newcastle&apos;s live nightlife map.</strong> We show what&apos;s actually happening tonight — clubs, DJ events, live music, and late-night venues — all in one place.
        </p>
        <p style={{
          fontSize: '16px',
          color: '#999',
          lineHeight: 1.8,
          marginBottom: '20px',
        }}>
          No more scrolling through Instagram stories. No more outdated listings. Just clarity on what&apos;s worth going to.
        </p>
        <p style={{
          fontSize: '14px',
          color: '#666',
          fontStyle: 'italic',
        }}>
          Built in Newcastle. Updated daily.
        </p>
      </section>

      {/* FAQ SECTION */}
      <section style={{
        maxWidth: '700px',
        margin: '0 auto',
        padding: '0 24px 100px',
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 700,
          marginBottom: '32px',
          textAlign: 'center',
        }}>
          Frequently Asked Questions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            {
              q: "What's on in Newcastle tonight?",
              a: "Sounded Out shows all live clubs, DJ events, and late-night venues happening in Newcastle tonight. Our map updates daily with events across the city — from techno and house to drum and bass and indie nights."
            },
            {
              q: "Is Sounded Out free?",
              a: "Yes, completely free. No account needed. Just open the map and find your night."
            },
            {
              q: "What are SO Picks?",
              a: "SO Picks are events we think stand out — for the music, the atmosphere, or the community. Not paid placements, just genuine recommendations."
            },
            {
              q: "How often is it updated?",
              a: "Daily. We add new events as they're announced and remove ones that have passed."
            },
          ].map((faq, i) => (
            <details
              key={i}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
              }}
            >
              <summary style={{
                padding: '18px 20px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                color: '#ccc',
                listStyle: 'none',
              }}>
                {faq.q}
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

      {/* FINAL CTA */}
      <section style={{
        background: 'linear-gradient(180deg, transparent 0%, rgba(171,103,247,0.1) 100%)',
        padding: '100px 24px',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: 'clamp(32px, 6vw, 48px)',
          fontWeight: 800,
          marginBottom: '16px',
        }}>
          STOP GUESSING.<br />
          <span style={{ color: '#ab67f7' }}>START KNOWING.</span>
        </h2>
        <p style={{
          fontSize: '16px',
          color: '#888',
          marginBottom: '32px',
        }}>
          {stats.tonight > 0 
            ? `${stats.tonight} events happening in Newcastle tonight.`
            : "See what's happening in Newcastle tonight."
          }
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '18px 36px',
            background: '#ab67f7',
            borderRadius: '12px',
            color: 'white',
            textDecoration: 'none',
            fontSize: '18px',
            fontWeight: 700,
          }}
        >
          Open the Map →
        </Link>
        <p style={{ fontSize: '13px', color: '#555', marginTop: '16px' }}>
          Free forever. No account needed.
        </p>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '40px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}>
          <Link href="/about" style={{ color: '#555', fontSize: '13px', textDecoration: 'none' }}>About</Link>
          <Link href="/terms" style={{ color: '#555', fontSize: '13px', textDecoration: 'none' }}>Terms</Link>
          <Link href="/privacy" style={{ color: '#555', fontSize: '13px', textDecoration: 'none' }}>Privacy</Link>
          <a href="https://instagram.com/sounded.out" target="_blank" rel="noopener noreferrer" style={{ color: '#555', fontSize: '13px', textDecoration: 'none' }}>Instagram</a>
        </div>
        <p style={{ fontSize: '12px', color: '#333' }}>
          © {new Date().getFullYear()} Sounded Out. Newcastle&apos;s live nightlife map.
        </p>
      </footer>

      <style>{`
        details summary::-webkit-details-marker { display: none; }
        details summary { list-style: none; }
      `}</style>
    </div>
  )
}
