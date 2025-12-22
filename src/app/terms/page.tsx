'use client'

import Link from 'next/link'

// ============================================================================
// TERMS & CONDITIONS PAGE - Sounded Out
// ============================================================================
export default function TermsPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0b',
      color: 'white',
    }}>
      {/* Header */}
      <header style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
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
      
      {/* Content */}
      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '48px 24px 80px',
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
          Terms & Conditions
        </h1>
        <p style={{ color: '#888', marginBottom: '40px' }}>
          Last updated: December 2024
        </p>
        
        <div style={{ 
          fontSize: '15px', 
          lineHeight: 1.8, 
          color: '#ccc',
        }}>
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              1. Introduction
            </h2>
            <p style={{ marginBottom: '12px' }}>
              Welcome to Sounded Out ("we", "our", "us"). These Terms and Conditions govern your use of our website and services located at soundedout.com (the "Service").
            </p>
            <p>
              By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              2. Description of Service
            </h2>
            <p style={{ marginBottom: '12px' }}>
              Sounded Out is a nightlife discovery platform that displays event information aggregated from various sources. We provide information about events, venues, times, and prices to help users discover nightlife options in their area.
            </p>
            <p>
              We do not sell tickets directly. When you click through to purchase tickets, you will be redirected to third-party ticketing platforms. Your purchase is subject to their terms and conditions.
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              3. Accuracy of Information
            </h2>
            <p style={{ marginBottom: '12px' }}>
              While we strive to provide accurate and up-to-date information, we cannot guarantee the accuracy, completeness, or reliability of any event information displayed on the Service.
            </p>
            <p style={{ marginBottom: '12px' }}>
              Event details such as times, prices, and availability are subject to change without notice. We recommend verifying event details with the venue or event organiser before making plans.
            </p>
            <p>
              We are not responsible for any losses or damages arising from your reliance on information provided through the Service.
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              4. User Accounts
            </h2>
            <p style={{ marginBottom: '12px' }}>
              Some features of the Service may require you to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
            <p>
              You agree to provide accurate, current, and complete information when creating an account and to update such information to keep it accurate, current, and complete.
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              5. Venue & Event Claims
            </h2>
            <p style={{ marginBottom: '12px' }}>
              Venue owners and event organisers may claim their listings through our Partner Portal. By claiming a listing, you represent that you have the authority to manage that venue or event.
            </p>
            <p>
              We reserve the right to verify claims and to reject or revoke access at our discretion. Misrepresentation of ownership or authority may result in account termination.
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              6. Intellectual Property
            </h2>
            <p style={{ marginBottom: '12px' }}>
              The Service and its original content, features, and functionality are owned by Sounded Out and are protected by international copyright, trademark, and other intellectual property laws.
            </p>
            <p>
              Event information, venue names, and related content may be the property of their respective owners.
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              7. Third-Party Links
            </h2>
            <p style={{ marginBottom: '12px' }}>
              The Service may contain links to third-party websites or services that are not owned or controlled by Sounded Out. This includes links to ticketing platforms, venue websites, and social media.
            </p>
            <p>
              We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites or services.
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              8. Limitation of Liability
            </h2>
            <p style={{ marginBottom: '12px' }}>
              To the maximum extent permitted by law, Sounded Out shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or other intangible losses.
            </p>
            <p>
              This includes any damages resulting from your attendance at events listed on the Service, your reliance on event information, or your transactions with third-party ticketing platforms.
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              9. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide notice prior to any new terms taking effect. Your continued use of the Service after such changes constitutes acceptance of the new Terms.
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              10. Contact Us
            </h2>
            <p>
              If you have any questions about these Terms, please contact us at{' '}
              <a href="mailto:hello@soundedout.com" style={{ color: '#ab67f7' }}>
                hello@soundedout.com
              </a>
            </p>
          </section>
        </div>
        
        {/* Footer Links */}
        <div style={{
          display: 'flex',
          gap: '24px',
          marginTop: '48px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          <Link href="/about" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>
            About
          </Link>
          <Link href="/privacy" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>
            Privacy Policy
          </Link>
          <Link href="/" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>
            Back to Map
          </Link>
        </div>
      </main>
    </div>
  )
}
