'use client'

import Link from 'next/link'

// ============================================================================
// ABOUT PAGE - Sounded Out
// ============================================================================
export default function AboutPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0b',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated Background Orbs */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        {/* Purple Orb 1 - Top Left */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(171,103,247,0.3) 0%, rgba(171,103,247,0.1) 40%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'floatOrb1 22s ease-in-out infinite',
        }} />
        
        {/* Purple Orb 2 - Top Right */}
        <div style={{
          position: 'absolute',
          top: '10%',
          right: '-15%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(171,103,247,0.25) 0%, rgba(171,103,247,0.08) 40%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'floatOrb2 26s ease-in-out infinite',
        }} />
        
        {/* Purple Orb 3 - Center */}
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '30%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(171,103,247,0.2) 0%, rgba(171,103,247,0.05) 40%, transparent 70%)',
          filter: 'blur(100px)',
          animation: 'floatOrb3 30s ease-in-out infinite',
        }} />
        
        {/* Purple Orb 4 - Bottom */}
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          right: '20%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(171,103,247,0.25) 0%, rgba(171,103,247,0.1) 40%, transparent 70%)',
          filter: 'blur(70px)',
          animation: 'floatOrb4 24s ease-in-out infinite',
        }} />
        
        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          animation: 'gridDrift 20s linear infinite',
        }} />
      </div>
      
      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <header style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Link href="/">
            <img src="/logo.svg" alt="Sounded Out" style={{ height: '28px', cursor: 'pointer' }} />
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
        <main style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px 80px',
        }}>
          <div style={{
            maxWidth: '640px',
            width: '100%',
          }}>
            {/* Glass Card */}
            <div style={{
              background: 'rgba(20,20,22,0.8)',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '24px',
              padding: '48px 40px',
            }}>
              <h1 style={{
                fontSize: '32px',
                fontWeight: 800,
                marginBottom: '32px',
                background: 'linear-gradient(135deg, #ffffff 0%, #ab67f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                About Sounded Out
              </h1>
              
              <div style={{ fontSize: '16px', lineHeight: 1.8, color: '#ccc' }}>
                <p style={{ 
                  fontSize: '20px', 
                  fontWeight: 600, 
                  color: 'white',
                  marginBottom: '24px',
                }}>
                  Sounded Out helps people choose better nights out.
                </p>
                
                <p style={{ marginBottom: '20px' }}>
                  Choosing where to go shouldn't feel like guesswork.
                </p>
                
                <p style={{ marginBottom: '20px', color: '#999' }}>
                  Yet most nightlife discovery lives across Instagram stories, group chats, outdated listings, and half-truths. By the time you decide, it's often too late, sold out, or dead.
                </p>
                
                <p style={{ marginBottom: '28px', color: '#999' }}>
                  Nights fail because there's too much noise and not enough clarity.
                </p>
                
                <p style={{ marginBottom: '20px' }}>
                  Sounded Out is a live nightlife map that shows what's actually happening tonight, tomorrow, and this weekend. We surface real events with clear details — what's free, what runs late, what's happening now, and what's genuinely worth going to.
                </p>
                
                <p style={{ marginBottom: '20px' }}>
                  Some nights are better than others.
                </p>
                
                <p style={{ 
                  marginBottom: '28px',
                  padding: '16px 20px',
                  background: 'rgba(171,103,247,0.1)',
                  borderRadius: '12px',
                  borderLeft: '3px solid #ab67f7',
                }}>
                  <strong style={{ color: '#ab67f7' }}>SO Picks</strong> highlight events we believe stand out for the right reasons — music, atmosphere, and community, not who paid the most for attention.
                </p>
                
                <p style={{ marginBottom: '20px' }}>
                  Sounded Out is for people who care about their nights out. People who want clarity over hype, less scrolling, and more confidence in their choices.
                </p>
                
                <p style={{ marginBottom: '28px', color: '#999' }}>
                  We're starting in Newcastle, building this city by city, getting it right locally before expanding anywhere else.
                </p>
                
                <p style={{ 
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'white',
                }}>
                  Nights out matter. We're building Sounded Out to make them better.
                </p>
              </div>
            </div>
            
            {/* Footer Links */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
              marginTop: '32px',
              flexWrap: 'wrap',
            }}>
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
      
      {/* Keyframe Animations */}
      <style jsx global>{`
        @keyframes floatOrb1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(40px, -50px) scale(1.1);
          }
          50% {
            transform: translate(-30px, 30px) scale(0.95);
          }
          75% {
            transform: translate(50px, 20px) scale(1.05);
          }
        }
        
        @keyframes floatOrb2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-50px, 40px) scale(1.08);
          }
          66% {
            transform: translate(40px, -40px) scale(0.92);
          }
        }
        
        @keyframes floatOrb3 {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          33% {
            transform: translate(30px, 50px) scale(1.12) rotate(5deg);
          }
          66% {
            transform: translate(-60px, -30px) scale(0.88) rotate(-5deg);
          }
        }
        
        @keyframes floatOrb4 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-40px, 50px) scale(1.15);
          }
        }
        
        @keyframes gridDrift {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(60px, 60px);
          }
        }
      `}</style>
    </div>
  )
}
