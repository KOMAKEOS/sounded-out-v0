'use client'

import Link from 'next/link'

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

      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '48px 24px 80px',
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>Privacy Policy</h1>
        <p style={{ color: '#9ca3af', marginBottom: '40px', fontSize: '14px' }}>Last updated: February 2026</p>

        <div style={{ color: '#d1d5db', fontSize: '15px', lineHeight: '1.8' }}>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>1. Data Controller</h2>
          <p>Sounded Out is operated by Oliver Cormack as a sole trader registered in England. For the purposes of the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018, we are the data controller.</p>
          <p style={{ marginBottom: '24px' }}>Contact: <a href="mailto:oliver@soundedout.com" style={{ color: '#ab67f7' }}>oliver@soundedout.com</a></p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>2. Information We Collect</h2>
          <p><strong style={{ color: 'white' }}>Information you provide directly:</strong></p>
          <p style={{ paddingLeft: '20px' }}>
            (a) Account registration: name, email address (or Google account information if using Google Sign-In)<br/>
            (b) Venue/event claims: name, email, role/relationship to venue or event, social media links for verification<br/>
            (c) Communications: any information you include in emails or support requests
          </p>
          <p><strong style={{ color: 'white' }}>Information collected automatically:</strong></p>
          <p style={{ paddingLeft: '20px' }}>
            (a) Device and browser information (browser type, operating system, screen resolution)<br/>
            (b) IP address and approximate geographic location<br/>
            (c) Pages visited, features used, and interactions with events and venues<br/>
            (d) Date, time, and duration of visits<br/>
            (e) Referral source (how you arrived at the Service)
          </p>
          <p><strong style={{ color: 'white' }}>Location data:</strong></p>
          <p style={{ marginBottom: '24px' }}>With your explicit permission, we may access your device&apos;s location to show nearby events. Location data is processed in your browser and is not stored on our servers. You can disable location access through your browser or device settings at any time.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>3. Legal Basis for Processing (UK GDPR)</h2>
          <p>We process your personal data on the following legal bases:</p>
          <p style={{ paddingLeft: '20px' }}>
            (a) <strong style={{ color: 'white' }}>Consent</strong> (Article 6(1)(a)): For location data, cookies, and marketing communications. You may withdraw consent at any time.<br/>
            (b) <strong style={{ color: 'white' }}>Performance of a contract</strong> (Article 6(1)(b)): To provide and maintain your account and process venue/event claims.<br/>
            (c) <strong style={{ color: 'white' }}>Legitimate interests</strong> (Article 6(1)(f)): For analytics, service improvement, fraud prevention, and security. Our legitimate interest is to operate and improve the Service. We have assessed that this processing does not override your rights and freedoms.
          </p>
          <p style={{ marginBottom: '24px' }}>We do not process any special category data (e.g., health, race, political opinions, sexual orientation).</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>4. How We Use Your Information</h2>
          <p style={{ paddingLeft: '20px' }}>
            (a) To provide, maintain, and improve the Service<br/>
            (b) To process account registration and authentication<br/>
            (c) To process and verify venue and event claims<br/>
            (d) To respond to your inquiries and support requests<br/>
            (e) To analyse usage patterns and improve user experience<br/>
            (f) To detect, prevent, and address fraud, abuse, and security issues<br/>
            (g) To comply with legal obligations
          </p>
          <p style={{ marginBottom: '24px' }}>We do not use your personal data for automated decision-making or profiling that produces legal effects or similarly significant effects on you.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>5. Data Sharing</h2>
          <p><strong style={{ color: 'white' }}>We do not sell your personal information.</strong></p>
          <p>We may share your information only with:</p>
          <p style={{ paddingLeft: '20px' }}>
            (a) <strong style={{ color: 'white' }}>Service providers</strong> who process data on our behalf under written data processing agreements:<br/>
            <span style={{ paddingLeft: '20px', display: 'block' }}>
              — Supabase Inc. (database and authentication) — servers in EU<br/>
              — Vercel Inc. (website hosting) — servers in US and EU<br/>
              — Mapbox Inc. (mapping services) — servers in US<br/>
              — Resend Inc. (transactional email) — servers in EU<br/>
              — Google (OAuth authentication, if you choose Google Sign-In)
            </span>
            (b) <strong style={{ color: 'white' }}>Law enforcement or regulators</strong> when required by law, court order, or to protect our legal rights<br/>
            (c) <strong style={{ color: 'white' }}>Business transfers</strong> in connection with a merger, acquisition, or sale of assets (you will be notified of any change in data controller)<br/>
            (d) <strong style={{ color: 'white' }}>With your explicit consent</strong> in any other circumstances
          </p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>6. International Data Transfers</h2>
          <p style={{ marginBottom: '24px' }}>Some of our service providers are based in the United States. Where personal data is transferred outside the UK, we ensure appropriate safeguards are in place, including the UK International Data Transfer Agreement (IDTA) or reliance on adequacy decisions. If you would like more information about the specific safeguards, please contact us.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>7. Cookies &amp; Tracking Technologies</h2>
          <p>We use the following types of cookies:</p>
          <p style={{ paddingLeft: '20px' }}>
            (a) <strong style={{ color: 'white' }}>Strictly necessary cookies:</strong> Required for authentication and core functionality. These cannot be disabled.<br/>
            (b) <strong style={{ color: 'white' }}>Analytics cookies:</strong> Help us understand how users interact with the Service. These are used on the basis of legitimate interest for service improvement.
          </p>
          <p>We do not use advertising or tracking cookies. We do not share cookie data with advertisers.</p>
          <p style={{ marginBottom: '24px' }}>You can control cookies through your browser settings. Disabling strictly necessary cookies may prevent you from using certain features.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>8. Data Security</h2>
          <p>We implement appropriate technical and organisational measures to protect your personal data, including:</p>
          <p style={{ paddingLeft: '20px' }}>
            (a) Encryption of data in transit (TLS/HTTPS)<br/>
            (b) Server-side authentication with hashed credentials<br/>
            (c) Row Level Security on all database tables<br/>
            (d) Rate limiting on authentication endpoints<br/>
            (e) HttpOnly secure cookies for session management<br/>
            (f) Regular security reviews
          </p>
          <p style={{ marginBottom: '24px' }}>However, no method of transmission over the Internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security and accept no liability for any unauthorised access that occurs despite our reasonable security measures.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>9. Your Rights (UK GDPR)</h2>
          <p>Under UK data protection law, you have the following rights:</p>
          <p style={{ paddingLeft: '20px' }}>
            (a) <strong style={{ color: 'white' }}>Right of access:</strong> Request a copy of your personal data<br/>
            (b) <strong style={{ color: 'white' }}>Right to rectification:</strong> Request correction of inaccurate or incomplete data<br/>
            (c) <strong style={{ color: 'white' }}>Right to erasure:</strong> Request deletion of your data (&quot;right to be forgotten&quot;)<br/>
            (d) <strong style={{ color: 'white' }}>Right to restriction:</strong> Request restriction of processing in certain circumstances<br/>
            (e) <strong style={{ color: 'white' }}>Right to data portability:</strong> Request transfer of your data in a machine-readable format<br/>
            (f) <strong style={{ color: 'white' }}>Right to object:</strong> Object to processing based on legitimate interests<br/>
            (g) <strong style={{ color: 'white' }}>Right to withdraw consent:</strong> Where processing is based on consent, withdraw at any time without affecting the lawfulness of prior processing
          </p>
          <p>To exercise any of these rights, email us at <a href="mailto:oliver@soundedout.com" style={{ color: '#ab67f7' }}>oliver@soundedout.com</a>. We will respond within one month as required by law. There is no fee for exercising your rights unless requests are manifestly unfounded or excessive.</p>
          <p style={{ marginBottom: '24px' }}>If you are not satisfied with our response, you have the right to lodge a complaint with the Information Commissioner&apos;s Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{ color: '#ab67f7' }}>ico.org.uk</a> or by calling 0303 123 1113.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>10. Data Retention</h2>
          <p style={{ paddingLeft: '20px' }}>
            (a) <strong style={{ color: 'white' }}>Account data:</strong> Retained for as long as your account is active. Upon account deletion, personal data will be deleted or anonymised within 30 days.<br/>
            (b) <strong style={{ color: 'white' }}>Analytics data:</strong> Aggregated and anonymised analytics data may be retained indefinitely as it cannot be used to identify individuals.<br/>
            (c) <strong style={{ color: 'white' }}>Claim data:</strong> Retained for the duration of the claim and for 12 months after a claim is revoked or expired, for audit purposes.<br/>
            (d) <strong style={{ color: 'white' }}>Communications:</strong> Retained for up to 24 months for support quality and legal purposes.
          </p>
          <p style={{ marginBottom: '24px' }}>We may retain data for longer periods where required by law or to establish, exercise, or defend legal claims.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>11. Third-Party Services</h2>
          <p>The Service contains links to third-party websites and integrates with third-party services. When you click through to a third-party service (including ticketing platforms such as Fatsoma, Skiddle, DICE, Resident Advisor, or Eventbrite), your interaction with that service is governed by their own privacy policy. We have no control over, and accept no responsibility for, the privacy practices of third-party services.</p>
          <p style={{ marginBottom: '24px' }}>We encourage you to review the privacy policies of any third-party services you interact with through the Service.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>12. Children&apos;s Privacy</h2>
          <p style={{ marginBottom: '24px' }}>The Service is intended for users aged 18 and over. We do not knowingly collect personal data from anyone under the age of 18. If you believe we have inadvertently collected data from a minor, please contact us immediately at <a href="mailto:oliver@soundedout.com" style={{ color: '#ab67f7' }}>oliver@soundedout.com</a> and we will delete it promptly.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>13. Data Breach Notification</h2>
          <p style={{ marginBottom: '24px' }}>In the event of a personal data breach that is likely to result in a risk to your rights and freedoms, we will notify the ICO within 72 hours of becoming aware of the breach, as required by the UK GDPR. Where the breach is likely to result in a high risk to your rights and freedoms, we will also notify you directly without undue delay.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>14. Changes to This Policy</h2>
          <p style={{ marginBottom: '24px' }}>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the &quot;Last updated&quot; date. For significant changes that affect how we process your data, we will make reasonable efforts to notify you via email or through the Service. Your continued use of the Service after changes constitutes acceptance of the updated policy.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>15. Contact Us</h2>
          <p style={{ marginBottom: '40px' }}>
            If you have any questions about this Privacy Policy, your personal data, or wish to exercise your rights, please contact us at:<br/><br/>
            <strong style={{ color: 'white' }}>Email:</strong> <a href="mailto:oliver@soundedout.com" style={{ color: '#ab67f7' }}>oliver@soundedout.com</a><br/>
            <strong style={{ color: 'white' }}>Data Controller:</strong> Oliver Cormack, Sounded Out
          </p>

        </div>

        <div style={{
          display: 'flex',
          gap: '16px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: '14px',
        }}>
          <Link href="/about" style={{ color: '#9ca3af', textDecoration: 'none' }}>About</Link>
          <Link href="/terms" style={{ color: '#9ca3af', textDecoration: 'none' }}>Terms &amp; Conditions</Link>
          <Link href="/" style={{ color: '#ab67f7', textDecoration: 'none' }}>Back to Map</Link>
        </div>
      </main>
    </div>
  )
}
