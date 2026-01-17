'use client'

import Link from 'next/link'

// ============================================================================
// ABOUT PAGE - Sounded Out
// ============================================================================
export default function AboutPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        height: '100vh',
        background: '#0a0a0b',
        color: 'white',
        position: 'relative',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Animated Background Orbs */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {/* Purple Orb 1 - Top Left */}
        <div className="orb orb1" />

        {/* Purple Orb 2 - Top Right */}
        <div className="orb orb2" />

        {/* Purple Orb 3 - Center */}
        <div className="orb orb3" />

        {/* Purple Orb 4 - Bottom */}
        <div className="orb orb4" />
      </div>

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Link href="/">
            <img
              src="/logo.svg"
              alt="Sounded Out"
              style={{ height: '28px', cursor: 'pointer' }}
            />
          </Link>
          <Link
            href="/"
            style={{
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: 'white',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Open Map
          </Link>
        </header>

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px 100px',
          }}
        >
          <div
            style={{
              maxWidth: '640px',
              width: '100%',
            }}
          >
            {/* Glass Card */}
            <div
              style={{
                background: 'rgba(20,20,22,0.85)',
                backdropFilter: 'blur(40px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '24px',
                padding: '48px 40px',
              }}
            >
              <h1
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  marginBottom: '10px',
                  background: 'linear-gradient(135deg, #ffffff 0%, #ab67f7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                About Sounded Out
              </h1>

              {/* NEW: Movement lockup */}
              <p
                style={{
                  marginBottom: '28px',
                  color: '#bdbdbd',
                  fontSize: '14px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Make the city yours. <span style={{ color: '#ab67f7' }}>Fill rooms. Fuel cities.</span>
              </p>

              <div style={{ fontSize: '16px', lineHeight: 1.8, color: '#ccc' }}>
                {/* NEW: Strong opener */}
                <p
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'white',
                    marginBottom: '24px',
                  }}
                >
                  Sounded Out is building the discovery layer for nightlife — so anyone can find what’s happening
                  after dark, and the places that keep cities alive can thrive.
                </p>

                <p style={{ marginBottom: '20px' }}>
                  A city isn’t a list of places. It’s what happens inside them.
                </p>

                <p style={{ marginBottom: '20px', color: '#999' }}>
                  But right now, too much of a city is hidden. Discovery is fragmented across Instagram stories, group
                  chats, ticketing sites, and outdated listings — which means people default to the same few spots
                  while great venues and independent events sit invisible.
                </p>

                <p style={{ marginBottom: '20px', color: '#999' }}>
                  When discovery breaks, rooms stay empty and nights get missed.
                </p>

                <p style={{ marginBottom: '20px' }}>
                  Sounded Out fixes that with clarity and trust. Open the map and instantly explore tonight, tomorrow,
                  or the weekend. Filter by vibe, genre, and price. Get the details that matter. Decide fast. Show up.
                </p>

                <p style={{ marginBottom: '20px' }}>
                  This isn’t just about better nights out — it’s about stronger local scenes, small businesses with
                  more traffic, and tourism that actually connects people to the real city.
                </p>

                {/* SO Picks stays, but tightened + aligned */}
                <p
                  style={{
                    marginBottom: '28px',
                    padding: '16px 20px',
                    background: 'rgba(171,103,247,0.1)',
                    borderRadius: '12px',
                    borderLeft: '3px solid #ab67f7',
                  }}
                >
                  <strong style={{ color: '#ab67f7' }}>SO Picks</strong> highlight nights we believe stand out for the
                  right reasons — music, atmosphere, and community — never just who paid the most for attention.
                </p>

                <p style={{ marginBottom: '20px' }}>
                  We believe discovery shouldn’t require connections. You shouldn’t have to be “in the loop” to find
                  what’s on. Great nights deserve to be found — and the venues behind them deserve full rooms.
                </p>

                <p style={{ marginBottom: '28px', color: '#999' }}>
                  We’re starting in Newcastle and expanding city by city — earning density and trust locally before we
                  scale globally.
                </p>

                {/* NEW: Close with the lockup */}
                <p
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'white',
                    marginBottom: '6px',
                  }}
                >
                  Make the city yours.
                </p>
                <p
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'white',
                  }}
                >
                  Fill rooms. Fuel cities.
                </p>
              </div>
            </div>

            {/* Footer Links */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '24px',
                marginTop: '32px',
                flexWrap: 'wrap',
              }}
            >
              <Link href="/terms" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>
                Terms & Conditions
              </Link>
              <Link href="/privacy" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>
                Privacy Policy
              </Link>
              <a
                href="https://instagram.com/soundedout"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}
              >
                Instagram
              </a>
            </div>
          </div>
        </main>
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
          background: radial-gradient(circle, rgba(171,103,247,0.35) 0%, rgba(171,103,247,0.1) 40%, transparent 70%);
          animation: floatOrb1 20s ease-in-out infinite;
        }
        
        .orb2 {
          top: 10%;
          right: -15%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(171,103,247,0.3) 0%, rgba(171,103,247,0.08) 40%, transparent 70%);
          animation: floatOrb2 25s ease-in-out infinite;
        }
        
        .orb3 {
          top: 50%;
          left: 20%;
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(171,103,247,0.25) 0%, rgba(171,103,247,0.05) 40%, transparent 70%);
          animation: floatOrb3 28s ease-in-out infinite;
        }
        
        .orb4 {
          bottom: -15%;
          right: 10%;
          width: 550px;
          height: 550px;
          background: radial-gradient(circle, rgba(171,103,247,0.3) 0%, rgba(171,103,247,0.1) 40%, transparent 70%);
          animation: floatOrb4 22s ease-in-out infinite;
        }
        
        @keyframes floatOrb1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(60px, -80px) scale(1.15);
          }
          50% {
            transform: translate(-40px, 40px) scale(0.9);
          }
          75% {
            transform: translate(80px, 30px) scale(1.1);
          }
        }
        
        @keyframes floatOrb2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-70px, 60px) scale(1.12);
          }
          66% {
            transform: translate(50px, -50px) scale(0.88);
          }
        }
        
        @keyframes floatOrb3 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(50px, 70px) scale(1.2);
          }
          66% {
            transform: translate(-80px, -40px) scale(0.85);
          }
        }
        
        @keyframes floatOrb4 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-60px, 80px) scale(1.18);
          }
        }
      `}</style>
    </div>
  )
}
