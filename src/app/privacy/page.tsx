'use client'

import Link from 'next/link'

// ============================================================================
// PRIVACY POLICY PAGE - Sounded Out
// ============================================================================
export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: '100vh',
      height: '100vh',
      background: '#0a0a0b',
      color: 'white',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
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
          Privacy Policy
        </h1>
        <p style={{ color: '#888', marginBottom: '40px' }}>
          Last updated: December 2025
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
              Sounded Out ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
            </p>
            <p>
              Please read this policy carefully. By using the Service, you consent to the collection and use of information in accordance with this policy.
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              2. Information We Collect
            </h2>
            
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '12px', marginTop: '20px' }}>
              Information You Provide
            </h3>
            <p style={{ marginBottom: '12px' }}>
              When you create an account or claim a venue/event listing, we may collect:
            </p>
            <ul style={{ marginBottom: '16px', paddingLeft: '24px' }}>
              <li>Name and email address</li>
              <li>Phone number (optional)</li>
              <li>Role/relationship to venue or event</li>
              <li>Links to social media or websites for verification</li>
            </ul>
            
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '12px', marginTop: '20px' }}>
              Information Collected Automatically
            </h3>
            <p style={{ marginBottom: '12px' }}>
              When you access our Service, we may automatically collect:
            </p>
            <ul style={{ marginBottom: '16px', paddingLeft: '24px' }}>
              <li>Device information (browser type, operating system)</li>
              <li>IP address and approximate location</li>
              <li>Pages visited and features used</li>
              <li>Time and date of visits</li>
            </ul>
            
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '12px', marginTop: '20px' }}>
              Location Data
            </h3>
            <p>
              With your permission, we may access your device's location to show nearby events. You can disable location access through your browser or device settings at any time.
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              3. How We Use Your Information
            </h2>
            <p style={{ marginBottom: '12px' }}>
              We use the information we collect to:
            </p>
            <ul style={{ marginBottom: '16px', paddingLeft: '24px' }}>
              <li>Provide, maintain, and improve our Service</li>
              <li>Process venue and event claims</li>
              <li>Send you updates related to your account or claimed listings</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Analyse usage patterns to improve user experience</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              4. Sharing Your Information
            </h2>
            <p style={{ marginBottom: '12px' }}>
              We do not sell your personal information. We may share your information only in the following circumstances:
            </p>
            <ul style={{ marginBottom: '16px', paddingLeft: '24px' }}>
              <li><strong>Service Providers:</strong> With third parties who perform services on our behalf (e.g., hosting, analytics)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>With Your Consent:</strong> When you have given us permission to do so</li>
            </ul>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              5. Cookies and Tracking
            </h2>
            <p style={{ marginBottom: '12px' }}>
              We use cookies and similar technologies to:
            </p>
            <ul style={{ marginBottom: '16px', paddingLeft: '24px' }}>
              <li>Keep you signed in to your account</li>
              <li>Remember your preferences</li>
              <li>Understand how you use our Service</li>
              <li>Improve our Service based on this information</li>
            </ul>
            <p>
              You can control cookies through your browser settings. Disabling cookies may affect the functionality of certain features.
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              6. Data Security
            </h2>
            <p style={{ marginBottom: '12px' }}>
              We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction.
            </p>
            <p>
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              7. Your Rights (UK GDPR)
            </h2>
            <p style={{ marginBottom: '12px' }}>
              Under UK data protection law, you have the right to:
            </p>
            <ul style={{ marginBottom: '16px', paddingLeft: '24px' }}>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Restriction:</strong> Request restriction of processing</li>
              <li><strong>Portability:</strong> Request transfer of your data</li>
              <li><strong>Objection:</strong> Object to processing of your data</li>
            </ul>
            <p>
              To exercise any of these rights, please contact us at{' '}
              <a href="mailto:oliver@soundedout.com" style={{ color: '#ab67f7' }}>
                oliver@soundedout.com
              </a>
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              8. Data Retention
            </h2>
            <p>
              We retain your personal information for as long as necessary to provide the Service and fulfil the purposes outlined in this policy. When you delete your account, we will delete or anonymise your personal information within 30 days, unless we are required to retain it for legal purposes.
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              9. Third-Party Services
            </h2>
            <p style={{ marginBottom: '12px' }}>
              Our Service may contain links to third-party websites and integrates with third-party services including:
            </p>
            <ul style={{ marginBottom: '16px', paddingLeft: '24px' }}>
              <li>Mapbox (mapping services)</li>
              <li>Supabase (authentication and database)</li>
              <li>Third-party ticketing platforms</li>
            </ul>
            <p>
              These third parties have their own privacy policies, and we encourage you to review them.
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              10. Children's Privacy
            </h2>
            <p>
              Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              11. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              12. Contact Us
            </h2>
            <p style={{ marginBottom: '12px' }}>
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <p>
              Email:{' '}
              <a href="mailto:privacy@soundedout.com" style={{ color: '#ab67f7' }}>
                privacy@soundedout.com
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
          <Link href="/terms" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>
            Terms & Conditions
          </Link>
          <Link href="/" style={{ color: '#666', fontSize: '13px', textDecoration: 'none' }}>
            Back to Map
          </Link>
        </div>
      </main>
    </div>
  )
}
