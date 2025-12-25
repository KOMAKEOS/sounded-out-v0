"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"

// ============================================================================
// NEWCASTLE NIGHTLIFE - £200K Premium SEO Landing Page
// Target: "newcastle nightlife", "newcastle tonight", "what's on newcastle"
// ============================================================================

type Event = {
  id: string
  start_time: string
  venue_id: string
  genres?: string
  name: string
  is_so_pick?: boolean
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
  soPicks: number
  upcomingEvents: Event[]
}

export default function NewcastleNightlifePage() {
  const [stats, setStats] = useState<EventStats>({
    tonight: 0,
    tomorrow: 0,
    weekend: 0,
    totalVenues: 0,
    soPicks: 0,
    upcomingEvents: [],
  })
  const [loading, setLoading] = useState(true)

  // ✅ Hard override any global "overflow: hidden" that would lock scroll
  useEffect(() => {
    const html = document.documentElement
    const body = document.body

    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const prevHtmlHeight = html.style.height
    const prevBodyHeight = body.style.height
    const prevBodyPosition = body.style.position

    html.style.overflow = "auto"
    body.style.overflow = "auto"

    // If something upstream set 100vh and locks scroll, remove it.
    if (html.style.height === "100vh") html.style.height = "auto"
    if (body.style.height === "100vh") body.style.height = "auto"

    // If something upstream pinned the body, undo it.
    if (body.style.position === "fixed") body.style.position = "static"

    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      html.style.height = prevHtmlHeight
      body.style.height = prevBodyHeight
      body.style.position = prevBodyPosition
    }
  }, [])

  useEffect(() => {
    async function loadStats() {
      try {
        const now = new Date()
        const today = now.toISOString().split("T")[0]

        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split("T")[0]

        const friday = new Date(now)
        const dayOfWeek = friday.getDay()
        const daysUntilFriday = (5 - dayOfWeek + 7) % 7
        if (dayOfWeek < 5) friday.setDate(friday.getDate() + daysUntilFriday)
        friday.setHours(0, 0, 0, 0)

        const sunday = new Date(friday)
        sunday.setDate(friday.getDate() + 2)
        sunday.setHours(23, 59, 59)

        const { data: events, error } = await supabase
          .from("events")
          .select("*, venue:venues(*)")
          .eq("status", "published")
          .gte("start_time", today)
          .order("start_time")
          .limit(50)

        if (error) {
          console.error("Supabase error:", error)
        }

        if (events) {
          const tonightCount = events.filter((e: Event) => e.start_time.startsWith(today)).length
          const tomorrowCount = events.filter((e: Event) => e.start_time.startsWith(tomorrowStr)).length

          const weekendCount = events.filter((e: Event) => {
            const d = new Date(e.start_time)
            return d >= friday && d <= sunday
          }).length

          const uniqueVenues = new Set(events.map((e: Event) => e.venue_id))
          const soPicksCount = events.filter((e: Event) => e.is_so_pick).length

          setStats({
            tonight: tonightCount,
            tomorrow: tomorrowCount,
            weekend: weekendCount,
            totalVenues: uniqueVenues.size,
            soPicks: soPicksCount,
            upcomingEvents: (events.slice(0, 6) as Event[]) ?? [],
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  const getDayName = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    return days[new Date().getDay()]
  }

  return (
    <div
      style={{
        background: "#050505",
        color: "white",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        minHeight: "100dvh",
        overflowX: "hidden",
      }}
    >
      {/* ====== NAVIGATION ====== */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: "24px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(5,5,5,0.8)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <img src="/logo.svg" alt="Sounded Out" style={{ height: "32px" }} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
          <Link
            href="/about"
            style={{
              color: "rgba(255,255,255,0.5)",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 500,
              letterSpacing: "0.5px",
            }}
          >
            About
          </Link>
          <Link
            href="/"
            style={{
              padding: "14px 32px",
              background: "white",
              borderRadius: "100px",
              color: "#050505",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "0.3px",
            }}
          >
            Open Map
          </Link>
        </div>
      </nav>

      {/* ====== HERO SECTION ====== */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "140px 24px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Animated background orbs */}
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />
        <div className="hero-orb hero-orb-4" />

        {/* Grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(171,103,247,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(171,103,247,0.03) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            pointerEvents: "none",
          }}
        />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: "1000px" }}>
          {/* Live indicator */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              background: "rgba(171,103,247,0.1)",
              border: "1px solid rgba(171,103,247,0.2)",
              borderRadius: "100px",
              marginBottom: "32px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                background: "#22c55e",
                borderRadius: "50%",
                boxShadow: "0 0 12px rgba(34,197,94,0.5)",
                animation: "pulse 2s infinite",
              }}
            />
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              Live • {getDayName()}{" "}
              {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
            </span>
          </div>

          {/* Main headline - SEO H1 */}
          <h1
            style={{
              fontSize: "clamp(48px, 12vw, 120px)",
              fontWeight: 800,
              lineHeight: 0.95,
              margin: "0 0 24px 0",
              letterSpacing: "-4px",
            }}
          >
            <span style={{ display: "block", color: "white" }}>NEWCASTLE</span>
            <span style={{ display: "block", color: "white" }}>NIGHTLIFE</span>
            <span
              style={{
                display: "block",
                background: "linear-gradient(135deg, #ab67f7 0%, #e9d5ff 50%, #ab67f7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              TONIGHT
            </span>
          </h1>

          {/* Subheadline - SEO keywords */}
          <p
            style={{
              fontSize: "clamp(18px, 2.5vw, 24px)",
              color: "rgba(255,255,255,0.5)",
              maxWidth: "600px",
              margin: "0 auto 48px",
              lineHeight: 1.6,
              fontWeight: 400,
            }}
          >
            The live map of clubs, DJ events, and late-night venues in Newcastle. Updated daily. Always free.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                padding: "20px 40px",
                background: "#ab67f7",
                borderRadius: "16px",
                color: "white",
                textDecoration: "none",
                fontSize: "16px",
                fontWeight: 700,
                boxShadow: "0 0 60px rgba(171,103,247,0.4)",
                transition: "all 0.3s ease",
              }}
            >
              Explore the Map
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="#whats-on"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "20px 40px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "16px",
                color: "white",
                textDecoration: "none",
                fontSize: "16px",
                fontWeight: 600,
              }}
            >
              See What&apos;s On
            </Link>
          </div>

          {/* Trust line */}
          <p style={{ marginTop: "32px", fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>
            Free to use • No account needed • Updated daily
          </p>
        </div>

        {/* Scroll indicator */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            color: "rgba(255,255,255,0.3)",
            animation: "bounce 2s infinite",
          }}
        >
          <span style={{ fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase" }}>
            Scroll
          </span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      {/* ====== LIVE STATS SECTION ====== */}
      <section
        id="whats-on"
        style={{
          padding: "100px 24px",
          background: "linear-gradient(180deg, #050505 0%, #0a0a0f 100%)",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Section header */}
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <span
              style={{
                display: "inline-block",
                fontSize: "12px",
                fontWeight: 600,
                color: "#ab67f7",
                letterSpacing: "3px",
                textTransform: "uppercase",
                marginBottom: "16px",
              }}
            >
              What&apos;s Happening
            </span>
            <h2
              style={{
                fontSize: "clamp(32px, 5vw, 56px)",
                fontWeight: 700,
                margin: 0,
                letterSpacing: "-1px",
              }}
            >
              Newcastle Events <span style={{ color: "#ab67f7" }}>Right Now</span>
            </h2>
          </div>

          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "2px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "24px",
              overflow: "hidden",
              marginBottom: "64px",
            }}
          >
            {[
              { value: stats.tonight, label: "Events Tonight", sublabel: "Clubs & venues open now" },
              { value: stats.tomorrow, label: "Tomorrow", sublabel: "Plan ahead" },
              { value: stats.weekend, label: "This Weekend", sublabel: "Fri - Sun" },
              { value: stats.totalVenues, label: "Venues", sublabel: "Across Newcastle" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "#0a0a0f",
                  padding: "48px 32px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "clamp(48px, 8vw, 72px)",
                    fontWeight: 800,
                    color: "#ab67f7",
                    lineHeight: 1,
                    marginBottom: "8px",
                  }}
                >
                  {loading ? "—" : stat.value}
                </div>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "white", marginBottom: "4px" }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>{stat.sublabel}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ textAlign: "center" }}>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                padding: "18px 36px",
                background: "white",
                borderRadius: "12px",
                color: "#050505",
                textDecoration: "none",
                fontSize: "15px",
                fontWeight: 700,
              }}
            >
              View All Events on Map
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section style={{ padding: "120px 24px", background: "#050505" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "80px" }}>
            <span
              style={{
                display: "inline-block",
                fontSize: "12px",
                fontWeight: 600,
                color: "#ab67f7",
                letterSpacing: "3px",
                textTransform: "uppercase",
                marginBottom: "16px",
              }}
            >
              How It Works
            </span>
            <h2
              style={{
                fontSize: "clamp(32px, 5vw, 56px)",
                fontWeight: 700,
                margin: 0,
                letterSpacing: "-1px",
              }}
            >
              Find Your Night in <span style={{ color: "#ab67f7" }}>3 Steps</span>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "32px" }}>
            {[
              {
                num: "01",
                title: "Open the Map",
                desc: "See every club, DJ event, and late-night venue happening in Newcastle — tonight, tomorrow, or this weekend.",
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ab67f7" strokeWidth="1.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                ),
              },
              {
                num: "02",
                title: "Filter by Genre",
                desc: "Techno, house, drum and bass, indie — filter by what you're in the mood for. See only events that match your vibe.",
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ab67f7" strokeWidth="1.5">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                ),
              },
              {
                num: "03",
                title: "Choose with Clarity",
                desc: "See prices, times, venue details, and SO Picks — events we think are actually worth going to. No guesswork.",
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ab67f7" strokeWidth="1.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22,4 12,14.01 9,11.01" />
                  </svg>
                ),
              },
            ].map((step) => (
              <div
                key={step.num}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "24px",
                  padding: "48px 40px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "-20px",
                    right: "20px",
                    fontSize: "120px",
                    fontWeight: 800,
                    color: "rgba(171,103,247,0.05)",
                    lineHeight: 1,
                    pointerEvents: "none",
                  }}
                >
                  {step.num}
                </div>

                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ marginBottom: "24px" }}>{step.icon}</div>
                  <h3 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "12px" }}>{step.title}</h3>
                  <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, margin: 0 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== COMPARISON SECTION ====== */}
      <section style={{ padding: "120px 24px", background: "linear-gradient(180deg, #050505 0%, #0a0812 100%)" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, letterSpacing: "-1px" }}>
              The Old Way vs <span style={{ color: "#ab67f7" }}>Sounded Out</span>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "24px",
                padding: "48px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.3)",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  marginBottom: "32px",
                }}
              >
                Without Sounded Out
              </div>
              {[
                "Scrolling through Instagram stories",
                'Asking group chats "what\'s on?"',
                "Checking outdated event listings",
                "Guessing which nights are good",
                "Missing events you would have loved",
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                    marginBottom: "20px",
                    fontSize: "16px",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  <span style={{ color: "#ef4444", fontSize: "18px", marginTop: "2px" }}>✕</span>
                  {item}
                </div>
              ))}
            </div>

            <div
              style={{
                background: "linear-gradient(135deg, rgba(171,103,247,0.1) 0%, rgba(171,103,247,0.05) 100%)",
                border: "1px solid rgba(171,103,247,0.2)",
                borderRadius: "24px",
                padding: "48px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#ab67f7",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  marginBottom: "32px",
                }}
              >
                With Sounded Out
              </div>
              {[
                "Every event on one live map",
                "Updated daily with new events",
                "Filter by genre and date",
                "See SO Picks — curated recommendations",
                "Know exactly what's worth going to",
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                    marginBottom: "20px",
                    fontSize: "16px",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  <span style={{ color: "#22c55e", fontSize: "18px", marginTop: "2px" }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ====== WHAT IS SOUNDED OUT - SEO SECTION ====== */}
      <section style={{ padding: "120px 24px", background: "#050505" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <span
            style={{
              display: "inline-block",
              fontSize: "12px",
              fontWeight: 600,
              color: "#ab67f7",
              letterSpacing: "3px",
              textTransform: "uppercase",
              marginBottom: "16px",
            }}
          >
            About
          </span>
          <h2
            style={{
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 700,
              marginBottom: "32px",
              letterSpacing: "-1px",
            }}
          >
            What is Sounded Out?
          </h2>
          <div style={{ fontSize: "18px", color: "rgba(255,255,255,0.6)", lineHeight: 1.8, textAlign: "left" }}>
            <p style={{ marginBottom: "24px" }}>
              <strong style={{ color: "white" }}>Sounded Out is Newcastle&apos;s live nightlife map.</strong> We show what&apos;s
              actually happening tonight — clubs, DJ events, live music, and late-night venues — all in one place, updated daily.
            </p>
            <p style={{ marginBottom: "24px" }}>
              No more scrolling through Instagram stories. No more asking &quot;what&apos;s on?&quot; in group chats. No more
              outdated listings. Just clarity on every event in Newcastle, with prices, times, and honest recommendations.
            </p>
            <p style={{ marginBottom: "24px" }}>
              <strong style={{ color: "white" }}>SO Picks</strong> are events we think stand out — for the music, the atmosphere,
              or the community. Not paid placements. Just events we genuinely think are worth your time.
            </p>
            <p style={{ color: "rgba(255,255,255,0.4)" }}>
              Built in Newcastle. Used by thousands planning nights out across the city. Completely free, forever.
            </p>
          </div>
        </div>
      </section>

      {/* ====== FAQ SECTION ====== */}
      <section style={{ padding: "120px 24px", background: "#0a0a0f" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <span
              style={{
                display: "inline-block",
                fontSize: "12px",
                fontWeight: 600,
                color: "#ab67f7",
                letterSpacing: "3px",
                textTransform: "uppercase",
                marginBottom: "16px",
              }}
            >
              FAQ
            </span>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 700, letterSpacing: "-1px" }}>
              Frequently Asked Questions
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              {
                q: "What's on in Newcastle tonight?",
                a: "Sounded Out shows all live clubs, DJ events, and late-night venues happening in Newcastle tonight. Our map updates daily with events across the city — from techno and house to drum and bass, indie nights, and more. Open the map to see everything happening right now.",
              },
              {
                q: "What are the best clubs in Newcastle?",
                a: "Newcastle has a thriving club scene with venues like Digital, Riverside, World Headquarters, NX Newcastle, and more. Sounded Out maps all club nights so you can see what's actually happening tonight — not just venue listings.",
              },
              {
                q: "Is Sounded Out free to use?",
                a: "Yes, completely free. No account needed, no paywalls, no hidden fees. Just open the map and find your night. We believe everyone deserves clarity when planning a night out.",
              },
              {
                q: "What are SO Picks?",
                a: "SO Picks are events we think stand out — for the music, the atmosphere, or the community. These aren't paid placements. They're genuine recommendations from people who know Newcastle nightlife.",
              },
              {
                q: "How often is the map updated?",
                a: "Daily. We add new events as they're announced and remove events that have passed. Our goal is to show you exactly what's happening in Newcastle — nothing out of date, nothing missing.",
              },
              {
                q: "Where can I find drum and bass events in Newcastle?",
                a: "Newcastle has regular drum and bass nights at venues across the city. Use Sounded Out to filter by the DnB genre and find events happening tonight or this weekend. Popular venues for DnB include Digital and various club nights around the Ouseburn area.",
              },
            ].map((faq, i) => (
              <details
                key={i}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "16px",
                  overflow: "hidden",
                }}
              >
                <summary
                  style={{
                    padding: "24px 28px",
                    fontSize: "17px",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "white",
                    listStyle: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {faq.q}
                  <span style={{ color: "#ab67f7", fontSize: "24px", fontWeight: 300 }}>+</span>
                </summary>
                <div style={{ padding: "0 28px 24px", fontSize: "15px", color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FINAL CTA ====== */}
      <section
        style={{
          padding: "160px 24px",
          background: "linear-gradient(180deg, #0a0a0f 0%, #050505 50%, #0a0812 100%)",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "800px",
            height: "800px",
            background: "radial-gradient(circle, rgba(171,103,247,0.15) 0%, transparent 60%)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "800px", margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "clamp(40px, 8vw, 80px)",
              fontWeight: 800,
              lineHeight: 1,
              marginBottom: "24px",
              letterSpacing: "-3px",
            }}
          >
            STOP SCROLLING.
            <br />
            <span style={{ color: "#ab67f7" }}>START KNOWING.</span>
          </h2>
          <p style={{ fontSize: "20px", color: "rgba(255,255,255,0.5)", marginBottom: "48px" }}>
            {stats.tonight > 0 ? `${stats.tonight} events happening in Newcastle tonight.` : "See what's happening in Newcastle tonight."}
          </p>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              padding: "24px 48px",
              background: "#ab67f7",
              borderRadius: "16px",
              color: "white",
              textDecoration: "none",
              fontSize: "18px",
              fontWeight: 700,
              boxShadow: "0 0 80px rgba(171,103,247,0.5)",
            }}
          >
            Open the Map
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <p style={{ marginTop: "24px", fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>Free forever. No account needed.</p>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer style={{ padding: "60px 24px", background: "#050505", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "24px",
          }}
        >
          <div>
            <img src="/logo.svg" alt="Sounded Out" style={{ height: "20px", marginBottom: "12px", opacity: 0.5 }} />
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>Newcastle&apos;s live nightlife map</p>
          </div>
          <div style={{ display: "flex", gap: "32px" }}>
            <Link href="/about" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: "13px" }}>
              About
            </Link>
            <Link href="/terms" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: "13px" }}>
              Terms
            </Link>
            <Link href="/privacy" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: "13px" }}>
              Privacy
            </Link>
            <a
              href="https://instagram.com/sounded.out"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: "13px" }}
            >
              Instagram
            </a>
          </div>
        </div>
        <div
          style={{
            maxWidth: "1200px",
            margin: "40px auto 0",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)" }}>© {new Date().getFullYear()} Sounded Out. All rights reserved.</p>
        </div>
      </footer>

      {/* Animations */}
      <style>{`
        html, body { scroll-behavior: smooth; }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }

        .hero-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .hero-orb-1 {
          top: 5%;
          left: 50%;
          transform: translateX(-50%);
          width: 900px;
          height: 900px;
          background: radial-gradient(circle, rgba(171,103,247,0.25) 0%, transparent 60%);
          animation: floatOrb1 15s ease-in-out infinite;
        }
        .hero-orb-2 {
          top: 20%;
          right: -15%;
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, rgba(147,51,234,0.2) 0%, transparent 60%);
          animation: floatOrb2 20s ease-in-out infinite;
        }
        .hero-orb-3 {
          bottom: 10%;
          left: -10%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(192,132,252,0.15) 0%, transparent 60%);
          animation: floatOrb3 18s ease-in-out infinite;
        }
        .hero-orb-4 {
          top: 40%;
          left: 20%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(171,103,247,0.2) 0%, transparent 60%);
          animation: floatOrb4 12s ease-in-out infinite;
        }

        @keyframes floatOrb1 {
          0%, 100% { transform: translateX(-50%) translateY(0) scale(1); }
          33% { transform: translateX(-45%) translateY(-30px) scale(1.05); }
          66% { transform: translateX(-55%) translateY(20px) scale(0.95); }
        }
        @keyframes floatOrb2 {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.8; }
          50% { transform: translateY(-50px) scale(1.1); opacity: 1; }
        }
        @keyframes floatOrb3 {
          0%, 100% { transform: translateX(0) scale(1); }
          50% { transform: translateX(40px) scale(1.08); }
        }
        @keyframes floatOrb4 {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }

        details summary::-webkit-details-marker { display: none; }
        details summary { list-style: none; }
        details[open] summary span:last-child { transform: rotate(45deg); }

        @media (max-width: 768px) {
          section > div > div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          section > div > div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
          section > div > div[style*="grid-template-columns: repeat(2"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
