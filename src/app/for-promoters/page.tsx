import Link from 'next/link'
import PageLayout from '../../components/PageLayout'

export default function ForPromotersPage() {
  return (
    <PageLayout maxWidth="640px">
      {/* Hero */}
      <div style={{ marginBottom: '56px' }}>
        <h1 style={{ 
          fontSize: '36px', 
          fontWeight: 700, 
          color: 'white', 
          marginBottom: '16px',
          lineHeight: 1.2,
        }}>
          List your events
        </h1>
        <p style={{ 
          fontSize: '17px', 
          color: '#888', 
          lineHeight: 1.7,
          marginBottom: '24px',
        }}>
          Sounded Out shows all events in one place. Your event appears alongside everything else happening in the city, regardless of which ticket platform you use.
        </p>
        <p style={{ 
          fontSize: '15px', 
          color: '#ab67f7', 
          fontWeight: 500,
        }}>
          Listing is free. Always.
        </p>
      </div>

      {/* What you get */}
      <div style={{ marginBottom: '56px' }}>
        <h2 style={{ 
          fontSize: '13px', 
          fontWeight: 600, 
          color: '#666', 
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '20px',
        }}>
          What you get
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            'Your event on the map',
            'Appear in search results',
            'Link to your ticket page (any platform)',
            'Track views, saves, and click-throughs',
            'Brand profile page',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#ab67f7',
                marginTop: '8px',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '15px', color: '#ccc', lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ marginBottom: '56px' }}>
        <h2 style={{ 
          fontSize: '13px', 
          fontWeight: 600, 
          color: '#666', 
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '20px',
        }}>
          How it works
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            'Create an account',
            'Add your event details',
            'Your event goes live',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#141416',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 600,
                color: '#666',
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <span style={{ fontSize: '15px', color: '#ccc' }}>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Already on other platforms */}
      <div style={{ 
        padding: '20px 24px',
        background: '#141416',
        borderRadius: '12px',
        marginBottom: '56px',
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>
          Already on RA, Fixr, or Skiddle?
        </h3>
        <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6 }}>
          You don't need to move. List on Sounded Out too and link to your existing ticket page. More visibility, same process.
        </p>
      </div>

      {/* Premium features teaser */}
      <div style={{ marginBottom: '56px' }}>
        <h2 style={{ 
          fontSize: '13px', 
          fontWeight: 600, 
          color: '#666', 
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '20px',
        }}>
          Optional upgrades
        </h2>
        <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, marginBottom: '12px' }}>
          For promoters who want advanced features:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            'Featured placement',
            'Advanced analytics and demographics',
            'Verified badge',
            'Priority support',
          ].map((item, i) => (
            <span key={i} style={{ fontSize: '14px', color: '#666' }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ 
        padding: '28px',
        background: 'rgba(171,103,247,0.08)',
        border: '1px solid rgba(171,103,247,0.15)',
        borderRadius: '14px',
        textAlign: 'center',
        marginBottom: '48px',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'white', marginBottom: '6px' }}>
          Ready to list?
        </h3>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '20px' }}>
          Takes about 2 minutes
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/signup?type=promoter"
            style={{
              padding: '12px 28px',
              background: '#ab67f7',
              borderRadius: '10px',
              color: 'white',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Create account
          </Link>
          <Link
            href="/login"
            style={{
              padding: '12px 28px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#888',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Contact */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Questions?{' '}
          <a href="mailto:oliver@soundedout.com" style={{ color: '#ab67f7', textDecoration: 'none' }}>
            oliver@soundedout.com
          </a>
        </p>
      </div>
    </PageLayout>
  )
}
